import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { VendorsRepository } from '../repositories/vendors.repository';
import { CreateVendorDto } from '../dto/create-vendor.dto';
import { UpdateVendorPerformanceDto, UpdateVendorStatusDto } from '../dto/update-vendor-performance.dto';

@Injectable()
export class VendorsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly vendorsRepo: VendorsRepository,
  ) {}

  async create(organisationId: string, dto: CreateVendorDto) {
    return this.db.withTenant(organisationId, (trx) =>
      this.vendorsRepo.create(trx, {
        organisation_id: organisationId,
        company_name: dto.companyName,
        contact_name: dto.contactName ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        specialty: dto.specialty ?? null,
        sla_response_hours: dto.slaResponseHours ?? null,
        status: 'pending',
      }),
    );
  }

  async get(organisationId: string, vendorId: string) {
    const vendor = await this.db.withTenant(organisationId, (trx) => this.vendorsRepo.findById(trx, organisationId, vendorId));
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    return vendor;
  }

  async list(organisationId: string) {
    return this.db.withTenant(organisationId, (trx) => this.vendorsRepo.listForOrganisation(trx, organisationId));
  }

  async updatePerformanceScore(organisationId: string, vendorId: string, dto: UpdateVendorPerformanceDto) {
    await this.get(organisationId, vendorId);
    return this.db.withTenant(organisationId, (trx) =>
      this.vendorsRepo.update(trx, organisationId, vendorId, { performance_score: dto.performanceScore }),
    );
  }

  async updateStatus(organisationId: string, vendorId: string, dto: UpdateVendorStatusDto) {
    await this.get(organisationId, vendorId);
    return this.db.withTenant(organisationId, (trx) =>
      this.vendorsRepo.update(trx, organisationId, vendorId, {
        status: dto.status,
        onboarded_at: dto.status === 'active' ? new Date() : undefined,
      }),
    );
  }
}
