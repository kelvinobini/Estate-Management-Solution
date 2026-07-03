import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue, Job } from 'bullmq';
import { Kysely } from 'kysely';
import { KYSELY_INSTANCE } from '../../../database/database.tokens';
import { TenantDatabaseService } from '../../../database/database.service';
import { Database } from '../../../database/kysely.types';
import { InvoicesService } from '../services/invoices.service';
import { ARREARS_SCAN_QUEUE } from '../financial.tokens';

interface ArrearsScanJobData {
  organisationId: string;
}

/**
 * Daily job: marks overdue invoices per organisation. InvoicesService emits
 * `invoice.overdue` for each one, which ArrearsService (an event listener)
 * turns into arrears rows, late fees, and recovery-stage escalation.
 */
@Injectable()
@Processor(ARREARS_SCAN_QUEUE)
export class ArrearsScanProcessor extends WorkerHost {
  private readonly logger = new Logger(ArrearsScanProcessor.name);

  constructor(
    @Inject(KYSELY_INSTANCE) private readonly db: Kysely<Database>,
    private readonly tenantDb: TenantDatabaseService,
    private readonly invoicesService: InvoicesService,
    @InjectQueue(ARREARS_SCAN_QUEUE) private readonly queue: Queue<ArrearsScanJobData>,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async enqueueForAllOrganisations(): Promise<void> {
    const organisations = await this.tenantDb.runAsService((trx) =>
      trx.selectFrom('organisations').select('id').where('is_active', '=', true).execute(),
    );

    for (const org of organisations) {
      await this.queue.add('scan-organisation', { organisationId: org.id });
    }
  }

  async process(job: Job<ArrearsScanJobData>): Promise<void> {
    const overdue = await this.invoicesService.scanAndMarkOverdue(job.data.organisationId);
    this.logger.log(`Organisation ${job.data.organisationId}: ${overdue.length} invoice(s) marked overdue`);
  }
}
