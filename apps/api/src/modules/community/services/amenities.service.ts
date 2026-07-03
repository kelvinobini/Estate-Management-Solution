import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { AmenitiesRepository } from '../repositories/amenities.repository';
import { CreateAmenityDto } from '../dto/create-amenity.dto';

@Injectable()
export class AmenitiesService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly amenitiesRepo: AmenitiesRepository,
  ) {}

  async create(organisationId: string, dto: CreateAmenityDto) {
    return this.db.withTenant(organisationId, (trx) =>
      this.amenitiesRepo.create(trx, {
        organisation_id: organisationId,
        property_id: dto.propertyId,
        name: dto.name,
        capacity: dto.capacity ?? null,
        booking_fee_kobo: dto.bookingFeeKobo ?? 0,
      }),
    );
  }

  async get(organisationId: string, amenityId: string) {
    const amenity = await this.db.withTenant(organisationId, (trx) => this.amenitiesRepo.findById(trx, organisationId, amenityId));
    if (!amenity) {
      throw new NotFoundException('Amenity not found');
    }
    return amenity;
  }

  async listForProperty(organisationId: string, propertyId: string) {
    return this.db.withTenant(organisationId, (trx) => this.amenitiesRepo.listForProperty(trx, organisationId, propertyId));
  }
}
