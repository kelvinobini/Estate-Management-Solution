import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { VehiclesRepository } from '../repositories/vehicles.repository';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly vehiclesRepo: VehiclesRepository,
  ) {}

  async create(organisationId: string, dto: CreateVehicleDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const existing = await this.vehiclesRepo.findByPlateNumber(trx, organisationId, dto.plateNumber);
      if (existing) {
        throw new BadRequestException(`Plate number '${dto.plateNumber}' is already registered`);
      }

      return this.vehiclesRepo.create(trx, {
        organisation_id: organisationId,
        tenant_id: dto.tenantId ?? null,
        plate_number: dto.plateNumber,
        make_model: dto.makeModel ?? null,
        permit_type: dto.permitType ?? 'resident',
        valid_until: dto.validUntil ?? null,
      });
    });
  }

  async get(organisationId: string, vehicleId: string) {
    const vehicle = await this.db.withTenant(organisationId, (trx) => this.vehiclesRepo.findById(trx, organisationId, vehicleId));
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    return vehicle;
  }

  async listForTenant(organisationId: string, tenantId: string) {
    return this.db.withTenant(organisationId, (trx) => this.vehiclesRepo.listForTenant(trx, organisationId, tenantId));
  }
}
