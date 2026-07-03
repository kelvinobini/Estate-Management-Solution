import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { addKobo, toKobo } from '../../../common/money.util';
import { InvoicesRepository } from '../repositories/invoices.repository';
import { PaymentPlansRepository } from '../repositories/payment-plans.repository';
import { CreatePaymentPlanDto } from '../dto/create-payment-plan.dto';

@Injectable()
export class PaymentPlansService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly invoicesRepo: InvoicesRepository,
    private readonly paymentPlansRepo: PaymentPlansRepository,
  ) {}

  /** Splits an invoice's outstanding balance into installments; the sum must exactly match the balance due. */
  async createPlan(organisationId: string, dto: CreatePaymentPlanDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const invoice = await this.invoicesRepo.findById(trx, organisationId, dto.invoiceId);
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      const outstanding = toKobo(invoice.total_kobo) - toKobo(invoice.amount_paid_kobo);
      const installmentTotal = addKobo(...dto.installments.map((i) => i.amountDueKobo));
      if (installmentTotal !== outstanding) {
        throw new BadRequestException(
          `Installments must sum to the outstanding balance (${outstanding} kobo), got ${installmentTotal} kobo`,
        );
      }

      return this.paymentPlansRepo.createMany(
        trx,
        dto.installments.map((installment, index) => ({
          organisation_id: organisationId,
          invoice_id: dto.invoiceId,
          installment_number: index + 1,
          amount_due_kobo: installment.amountDueKobo,
          due_date: installment.dueDate,
        })),
      );
    });
  }

  async listForInvoice(organisationId: string, invoiceId: string) {
    return this.db.withTenant(organisationId, (trx) =>
      this.paymentPlansRepo.listForInvoice(trx, organisationId, invoiceId),
    );
  }
}
