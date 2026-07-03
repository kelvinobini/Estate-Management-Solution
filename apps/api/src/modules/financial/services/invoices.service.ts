import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';
import { TenantDatabaseService } from '../../../database/database.service';
import { addKobo, computeVatKobo, toKobo } from '../../../common/money.util';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { InvoicesRepository } from '../repositories/invoices.repository';
import { InvoiceLineItemsRepository } from '../repositories/invoice-line-items.repository';
import { FinancialEvent, InvoiceCreatedEvent, InvoiceOverdueEvent, InvoicePaidEvent } from '../events/financial.events';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly invoicesRepo: InvoicesRepository,
    private readonly lineItemsRepo: InvoiceLineItemsRepository,
    private readonly events: EventEmitter2,
    private readonly config: ConfigService,
  ) {}

  /**
   * Creates an invoice with its line items in a single transaction, computing
   * subtotal/VAT/total from the line items rather than trusting client-supplied
   * totals. Opens its own transaction — use `createInvoiceTx` instead when the
   * caller (e.g. UtilityInvoicesService) must keep this atomic with its own writes.
   */
  async createInvoice(organisationId: string, dto: CreateInvoiceDto) {
    return this.db.withTenant(organisationId, (trx) => this.createInvoiceTx(trx, organisationId, dto));
  }

  /** Transaction-scoped variant of `createInvoice` — must be called with a trx already opened via `withTenant`. */
  async createInvoiceTx(trx: Parameters<InvoicesRepository['create']>[0], organisationId: string, dto: CreateInvoiceDto) {
    if (dto.lineItems.length === 0) {
      throw new BadRequestException('An invoice requires at least one line item');
    }

    const vatRatePercent = dto.vatRatePercent ?? this.config.get<number>('DEFAULT_VAT_PERCENT', 7.5);

    const lineAmounts = dto.lineItems.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = toKobo(item.unitPriceKobo);
      return unitPrice * BigInt(Math.round(quantity * 100)) / 100n;
    });
    const subtotalKobo = addKobo(...lineAmounts);
    const vatKobo = computeVatKobo(subtotalKobo, vatRatePercent);
    const totalKobo = subtotalKobo + vatKobo;

    const invoice = await this.invoicesRepo.create(trx, {
      organisation_id: organisationId,
      lease_id: dto.leaseId ?? null,
      unit_id: dto.unitId ?? null,
      tenant_id: dto.tenantId,
      invoice_number: this.generateInvoiceNumber(),
      invoice_type: dto.invoiceType,
      currency: 'NGN',
      subtotal_kobo: subtotalKobo.toString(),
      vat_kobo: vatKobo.toString(),
      total_kobo: totalKobo.toString(),
      amount_paid_kobo: '0',
      status: 'draft',
      due_date: dto.dueDate,
      issued_at: null,
    });

    await this.lineItemsRepo.createMany(
      trx,
      dto.lineItems.map((item) => ({
        organisation_id: organisationId,
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price_kobo: item.unitPriceKobo,
        amount_kobo: (toKobo(item.unitPriceKobo) * BigInt(Math.round(Number(item.quantity) * 100)) / 100n).toString(),
      })),
    );

    this.events.emit(FinancialEvent.InvoiceCreated, new InvoiceCreatedEvent(organisationId, invoice.id, invoice.tenant_id));

    return invoice;
  }

  async issueInvoice(organisationId: string, invoiceId: string) {
    return this.db.withTenant(organisationId, async (trx) => {
      const invoice = await this.invoicesRepo.findById(trx, organisationId, invoiceId);
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      if (invoice.status !== 'draft') {
        throw new BadRequestException(`Cannot issue an invoice in status '${invoice.status}'`);
      }
      return this.invoicesRepo.markIssued(trx, organisationId, invoiceId);
    });
  }

  async voidInvoice(organisationId: string, invoiceId: string) {
    return this.db.withTenant(organisationId, async (trx) => {
      const invoice = await this.invoicesRepo.findById(trx, organisationId, invoiceId);
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      if (invoice.status === 'paid') {
        throw new BadRequestException('Cannot void an invoice that has already been paid');
      }
      return this.invoicesRepo.markVoid(trx, organisationId, invoiceId);
    });
  }

  async getInvoice(organisationId: string, invoiceId: string) {
    return this.db.withTenant(organisationId, async (trx) => {
      const invoice = await this.invoicesRepo.findById(trx, organisationId, invoiceId);
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      const lineItems = await this.lineItemsRepo.listForInvoice(trx, organisationId, invoiceId);
      return { ...invoice, lineItems };
    });
  }

  async listForTenant(organisationId: string, tenantId: string) {
    return this.db.withTenant(organisationId, (trx) => this.invoicesRepo.listForTenant(trx, organisationId, tenantId));
  }

  /** Org-wide, paginated listing for staff-facing screens (e.g. the finance team's invoice register). */
  async listForOrganisation(organisationId: string, options: { status?: string; page: number; pageSize: number }) {
    const pageSize = Math.min(Math.max(options.pageSize, 1), 100);
    const page = Math.max(options.page, 1);
    const { rows, total } = await this.db.withTenant(organisationId, (trx) =>
      this.invoicesRepo.listForOrganisation(trx, organisationId, {
        status: options.status,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    );
    return { rows, total, page, pageSize };
  }

  /** Paginated listing scoped to a landlord's own properties, for the Landlord app's rent-collection screen. */
  async listForOwner(organisationId: string, ownerUserId: string, options: { status?: string; page: number; pageSize: number }) {
    const pageSize = Math.min(Math.max(options.pageSize, 1), 100);
    const page = Math.max(options.page, 1);
    const { rows, total } = await this.db.withTenant(organisationId, (trx) =>
      this.invoicesRepo.listForOwner(trx, organisationId, ownerUserId, {
        status: options.status,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    );
    return { rows, total, page, pageSize };
  }

  /**
   * Applies a successful payment to an invoice: increments amount_paid_kobo
   * and flips status to 'paid' once the balance is fully covered. Opens its
   * own transaction — use `applyPaymentTx` instead when the caller (e.g.
   * PaymentsService) must keep this atomic with its own writes.
   */
  async applyPayment(organisationId: string, invoiceId: string, paidAmountKobo: bigint) {
    return this.db.withTenant(organisationId, (trx) =>
      this.applyPaymentTx(trx, organisationId, invoiceId, paidAmountKobo),
    );
  }

  /** Transaction-scoped variant of `applyPayment` — must be called with a trx already opened via `withTenant`. */
  async applyPaymentTx(
    trx: Parameters<InvoicesRepository['applyPayment']>[0],
    organisationId: string,
    invoiceId: string,
    paidAmountKobo: bigint,
  ) {
    const invoice = await this.invoicesRepo.findById(trx, organisationId, invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const newAmountPaid = toKobo(invoice.amount_paid_kobo) + paidAmountKobo;
    const isFullyPaid = newAmountPaid >= toKobo(invoice.total_kobo);
    const updated = await this.invoicesRepo.applyPayment(
      trx,
      organisationId,
      invoiceId,
      newAmountPaid,
      isFullyPaid ? 'paid' : 'partially_paid',
    );

    if (isFullyPaid) {
      this.events.emit(FinancialEvent.InvoicePaid, new InvoicePaidEvent(organisationId, invoiceId, invoice.tenant_id));
    }

    return updated;
  }

  /** Used by the arrears-scan background job (see jobs/arrears-scan.processor.ts). */
  async scanAndMarkOverdue(organisationId: string) {
    return this.db.withTenant(organisationId, async (trx) => {
      const overdue = await this.invoicesRepo.listOverdue(trx, organisationId, new Date());
      for (const invoice of overdue) {
        await this.invoicesRepo.markOverdue(trx, organisationId, invoice.id);
        const daysOverdue = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (24 * 60 * 60 * 1000));
        this.events.emit(
          FinancialEvent.InvoiceOverdue,
          new InvoiceOverdueEvent(organisationId, invoice.id, invoice.tenant_id, daysOverdue),
        );
      }
      return overdue;
    });
  }

  private generateInvoiceNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = randomBytes(3).toString('hex').toUpperCase();
    return `INV-${datePart}-${randomPart}`;
  }
}
