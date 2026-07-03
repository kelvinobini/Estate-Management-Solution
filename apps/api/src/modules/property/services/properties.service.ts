import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { PropertiesRepository } from '../repositories/properties.repository';
import { UsersRepository } from '../../users/repositories/users.repository';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { CreateValuationDto } from '../dto/create-valuation.dto';

@Injectable()
export class PropertiesService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly propertiesRepo: PropertiesRepository,
    private readonly usersRepo: UsersRepository,
  ) {}

  async create(organisationId: string, dto: CreatePropertyDto) {
    return this.db.withTenant(organisationId, (trx) =>
      this.propertiesRepo.create(trx, {
        organisation_id: organisationId,
        name: dto.name,
        property_type: dto.propertyType,
        address_line1: dto.addressLine1,
        address_line2: dto.addressLine2 ?? null,
        city: dto.city,
        state: dto.state,
        country_code: dto.countryCode ?? 'NG',
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        total_land_area_sqm: dto.totalLandAreaSqm ?? null,
        year_built: dto.yearBuilt ?? null,
      }),
    );
  }

  async get(organisationId: string, propertyId: string) {
    const property = await this.db.withTenant(organisationId, (trx) =>
      this.propertiesRepo.findById(trx, organisationId, propertyId),
    );
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  async list(organisationId: string) {
    return this.db.withTenant(organisationId, (trx) => this.propertiesRepo.listForOrganisation(trx, organisationId));
  }

  /** A Landlord-role caller's own portfolio. */
  async listOwned(organisationId: string, userId: string) {
    return this.db.withTenant(organisationId, (trx) => this.propertiesRepo.listOwnedByUser(trx, organisationId, userId));
  }

  async resolveOwnedPropertyIds(organisationId: string, userId: string): Promise<string[]> {
    return this.db.withTenant(organisationId, (trx) => this.propertiesRepo.listOwnedPropertyIds(trx, userId));
  }

  async isOwner(organisationId: string, propertyId: string, userId: string): Promise<boolean> {
    return this.db.withTenant(organisationId, (trx) => this.propertiesRepo.isOwner(trx, propertyId, userId));
  }

  /** Links a property to a landlord's portal login — see PropertiesController for the permission gate. */
  async assignOwner(organisationId: string, propertyId: string, userId: string): Promise<void> {
    await this.get(organisationId, propertyId);
    await this.db.withTenant(organisationId, async (trx) => {
      const user = await this.usersRepo.findById(trx, organisationId, userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      await this.propertiesRepo.addOwner(trx, propertyId, userId);
    });
  }

  async listOwners(organisationId: string, propertyId: string) {
    await this.get(organisationId, propertyId);
    return this.db.withTenant(organisationId, (trx) => this.propertiesRepo.listOwners(trx, propertyId));
  }

  async update(organisationId: string, propertyId: string, dto: UpdatePropertyDto) {
    await this.get(organisationId, propertyId);
    return this.db.withTenant(organisationId, (trx) =>
      this.propertiesRepo.update(trx, organisationId, propertyId, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.propertyType !== undefined && { property_type: dto.propertyType }),
        ...(dto.addressLine1 !== undefined && { address_line1: dto.addressLine1 }),
        ...(dto.addressLine2 !== undefined && { address_line2: dto.addressLine2 }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.totalLandAreaSqm !== undefined && { total_land_area_sqm: dto.totalLandAreaSqm }),
        ...(dto.yearBuilt !== undefined && { year_built: dto.yearBuilt }),
      }),
    );
  }

  async remove(organisationId: string, propertyId: string): Promise<void> {
    await this.get(organisationId, propertyId);
    await this.db.withTenant(organisationId, (trx) => this.propertiesRepo.softDelete(trx, organisationId, propertyId));
  }

  async addValuation(organisationId: string, propertyId: string, dto: CreateValuationDto) {
    await this.get(organisationId, propertyId);
    return this.db.withTenant(organisationId, (trx) =>
      this.propertiesRepo.createValuation(trx, {
        organisation_id: organisationId,
        property_id: propertyId,
        valuation_kobo: dto.valuationKobo,
        valuation_date: dto.valuationDate,
        valuer_name: dto.valuerName ?? null,
        source: dto.source ?? 'manual',
      }),
    );
  }

  async listValuations(organisationId: string, propertyId: string) {
    return this.db.withTenant(organisationId, (trx) => this.propertiesRepo.listValuations(trx, organisationId, propertyId));
  }
}
