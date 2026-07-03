import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue, Job } from 'bullmq';
import { Kysely, Selectable } from 'kysely';
import { KYSELY_INSTANCE } from '../../../database/database.tokens';
import { TenantDatabaseService } from '../../../database/database.service';
import { Database, LeasesTable } from '../../../database/kysely.types';
import { InvoicesService } from '../services/invoices.service';
import { RECURRING_INVOICES_QUEUE } from '../financial.tokens';

const RENT_INVOICE_LOOKAHEAD_DAYS = 7;

const FREQUENCY_TO_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  biannual: 6,
  annual: 12,
};

interface GenerateInvoicesJobData {
  organisationId: string;
}

/**
 * Daily job: for every active lease, checks whether the next rent invoice
 * falls within the lookahead window and creates it if so. "Next due date" is
 * derived from the lease's last-generated rent invoice (or `start_date` if
 * none exists yet) plus its billing frequency — there is no separate
 * "next due date" column to keep drifting out of sync with actual invoices.
 */
@Injectable()
@Processor(RECURRING_INVOICES_QUEUE)
export class RecurringInvoicesProcessor extends WorkerHost {
  private readonly logger = new Logger(RecurringInvoicesProcessor.name);

  constructor(
    @Inject(KYSELY_INSTANCE) private readonly db: Kysely<Database>,
    private readonly tenantDb: TenantDatabaseService,
    private readonly invoicesService: InvoicesService,
    @InjectQueue(RECURRING_INVOICES_QUEUE) private readonly queue: Queue<GenerateInvoicesJobData>,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async enqueueForAllOrganisations(): Promise<void> {
    const organisations = await this.tenantDb.runAsService((trx) =>
      trx.selectFrom('organisations').select('id').where('is_active', '=', true).execute(),
    );

    for (const org of organisations) {
      await this.queue.add('generate-for-organisation', { organisationId: org.id });
    }
  }

  async process(job: Job<GenerateInvoicesJobData>): Promise<void> {
    const { organisationId } = job.data;
    const lookaheadDate = new Date();
    lookaheadDate.setDate(lookaheadDate.getDate() + RENT_INVOICE_LOOKAHEAD_DAYS);

    const activeLeases = await this.tenantDb.withTenant(organisationId, (trx) =>
      trx
        .selectFrom('leases')
        .selectAll()
        .where('organisation_id', '=', organisationId)
        .where('status', '=', 'active')
        .where('deleted_at', 'is', null)
        .execute(),
    );

    for (const lease of activeLeases) {
      try {
        await this.maybeGenerateNextInvoice(organisationId, lease, lookaheadDate);
      } catch (error) {
        this.logger.error(`Failed generating rent invoice for lease ${lease.id}: ${(error as Error).message}`);
      }
    }
  }

  private async maybeGenerateNextInvoice(
    organisationId: string,
    lease: Selectable<LeasesTable>,
    lookaheadDate: Date,
  ): Promise<void> {
    const latestInvoice = await this.tenantDb.withTenant(organisationId, (trx) =>
      trx
        .selectFrom('invoices')
        .selectAll()
        .where('organisation_id', '=', organisationId)
        .where('lease_id', '=', lease.id)
        .where('invoice_type', '=', 'rent')
        .orderBy('due_date', 'desc')
        .limit(1)
        .executeTakeFirst(),
    );

    const nextDueDate = latestInvoice
      ? this.addMonths(new Date(latestInvoice.due_date), FREQUENCY_TO_MONTHS[lease.rent_frequency] ?? 1)
      : new Date(lease.start_date);

    if (nextDueDate > lookaheadDate) {
      return; // not due yet
    }

    await this.invoicesService.createInvoice(organisationId, {
      leaseId: lease.id,
      unitId: lease.unit_id,
      tenantId: lease.primary_tenant_id,
      invoiceType: 'rent',
      dueDate: nextDueDate.toISOString().slice(0, 10),
      lineItems: [
        {
          description: `Rent — ${lease.rent_frequency} charge due ${nextDueDate.toISOString().slice(0, 10)}`,
          quantity: '1',
          unitPriceKobo: lease.rent_amount_kobo,
        },
      ],
    });
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }
}
