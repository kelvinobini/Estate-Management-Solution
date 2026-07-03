import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue, Job } from 'bullmq';
import { TenantDatabaseService } from '../../../database/database.service';
import { GatePassesService } from '../services/gate-passes.service';
import { GATE_PASS_EXPIRY_QUEUE } from '../access.tokens';

interface GatePassExpiryJobData {
  organisationId: string;
}

/** Hourly job: marks issued-but-unused gate passes whose valid_until has passed as expired. */
@Injectable()
@Processor(GATE_PASS_EXPIRY_QUEUE)
export class GatePassExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(GatePassExpiryProcessor.name);

  constructor(
    private readonly tenantDb: TenantDatabaseService,
    private readonly gatePassesService: GatePassesService,
    @InjectQueue(GATE_PASS_EXPIRY_QUEUE) private readonly queue: Queue<GatePassExpiryJobData>,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async enqueueForAllOrganisations(): Promise<void> {
    const organisations = await this.tenantDb.runAsService((trx) =>
      trx.selectFrom('organisations').select('id').where('is_active', '=', true).execute(),
    );

    for (const org of organisations) {
      await this.queue.add('scan-organisation', { organisationId: org.id });
    }
  }

  async process(job: Job<GatePassExpiryJobData>): Promise<void> {
    const expired = await this.gatePassesService.expireOverdue(job.data.organisationId);
    this.logger.log(`Organisation ${job.data.organisationId}: ${expired.length} gate pass(es) marked expired`);
  }
}
