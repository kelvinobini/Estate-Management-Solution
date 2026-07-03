import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { VisitorsRepository } from '../repositories/visitors.repository';
import { CreateVisitorDto } from '../dto/create-visitor.dto';
import { BlacklistVisitorDto } from '../dto/blacklist-visitor.dto';

@Injectable()
export class VisitorsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly visitorsRepo: VisitorsRepository,
  ) {}

  async create(organisationId: string, dto: CreateVisitorDto) {
    return this.db.withTenant(organisationId, (trx) =>
      this.visitorsRepo.create(trx, {
        organisation_id: organisationId,
        host_tenant_id: dto.hostTenantId ?? null,
        unit_id: dto.unitId ?? null,
        full_name: dto.fullName,
        phone: dto.phone ?? null,
        vehicle_id: dto.vehicleId ?? null,
      }),
    );
  }

  async get(organisationId: string, visitorId: string) {
    const visitor = await this.db.withTenant(organisationId, (trx) => this.visitorsRepo.findById(trx, organisationId, visitorId));
    if (!visitor) {
      throw new NotFoundException('Visitor not found');
    }
    return visitor;
  }

  async listForHostTenant(organisationId: string, hostTenantId: string) {
    return this.db.withTenant(organisationId, (trx) => this.visitorsRepo.listForHostTenant(trx, organisationId, hostTenantId));
  }

  /** Org-wide, paginated listing for staff-facing screens (e.g. the front-desk visitor register). */
  async listForOrganisation(organisationId: string, options: { page: number; pageSize: number }) {
    const pageSize = Math.min(Math.max(options.pageSize, 1), 100);
    const page = Math.max(options.page, 1);
    const { rows, total } = await this.db.withTenant(organisationId, (trx) =>
      this.visitorsRepo.listForOrganisation(trx, organisationId, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    );
    return { rows, total, page, pageSize };
  }

  async blacklist(organisationId: string, visitorId: string, dto: BlacklistVisitorDto) {
    await this.get(organisationId, visitorId);
    return this.db.withTenant(organisationId, (trx) =>
      this.visitorsRepo.update(trx, organisationId, visitorId, { is_blacklisted: true, blacklist_reason: dto.reason }),
    );
  }

  async unblacklist(organisationId: string, visitorId: string) {
    await this.get(organisationId, visitorId);
    return this.db.withTenant(organisationId, (trx) =>
      this.visitorsRepo.update(trx, organisationId, visitorId, { is_blacklisted: false, blacklist_reason: null }),
    );
  }
}
