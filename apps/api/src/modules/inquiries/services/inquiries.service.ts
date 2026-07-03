import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { TenantDatabaseService } from '../../../database/database.service';
import { UsersRepository } from '../../users/repositories/users.repository';
import { EmailService } from '../../../integrations/email/email.service';
import { InquiriesRepository } from '../repositories/inquiries.repository';
import { CreateInquiryDto } from '../dto/create-inquiry.dto';
import { UpdateInquiryStatusDto } from '../dto/update-inquiry-status.dto';
import { INQUIRIES_REDIS_CLIENT } from '../inquiries.tokens';

/** Generous but real caps — this is an unauthenticated public endpoint, so it's a spam/flood target. Mirrors AuthService's login rate-limit shape. */
const IP_MAX_SUBMISSIONS = 5;
const IP_WINDOW_SECONDS = 60 * 60;
const EMAIL_MAX_SUBMISSIONS = 3;
const EMAIL_WINDOW_SECONDS = 24 * 60 * 60;

@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);

  constructor(
    private readonly db: TenantDatabaseService,
    private readonly inquiriesRepo: InquiriesRepository,
    private readonly usersRepo: UsersRepository,
    private readonly emailService: EmailService,
    @Inject(INQUIRIES_REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Public, unauthenticated submission from the landing page. Never creates a
   * login — just a row for staff to triage and, if legitimate, manually
   * convert into a real tenant + portal access via the existing staff-mediated
   * flow (TenantsService.grantPortalAccess). Pre-tenant-context, same as
   * AuthService.login, so this goes through `runAsService` (BYPASSRLS).
   */
  async submit(dto: CreateInquiryDto, requestIp: string): Promise<void> {
    await this.assertNotLocked(`inquiry_ip:${requestIp}`, IP_MAX_SUBMISSIONS);
    await this.assertNotLocked(`inquiry_email:${dto.email.toLowerCase()}`, EMAIL_MAX_SUBMISSIONS);

    const organisation = await this.db.runAsService(async (trx) => {
      const organisation = await this.inquiriesRepo.findOrganisationBySlug(trx, dto.organisationSlug);
      if (!organisation) {
        throw new BadRequestException('Unknown organisation');
      }

      await this.inquiriesRepo.create(trx, {
        organisation_id: organisation.id,
        full_name: dto.fullName,
        email: dto.email,
        phone: dto.phone ?? null,
        message: dto.message ?? null,
      });

      // Notify both roles that hold inquiry.read — an org might have PropertyManagers
      // handling day-to-day leasing without an OrgAdmin who logs in often, and vice versa.
      const [orgAdminEmails, propertyManagerEmails] = await Promise.all([
        this.usersRepo.listActiveEmailsByRole(trx, organisation.id, 'OrgAdmin'),
        this.usersRepo.listActiveEmailsByRole(trx, organisation.id, 'PropertyManager'),
      ]);
      const staffEmails = [...new Set([...orgAdminEmails, ...propertyManagerEmails])];
      return { ...organisation, staffEmails };
    });

    await this.recordAttempt(`inquiry_ip:${requestIp}`, IP_WINDOW_SECONDS);
    await this.recordAttempt(`inquiry_email:${dto.email.toLowerCase()}`, EMAIL_WINDOW_SECONDS);

    // Notification delivery is best-effort — a full mailbox or an SMTP
    // outage shouldn't turn into a 500 for a visitor who already got their
    // request recorded successfully.
    await this.notify(organisation, dto).catch((err) =>
      this.logger.error(`Failed to queue inquiry notification emails: ${err instanceof Error ? err.message : err}`),
    );
  }

  private async notify(organisation: { name: string; staffEmails: string[] }, dto: CreateInquiryDto): Promise<void> {
    const detailLines = [
      `Name: ${dto.fullName}`,
      `Email: ${dto.email}`,
      dto.phone ? `Phone: ${dto.phone}` : null,
      dto.message ? `Message: ${dto.message}` : null,
    ].filter((line): line is string => line !== null);

    await Promise.all(
      organisation.staffEmails.map((staffEmail) =>
        this.emailService.send({
          to: staffEmail,
          subject: `New access request — ${dto.fullName}`,
          text: `A new access request came in via the ${organisation.name} landing page.\n\n${detailLines.join('\n')}\n\nReview it in the dashboard under Access requests.`,
        }),
      ),
    );

    await this.emailService.send({
      to: dto.email,
      subject: `We received your request — ${organisation.name}`,
      text: `Hi ${dto.fullName.split(' ')[0]},\n\nThanks for reaching out to ${organisation.name}. Your request has been received and the estate office will get back to you shortly.\n\n— ${organisation.name}`,
    });
  }

  /** Org-wide, optionally status-filtered listing for staff triage. */
  async listForOrganisation(organisationId: string, status: string | undefined, options: { page: number; pageSize: number }) {
    const pageSize = Math.min(Math.max(options.pageSize, 1), 100);
    const page = Math.max(options.page, 1);
    const { rows, total } = await this.db.withTenant(organisationId, (trx) =>
      this.inquiriesRepo.listForOrganisation(trx, organisationId, status, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    );
    return { rows, total, page, pageSize };
  }

  async updateStatus(organisationId: string, inquiryId: string, dto: UpdateInquiryStatusDto) {
    return this.db.withTenant(organisationId, (trx) => this.inquiriesRepo.update(trx, organisationId, inquiryId, { status: dto.status }));
  }

  private async assertNotLocked(key: string, maxAttempts: number): Promise<void> {
    const attempts = await this.redis.get(key);
    if (attempts && Number(attempts) >= maxAttempts) {
      const ttl = await this.redis.ttl(key);
      throw new HttpException(`Too many requests. Try again in ${Math.max(1, Math.ceil(ttl / 60))} minute(s).`, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async recordAttempt(key: string, windowSeconds: number): Promise<void> {
    const attempts = await this.redis.incr(key);
    if (attempts === 1) {
      await this.redis.expire(key, windowSeconds);
    }
  }
}
