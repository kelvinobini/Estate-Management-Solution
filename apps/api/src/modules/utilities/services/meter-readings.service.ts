import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { MetersRepository } from '../repositories/meters.repository';
import { MeterReadingsRepository } from '../repositories/meter-readings.repository';
import { RecordMeterReadingDto } from '../dto/record-meter-reading.dto';

@Injectable()
export class MeterReadingsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly metersRepo: MetersRepository,
    private readonly readingsRepo: MeterReadingsRepository,
  ) {}

  /**
   * Meters are monotonically-increasing counters, so a new reading lower
   * than the last one almost always means a data-entry error (meter
   * replacement is the one legitimate exception, and isn't handled yet —
   * it would need an explicit "meter reset" flow).
   */
  async record(organisationId: string, meterId: string, dto: RecordMeterReadingDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const meter = await this.metersRepo.findById(trx, organisationId, meterId);
      if (!meter) {
        throw new NotFoundException('Meter not found');
      }

      const latest = await this.readingsRepo.findLatest(trx, organisationId, meterId);
      if (latest && Number(dto.readingValue) < Number(latest.reading_value)) {
        throw new BadRequestException(
          `New reading (${dto.readingValue}) is lower than the last recorded reading (${latest.reading_value})`,
        );
      }

      return this.readingsRepo.create(trx, {
        organisation_id: organisationId,
        meter_id: meterId,
        reading_value: dto.readingValue,
        reading_source: dto.readingSource ?? 'manual',
        read_at: dto.readAt ?? new Date(),
      });
    });
  }

  async listForMeter(organisationId: string, meterId: string) {
    return this.db.withTenant(organisationId, (trx) => this.readingsRepo.listForMeter(trx, organisationId, meterId));
  }
}
