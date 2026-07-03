import { LeaseSignedInvoiceListener } from '../../src/modules/financial/services/lease-signed-invoice.listener';
import { LeaseSignedEvent } from '../../src/common/events/lease.events';

describe('LeaseSignedInvoiceListener', () => {
  let invoicesService: any;
  let listener: LeaseSignedInvoiceListener;

  beforeEach(() => {
    invoicesService = { createInvoice: jest.fn(async () => ({ id: 'inv-1' })) };
    listener = new LeaseSignedInvoiceListener(invoicesService);
  });

  it('creates a rent invoice for the lease start date using the lease terms', async () => {
    await listener.handleLeaseSigned(
      new LeaseSignedEvent('org-1', 'lease-1', 'unit-1', 'tenant-1', '150000', 'monthly', '2026-08-01'),
    );

    expect(invoicesService.createInvoice).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        leaseId: 'lease-1',
        unitId: 'unit-1',
        tenantId: 'tenant-1',
        invoiceType: 'rent',
        dueDate: '2026-08-01',
        lineItems: [expect.objectContaining({ unitPriceKobo: '150000' })],
      }),
    );
  });
});
