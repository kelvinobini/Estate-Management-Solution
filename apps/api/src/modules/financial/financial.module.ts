import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PaystackModule } from '../../integrations/paystack/paystack.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { LeaseModule } from '../lease/lease.module';
import { PropertyModule } from '../property/property.module';
import { InvoicesController } from './controllers/invoices.controller';
import { PaymentsController } from './controllers/payments.controller';
import { ArrearsController } from './controllers/arrears.controller';
import { PaymentPlansController } from './controllers/payment-plans.controller';
import { InvoicesService } from './services/invoices.service';
import { PaymentsService } from './services/payments.service';
import { ArrearsService } from './services/arrears.service';
import { PaymentPlansService } from './services/payment-plans.service';
import { InvoicesRepository } from './repositories/invoices.repository';
import { InvoiceLineItemsRepository } from './repositories/invoice-line-items.repository';
import { PaymentsRepository } from './repositories/payments.repository';
import { PaymentPlansRepository } from './repositories/payment-plans.repository';
import { ArrearsRepository } from './repositories/arrears.repository';
import { RecurringInvoicesProcessor } from './jobs/recurring-invoices.processor';
import { ArrearsScanProcessor } from './jobs/arrears-scan.processor';
import { LeaseSignedInvoiceListener } from './services/lease-signed-invoice.listener';
import { ARREARS_SCAN_QUEUE, RECURRING_INVOICES_QUEUE } from './financial.tokens';

export { RECURRING_INVOICES_QUEUE, ARREARS_SCAN_QUEUE };

@Module({
  imports: [
    PaystackModule,
    ComplianceModule,
    LeaseModule,
    PropertyModule,
    BullModule.registerQueue({ name: RECURRING_INVOICES_QUEUE }, { name: ARREARS_SCAN_QUEUE }),
  ],
  controllers: [InvoicesController, PaymentsController, ArrearsController, PaymentPlansController],
  providers: [
    InvoicesService,
    PaymentsService,
    ArrearsService,
    PaymentPlansService,
    InvoicesRepository,
    InvoiceLineItemsRepository,
    PaymentsRepository,
    PaymentPlansRepository,
    ArrearsRepository,
    RecurringInvoicesProcessor,
    ArrearsScanProcessor,
    LeaseSignedInvoiceListener,
  ],
  exports: [InvoicesService, PaymentsService, ArrearsService],
})
export class FinancialModule {}
