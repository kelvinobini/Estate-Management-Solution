import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue, Job } from 'bullmq';
import { Kysely } from 'kysely';
import { KYSELY_INSTANCE } from '../../../database/database.tokens';
import { TenantDatabaseService } from '../../../database/database.service';
import { Database } from '../../../database/kysely.types';
import { AssetsRepository } from '../repositories/assets.repository';
import { MaintenanceSchedulesService } from '../services/maintenance-schedules.service';
import { WorkOrdersService } from '../services/work-orders.service';
import { PREVENTIVE_MAINTENANCE_QUEUE } from '../maintenance.tokens';

interface PreventiveMaintenanceJobData {
  organisationId: string;
}

/**
 * Daily job: for every maintenance schedule past its next_due_at, opens a
 * work order against the schedule's asset and advances the schedule to its
 * next occurrence. Mirrors the arrears-scan / lease-expiry job pattern.
 */
@Injectable()
@Processor(PREVENTIVE_MAINTENANCE_QUEUE)
export class PreventiveMaintenanceProcessor extends WorkerHost {
  private readonly logger = new Logger(PreventiveMaintenanceProcessor.name);

  constructor(
    @Inject(KYSELY_INSTANCE) private readonly db: Kysely<Database>,
    private readonly tenantDb: TenantDatabaseService,
    private readonly assetsRepo: AssetsRepository,
    private readonly schedulesService: MaintenanceSchedulesService,
    private readonly workOrdersService: WorkOrdersService,
    @InjectQueue(PREVENTIVE_MAINTENANCE_QUEUE) private readonly queue: Queue<PreventiveMaintenanceJobData>,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async enqueueForAllOrganisations(): Promise<void> {
    const organisations = await this.tenantDb.runAsService((trx) =>
      trx.selectFrom('organisations').select('id').where('is_active', '=', true).execute(),
    );

    for (const org of organisations) {
      await this.queue.add('scan-organisation', { organisationId: org.id });
    }
  }

  async process(job: Job<PreventiveMaintenanceJobData>): Promise<void> {
    const { organisationId } = job.data;
    const dueSchedules = await this.schedulesService.listDue(organisationId, new Date());

    for (const schedule of dueSchedules) {
      try {
        const asset = await this.tenantDb.withTenant(organisationId, (trx) =>
          this.assetsRepo.findById(trx, organisationId, schedule.asset_id),
        );
        if (!asset) {
          this.logger.warn(`Schedule ${schedule.id} references missing asset ${schedule.asset_id} — skipping`);
          continue;
        }

        await this.workOrdersService.create(organisationId, null, asset.property_id, {
          unitId: asset.unit_id ?? undefined,
          assetId: asset.id,
          title: `Preventive maintenance — ${asset.name}`,
          description: `Auto-generated from maintenance schedule ${schedule.id} (every ${schedule.frequency_days} days).`,
          priority: 'medium',
        });

        await this.schedulesService.recordPerformed(organisationId, schedule.id);
      } catch (error) {
        this.logger.error(`Failed processing schedule ${schedule.id}: ${(error as Error).message}`);
      }
    }
  }
}
