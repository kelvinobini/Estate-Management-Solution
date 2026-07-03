import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { TenantDatabaseService } from '../../../database/database.service';
import { PaystackService } from '../../../integrations/paystack/paystack.service';
import { toKobo } from '../../../common/money.util';
import { InvoicesRepository } from '../repositories/invoices.repository';
import { PaymentsRepository } from '../repositories/payments.repository';
import { InvoicesService } from './invoices.service';
import { TenantsRepository } from '../../lease/repositories/tenants.repository';
import { RecordManualPaymentDto, InitiatePaystackPaymentDto } from '../dto/record-payment.dto';
import { FinancialEvent, PaymentSucceededEvent } from '../events/financial.events';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly db: TenantDatabaseService,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly invoicesRepo: InvoicesRepository,
    private readonly invoicesService: InvoicesService,
    private readonly tenantsRepo: TenantsRepository,
    private readonly paystack: PaystackService,
    private readonly events: EventEmitter2,
  ) {}

  /** Starts a Paystack hosted-checkout flow for an invoice's outstanding balance. */
  async initiatePaystackPayment(organisationId: string, dto: InitiatePaystackPaymentDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const invoice = await this.invoicesRepo.findById(trx, organisationId, dto.invoiceId);
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      if (invoice.status === 'paid' || invoice.status === 'void') {
        throw new BadRequestException(`Invoice is already ${invoice.status}`);
      }
      if (!invoice.tenant_id) {
        throw new BadRequestException('Invoice has no tenant on record');
      }

      const tenant = await this.tenantsRepo.findById(trx, organisationId, invoice.tenant_id);
      if (!tenant?.email) {
        throw new BadRequestException('Tenant has no email on file; add one before initiating a payment');
      }

      const outstandingKobo = toKobo(invoice.total_kobo) - toKobo(invoice.amount_paid_kobo);
      const reference = `pay_${randomUUID()}`;

      await this.paymentsRepo.create(trx, {
        organisation_id: organisationId,
        invoice_id: invoice.id,
        tenant_id: invoice.tenant_id,
        amount_kobo: outstandingKobo.toString(),
        currency: 'NGN',
        payment_method: 'card',
        gateway: 'paystack',
        gateway_reference: reference,
        status: 'pending',
        paid_at: null,
      });

      const { authorization_url: authorizationUrl } = await this.paystack.initializeTransaction({
        email: tenant.email,
        amountKobo: outstandingKobo,
        reference,
        callbackUrl: dto.callbackUrl ?? '',
      });

      return { reference, authorizationUrl };
    });
  }

  /**
   * Handles the `charge.success` webhook. The payment's organisation is not
   * known until we look up the row by gateway reference, so that lookup runs
   * under the service role (BYPASSRLS); every subsequent write is scoped with
   * `withTenant` using the organisation_id found on that row.
   */
  async handlePaystackWebhook(rawBody: string, signatureHeader: string | undefined): Promise<void> {
    if (!this.paystack.verifyWebhookSignature(rawBody, signatureHeader)) {
      throw new BadRequestException('Invalid Paystack webhook signature');
    }

    const event = JSON.parse(rawBody) as { event: string; data: { reference: string } };
    if (event.event !== 'charge.success') {
      return;
    }

    const reference = event.data.reference;
    const verified = await this.paystack.verifyTransaction(reference);
    if (verified.status !== 'success') {
      this.logger.warn(`Paystack reference ${reference} did not verify as successful`);
      return;
    }

    const payment = await this.db.runAsService((trx) =>
      this.paymentsRepo.findByGatewayReference(trx, 'paystack', reference),
    );

    if (!payment) {
      this.logger.error(`Received webhook for unknown payment reference ${reference}`);
      return;
    }

    if (payment.status === 'successful') {
      return; // already processed — webhook delivery is at-least-once
    }

    await this.db.withTenant(payment.organisation_id, async (trx) => {
      await this.paymentsRepo.markStatus(trx, payment.id, 'successful', new Date());
      if (payment.invoice_id) {
        await this.invoicesService.applyPaymentTx(trx, payment.organisation_id, payment.invoice_id, toKobo(payment.amount_kobo));
      }
    });

    this.events.emit(
      FinancialEvent.PaymentSucceeded,
      new PaymentSucceededEvent(payment.organisation_id, payment.id, payment.invoice_id, toKobo(payment.amount_kobo)),
    );
  }

  /** Records an offline payment (bank transfer, cash) confirmed manually by a Finance Officer. */
  async recordManualPayment(organisationId: string, dto: RecordManualPaymentDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const invoice = await this.invoicesRepo.findById(trx, organisationId, dto.invoiceId);
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      const payment = await this.paymentsRepo.create(trx, {
        organisation_id: organisationId,
        invoice_id: invoice.id,
        tenant_id: invoice.tenant_id,
        amount_kobo: dto.amountKobo,
        currency: 'NGN',
        payment_method: dto.paymentMethod,
        gateway: 'manual',
        gateway_reference: dto.reference ?? `manual_${randomUUID()}`,
        status: 'successful',
        paid_at: new Date(),
      });

      await this.invoicesService.applyPaymentTx(trx, organisationId, invoice.id, toKobo(dto.amountKobo));

      this.events.emit(
        FinancialEvent.PaymentSucceeded,
        new PaymentSucceededEvent(organisationId, payment.id, invoice.id, toKobo(dto.amountKobo)),
      );

      return payment;
    });
  }
}
