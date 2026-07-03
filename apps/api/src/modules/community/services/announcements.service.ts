import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { AnnouncementsRepository } from '../repositories/announcements.repository';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly announcementsRepo: AnnouncementsRepository,
  ) {}

  async create(organisationId: string, createdByUserId: string, dto: CreateAnnouncementDto) {
    return this.db.withTenant(organisationId, (trx) =>
      this.announcementsRepo.create(trx, {
        organisation_id: organisationId,
        property_id: dto.propertyId ?? null,
        title: dto.title,
        body: dto.body,
        channels: dto.channels ?? ['in_app'],
        created_by_user_id: createdByUserId,
      }),
    );
  }

  async get(organisationId: string, announcementId: string) {
    const announcement = await this.db.withTenant(organisationId, (trx) => this.announcementsRepo.findById(trx, organisationId, announcementId));
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }
    return announcement;
  }

  async listForProperty(organisationId: string, propertyId: string) {
    return this.db.withTenant(organisationId, (trx) => this.announcementsRepo.listForProperty(trx, organisationId, propertyId));
  }

  /** Org-wide listing for the staff communications register. */
  async listForOrganisation(organisationId: string, options: { page: number; pageSize: number }) {
    const pageSize = Math.min(Math.max(options.pageSize, 1), 100);
    const page = Math.max(options.page, 1);
    const { rows, total } = await this.db.withTenant(organisationId, (trx) =>
      this.announcementsRepo.listForOrganisation(trx, organisationId, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    );
    return { rows, total, page, pageSize };
  }

  /**
   * Marks the announcement published. Actual dispatch over email/SMS/push is
   * the Integrations layer (Twilio/SendGrid/FCM — see docs/01-architecture.md
   * section 11), not implemented yet; this is the hook point for it.
   */
  async publish(organisationId: string, announcementId: string) {
    const announcement = await this.get(organisationId, announcementId);
    if (announcement.published_at) {
      throw new BadRequestException('Announcement has already been published');
    }
    return this.db.withTenant(organisationId, (trx) =>
      this.announcementsRepo.update(trx, organisationId, announcementId, { published_at: new Date() }),
    );
  }
}
