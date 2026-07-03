import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantDatabaseService } from '../../../database/database.service';
import { toKobo } from '../../../common/money.util';
import { ArrearsRepository } from '../repositories/arrears.repository';
import { InvoicesRepository } from '../repositories/invoices.repository';
import { FinancialEvent, ArrearsEscalatedEvent, InvoiceOverdueEvent } from '../events/financial.events';

/** Late-fee rate applied once per overdue scan, as a percentage of the outstanding balance. */
const LATE_FEE_RATE_PERCENT = 5;
const NOTICE_STAGE_THRESHOLD_DAYS = 7;
const LEGAL_REFERRAL_STAGE_THRESHOLD_DAYS = 30;

@Injectable()
export class ArrearsService {
  private readonly logger = new Logger(ArrearsService.name);

  constructor(
    private readonly db: TenantDatabaseService,
    private readonly arrearsRepo: ArrearsRepository,
    private readonly invoicesRepo: InvoicesRepository,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Reacts to `invoice.overdue` (emitted by InvoicesService.scanAndMarkOverdue)
   * by creating/updating the arrears record, applying the late fee once per
   * scan, and escalating the recovery stage once configured thresholds are crossed.
   */
  @OnEvent(FinancialEvent.InvoiceOverdue)
  async handleInvoiceOverdue(event: InvoiceOverdueEvent): Promise<void> {
    if (!event.tenantId) {
      this.logger.warn(`Invoice ${event.invoiceId} is overdue but has no tenant_id — skipping arrears tracking`);
      return;
    }
    const tenantId = event.tenantId; // narrowed to `string`; re-reading event.tenantId inside the closure below would not be

    await this.db.withTenant(event.organisationId, async (trx) => {
      const invoice = await this.invoicesRepo.findById(trx, event.organisationId, event.invoiceId);
      if (!invoice) {
        this.logger.warn(`Overdue invoice ${event.invoiceId} no longer exists — skipping arrears update`);
        return;
      }
      const outstandingKobo = toKobo(invoice.total_kobo) - toKobo(invoice.amount_paid_kobo);

      const existing = await this.arrearsRepo.findByInvoice(trx, event.organisationId, event.invoiceId);
      const stage = this.stageForDaysOverdue(event.daysOverdue);

      if (!existing) {
        const created = await this.arrearsRepo.create(trx, {
          organisation_id: event.organisationId,
          tenant_id: tenantId,
          invoice_id: event.invoiceId,
          outstanding_kobo: outstandingKobo.toString(),
          days_overdue: event.daysOverdue,
        });
        if (stage !== 'reminder') {
          await this.arrearsRepo.escalateStage(trx, created.id, stage);
        }
        return;
      }

      await this.arrearsRepo.updateOutstandingAndDays(trx, existing.id, outstandingKobo, event.daysOverdue);

      const lateFee = (outstandingKobo * BigInt(LATE_FEE_RATE_PERCENT)) / 100n;
      await this.arrearsRepo.applyLateFee(trx, existing.id, lateFee);

      if (stage !== existing.recovery_stage) {
        await this.arrearsRepo.escalateStage(trx, existing.id, stage);
        this.events.emit(
          FinancialEvent.ArrearsEscalated,
          new ArrearsEscalatedEvent(event.organisationId, tenantId, event.invoiceId, stage),
        );
      }
    });
  }

  async listForTenant(organisationId: string, tenantId: string) {
    return this.db.withTenant(organisationId, (trx) => this.arrearsRepo.listByTenant(trx, organisationId, tenantId));
  }

  private stageForDaysOverdue(daysOverdue: number): 'reminder' | 'notice' | 'legal_referral' {
    if (daysOverdue >= LEGAL_REFERRAL_STAGE_THRESHOLD_DAYS) {
      return 'legal_referral';
    }
    if (daysOverdue >= NOTICE_STAGE_THRESHOLD_DAYS) {
      return 'notice';
    }
    return 'reminder';
  }
}
