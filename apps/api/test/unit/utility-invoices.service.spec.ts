import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UtilityInvoicesService } from '../../src/modules/utilities/services/utility-invoices.service';

describe('UtilityInvoicesService.generate', () => {
  const organisationId = 'org-1';
  let db: any;
  let metersRepo: any;
  let readingsRepo: any;
  let utilityInvoicesRepo: any;
  let invoicesService: any;
  let service: UtilityInvoicesService;

  beforeEach(() => {
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };
    metersRepo = { findById: jest.fn() };
    readingsRepo = { findLatestAsOf: jest.fn() };
    utilityInvoicesRepo = {
      create: jest.fn(async (_trx, row) => ({ id: 'util-inv-1', invoice_id: null, ...row })),
      update: jest.fn(async (_trx, _orgId, id, changes) => ({ id, ...changes })),
    };
    invoicesService = { createInvoiceTx: jest.fn(async () => ({ id: 'invoice-1' })) };

    service = new UtilityInvoicesService(db, metersRepo, readingsRepo, utilityInvoicesRepo, invoicesService);
  });

  it('rejects when periodEnd is not after periodStart', async () => {
    await expect(
      service.generate(organisationId, 'meter-1', { periodStart: '2026-08-31', periodEnd: '2026-08-01' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException for a non-existent meter', async () => {
    metersRepo.findById.mockResolvedValue(undefined);
    await expect(
      service.generate(organisationId, 'meter-1', { periodStart: '2026-08-01', periodEnd: '2026-08-31' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects when there are insufficient readings to bracket the period', async () => {
    metersRepo.findById.mockResolvedValue({ id: 'meter-1', unit_rate_kobo: '5000', meter_type: 'electricity' });
    readingsRepo.findLatestAsOf.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ reading_value: '500.000' });

    await expect(
      service.generate(organisationId, 'meter-1', { periodStart: '2026-08-01', periodEnd: '2026-08-31' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('computes consumption and amount, and creates a linked Financial invoice when a tenant is given', async () => {
    metersRepo.findById.mockResolvedValue({ id: 'meter-1', unit_id: 'unit-1', unit_rate_kobo: '5000', meter_type: 'electricity' });
    readingsRepo.findLatestAsOf
      .mockResolvedValueOnce({ reading_value: '1000.000' }) // start-of-period reading
      .mockResolvedValueOnce({ reading_value: '1123.456' }); // end-of-period reading

    const result = await service.generate(organisationId, 'meter-1', {
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      tenantId: 'tenant-1',
    });

    // consumption = 1123.456 - 1000.000 = 123.456; amount = 5000 * 123.456 = 617280 (exact)
    expect(utilityInvoicesRepo.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ consumption: '123.456', amount_kobo: '617280' }),
    );
    expect(invoicesService.createInvoiceTx).toHaveBeenCalledWith(
      expect.anything(),
      organisationId,
      expect.objectContaining({
        unitId: 'unit-1',
        tenantId: 'tenant-1',
        invoiceType: 'utility',
        lineItems: [expect.objectContaining({ unitPriceKobo: '617280' })],
      }),
    );
    expect(utilityInvoicesRepo.update).toHaveBeenCalledWith(expect.anything(), organisationId, 'util-inv-1', {
      invoice_id: 'invoice-1',
    });
    expect(result.invoice_id).toBe('invoice-1');
  });

  it('does not create a Financial invoice for a bulk/reconciliation meter with no tenant', async () => {
    metersRepo.findById.mockResolvedValue({ id: 'meter-1', unit_id: null, unit_rate_kobo: '5000', meter_type: 'electricity' });
    readingsRepo.findLatestAsOf
      .mockResolvedValueOnce({ reading_value: '1000.000' })
      .mockResolvedValueOnce({ reading_value: '1123.456' });

    const result = await service.generate(organisationId, 'meter-1', { periodStart: '2026-08-01', periodEnd: '2026-08-31' });

    expect(invoicesService.createInvoiceTx).not.toHaveBeenCalled();
    expect(utilityInvoicesRepo.update).not.toHaveBeenCalled();
    expect(result.id).toBe('util-inv-1');
  });

  it('rejects when the computed consumption is negative', async () => {
    metersRepo.findById.mockResolvedValue({ id: 'meter-1', unit_rate_kobo: '5000', meter_type: 'electricity' });
    readingsRepo.findLatestAsOf
      .mockResolvedValueOnce({ reading_value: '1200.000' })
      .mockResolvedValueOnce({ reading_value: '1000.000' });

    await expect(
      service.generate(organisationId, 'meter-1', { periodStart: '2026-08-01', periodEnd: '2026-08-31' }),
    ).rejects.toThrow(BadRequestException);
  });
});
