import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { AssetsRepository } from '../repositories/assets.repository';
import { MaintenanceSchedulesRepository } from '../repositories/maintenance-schedules.repository';
import { CreateMaintenanceScheduleDto } from '../dto/create-maintenance-schedule.dto';

@Injectable()
export class MaintenanceSchedulesService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly assetsRepo: AssetsRepository,
    private readonly schedulesRepo: MaintenanceSchedulesRepository,
  ) {}

  async create(organisationId: string, dto: CreateMaintenanceScheduleDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const asset = await this.assetsRepo.findById(trx, organisationId, dto.assetId);
      if (!asset) {
        throw new NotFoundException('Asset not found');
      }

      return this.schedulesRepo.create(trx, {
        organisation_id: organisationId,
        asset_id: dto.assetId,
        frequency_days: dto.frequencyDays,
        next_due_at: this.addDays(new Date(), dto.frequencyDays),
        assigned_vendor_id: dto.assignedVendorId ?? null,
      });
    });
  }

  async listForAsset(organisationId: string, assetId: string) {
    return this.db.withTenant(organisationId, (trx) => this.schedulesRepo.listForAsset(trx, organisationId, assetId));
  }

  /** Used by the preventive-maintenance job after opening a work order for a due schedule. */
  async recordPerformed(organisationId: string, scheduleId: string) {
    return this.db.withTenant(organisationId, async (trx) => {
      const schedule = await this.schedulesRepo.findById(trx, organisationId, scheduleId);
      if (!schedule) {
        throw new NotFoundException('Maintenance schedule not found');
      }

      const now = new Date();
      return this.schedulesRepo.update(trx, organisationId, scheduleId, {
        last_performed_at: now,
        next_due_at: this.addDays(now, schedule.frequency_days),
      });
    });
  }

  async listDue(organisationId: string, asOf: Date) {
    return this.db.withTenant(organisationId, (trx) => this.schedulesRepo.listDue(trx, organisationId, asOf));
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
