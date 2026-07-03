import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue, Job } from 'bullmq';
import { Kysely } from 'kysely';
import { KYSELY_INSTANCE } from '../../../database/database.tokens';
import { TenantDatabaseService } from '../../../database/database.service';
import { Database } from '../../../database/kysely.types';
import { LeasesService } from '../services/leases.service';
import { LEASE_EXPIRY_QUEUE } from '../lease.tokens';

interface LeaseExpiryJobData {
  organisationId: string;
}

/** Daily job: marks active/renewed leases whose end_date has passed as expired, emitting lease.expired per lease. */
@Injectable()
@Processor(LEASE_EXPIRY_QUEUE)
export class LeaseExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(LeaseExpiryProcessor.name);

  constructor(
    @Inject(KYSELY_INSTANCE) private readonly db: Kysely<Database>,
    private readonly tenantDb: TenantDatabaseService,
    private readonly leasesService: LeasesService,
    @InjectQueue(LEASE_EXPIRY_QUEUE) private readonly queue: Queue<LeaseExpiryJobData>,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async enqueueForAllOrganisations(): Promise<void> {
    const organisations = await this.tenantDb.runAsService((trx) =>
      trx.selectFrom('organisations').select('id').where('is_active', '=', true).execute(),
    );

    for (const org of organisations) {
      await this.queue.add('scan-organisation', { organisationId: org.id });
    }
  }

  async process(job: Job<LeaseExpiryJobData>): Promise<void> {
    const expired = await this.leasesService.markExpiredLeases(job.data.organisationId);
    this.logger.log(`Organisation ${job.data.organisationId}: ${expired.length} lease(s) marked expired`);
  }
}
