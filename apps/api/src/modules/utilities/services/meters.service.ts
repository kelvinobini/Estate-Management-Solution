import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { MetersRepository } from '../repositories/meters.repository';
import { CreateMeterDto } from '../dto/create-meter.dto';

@Injectable()
export class MetersService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly metersRepo: MetersRepository,
  ) {}

  async create(organisationId: string, dto: CreateMeterDto) {
    return this.db.withTenant(organisationId, (trx) =>
      this.metersRepo.create(trx, {
        organisation_id: organisationId,
        property_id: dto.propertyId,
        unit_id: dto.unitId ?? null,
        meter_type: dto.meterType,
        is_bulk_meter: dto.unitId === undefined,
        serial_number: dto.serialNumber,
        unit_rate_kobo: dto.unitRateKobo ?? 0,
      }),
    );
  }

  async get(organisationId: string, meterId: string) {
    const meter = await this.db.withTenant(organisationId, (trx) => this.metersRepo.findById(trx, organisationId, meterId));
    if (!meter) {
      throw new NotFoundException('Meter not found');
    }
    return meter;
  }

  async listForProperty(organisationId: string, propertyId: string) {
    return this.db.withTenant(organisationId, (trx) => this.metersRepo.listForProperty(trx, organisationId, propertyId));
  }

  async listForUnit(organisationId: string, unitId: string) {
    return this.db.withTenant(organisationId, (trx) => this.metersRepo.listForUnit(trx, organisationId, unitId));
  }
}
