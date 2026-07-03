import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LeaseEvent, LeaseSignedEvent } from '../../../common/events/lease.events';
import { InvoicesService } from './invoices.service';

/**
 * The flagship cross-module example from docs/01-architecture.md section 3:
 * "lease.signed -> Financial module creates the first invoice". Listens on
 * the shared event contract rather than importing anything from the Lease
 * module, keeping Financial free to be extracted into its own service later.
 */
@Injectable()
export class LeaseSignedInvoiceListener {
  private readonly logger = new Logger(LeaseSignedInvoiceListener.name);

  constructor(private readonly invoicesService: InvoicesService) {}

  @OnEvent(LeaseEvent.Signed)
  async handleLeaseSigned(event: LeaseSignedEvent): Promise<void> {
    await this.invoicesService.createInvoice(event.organisationId, {
      leaseId: event.leaseId,
      unitId: event.unitId,
      tenantId: event.tenantId,
      invoiceType: 'rent',
      dueDate: event.startDate,
      lineItems: [
        {
          description: `Rent — ${event.rentFrequency} charge for lease start`,
          quantity: '1',
          unitPriceKobo: event.rentAmountKobo,
        },
      ],
    });

    this.logger.log(`Created first rent invoice for lease ${event.leaseId}`);
  }
}
