import { InvoicesService } from '../../src/modules/financial/services/invoices.service';

describe('InvoicesService', () => {
  const organisationId = 'org-1';
  let invoicesRepo: any;
  let lineItemsRepo: any;
  let events: any;
  let config: any;
  let db: any;
  let service: InvoicesService;

  beforeEach(() => {
    invoicesRepo = {
      create: jest.fn(async (_trx, invoice) => ({ id: 'inv-1', ...invoice })),
      findById: jest.fn(),
      applyPayment: jest.fn(async (_trx, _orgId, _id, newAmountPaid, status) => ({
        id: 'inv-1',
        amount_paid_kobo: newAmountPaid.toString(),
        status,
      })),
    };
    lineItemsRepo = { createMany: jest.fn(async () => []) };
    events = { emit: jest.fn() };
    config = { get: jest.fn(() => 7.5) };
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };

    service = new InvoicesService(db, invoicesRepo, lineItemsRepo, events, config);
  });

  it('computes subtotal, VAT (7.5%), and total from line items using integer kobo math', async () => {
    await service.createInvoice(organisationId, {
      tenantId: 'tenant-1',
      invoiceType: 'rent',
      dueDate: '2026-08-01',
      lineItems: [{ description: 'Rent', quantity: '1', unitPriceKobo: '100000' }],
    });

    expect(invoicesRepo.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        subtotal_kobo: '100000',
        vat_kobo: '7500',
        total_kobo: '107500',
        amount_paid_kobo: '0',
        status: 'draft',
      }),
    );
  });

  it('emits invoice.created after successfully creating an invoice', async () => {
    await service.createInvoice(organisationId, {
      tenantId: 'tenant-1',
      invoiceType: 'rent',
      dueDate: '2026-08-01',
      lineItems: [{ description: 'Rent', quantity: '1', unitPriceKobo: '50000' }],
    });

    expect(events.emit).toHaveBeenCalledWith('invoice.created', expect.objectContaining({ organisationId }));
  });

  it('marks an invoice paid and emits invoice.paid once the full balance is covered', async () => {
    invoicesRepo.findById.mockResolvedValue({
      id: 'inv-1',
      tenant_id: 'tenant-1',
      total_kobo: '100000',
      amount_paid_kobo: '0',
    });

    await service.applyPayment(organisationId, 'inv-1', 100000n);

    expect(invoicesRepo.applyPayment).toHaveBeenCalledWith(expect.anything(), organisationId, 'inv-1', 100000n, 'paid');
    expect(events.emit).toHaveBeenCalledWith('invoice.paid', expect.objectContaining({ invoiceId: 'inv-1' }));
  });

  it('marks an invoice partially_paid when the payment does not cover the full balance', async () => {
    invoicesRepo.findById.mockResolvedValue({
      id: 'inv-1',
      tenant_id: 'tenant-1',
      total_kobo: '100000',
      amount_paid_kobo: '0',
    });

    await service.applyPayment(organisationId, 'inv-1', 40000n);

    expect(invoicesRepo.applyPayment).toHaveBeenCalledWith(
      expect.anything(),
      organisationId,
      'inv-1',
      40000n,
      'partially_paid',
    );
    expect(events.emit).not.toHaveBeenCalledWith('invoice.paid', expect.anything());
  });
});
