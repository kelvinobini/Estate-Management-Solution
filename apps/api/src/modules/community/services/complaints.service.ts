import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { ComplaintsRepository } from '../repositories/complaints.repository';
import { CreateComplaintDto } from '../dto/create-complaint.dto';
import { UpdateComplaintStatusDto } from '../dto/update-complaint-status.dto';

/** SLA response window per category, in hours; falls back to DEFAULT_SLA_HOURS for anything not listed. */
const CATEGORY_SLA_HOURS: Record<string, number> = {
  security: 4,
  maintenance: 24,
  noise: 24,
  billing: 48,
};
const DEFAULT_SLA_HOURS = 72;

@Injectable()
export class ComplaintsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly complaintsRepo: ComplaintsRepository,
  ) {}

  async create(organisationId: string, tenantId: string, dto: CreateComplaintDto) {
    const slaHours = CATEGORY_SLA_HOURS[dto.category] ?? DEFAULT_SLA_HOURS;
    const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    return this.db.withTenant(organisationId, (trx) =>
      this.complaintsRepo.create(trx, {
        organisation_id: organisationId,
        tenant_id: tenantId,
        property_id: dto.propertyId ?? null,
        category: dto.category,
        description: dto.description,
        sla_due_at: slaDueAt,
      }),
    );
  }

  async get(organisationId: string, complaintId: string) {
    const complaint = await this.db.withTenant(organisationId, (trx) => this.complaintsRepo.findById(trx, organisationId, complaintId));
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }
    return complaint;
  }

  async listForTenant(organisationId: string, tenantId: string) {
    return this.db.withTenant(organisationId, (trx) => this.complaintsRepo.listForTenant(trx, organisationId, tenantId));
  }

  /** Org-wide, optionally status-filtered listing for the staff triage register. */
  async listForOrganisation(
    organisationId: string,
    status: string | undefined,
    options: { page: number; pageSize: number },
  ) {
    const pageSize = Math.min(Math.max(options.pageSize, 1), 100);
    const page = Math.max(options.page, 1);
    const { rows, total } = await this.db.withTenant(organisationId, (trx) =>
      this.complaintsRepo.listForOrganisation(trx, organisationId, status, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    );
    return { rows, total, page, pageSize };
  }

  async listOverdue(organisationId: string) {
    return this.db.withTenant(organisationId, (trx) => this.complaintsRepo.listOverdue(trx, organisationId, new Date()));
  }

  async updateStatus(organisationId: string, complaintId: string, dto: UpdateComplaintStatusDto) {
    await this.get(organisationId, complaintId);
    return this.db.withTenant(organisationId, (trx) =>
      this.complaintsRepo.update(trx, organisationId, complaintId, {
        status: dto.status,
        resolved_at: dto.status === 'resolved' ? new Date() : undefined,
      }),
    );
  }
}
