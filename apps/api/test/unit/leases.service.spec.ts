import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeasesService } from '../../src/modules/lease/services/leases.service';
import { LeaseEvent } from '../../src/common/events/lease.events';

describe('LeasesService', () => {
  const organisationId = 'org-1';
  let db: any;
  let leasesRepo: any;
  let leaseTenantsRepo: any;
  let leaseClausesRepo: any;
  let events: any;
  let service: LeasesService;

  beforeEach(() => {
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };
    leasesRepo = {
      create: jest.fn(async (_trx, lease) => ({ id: 'lease-1', ...lease })),
      findById: jest.fn(),
      update: jest.fn(async (_trx, _orgId, _id, changes) => ({
        id: 'lease-1',
        unit_id: 'unit-1',
        primary_tenant_id: 'tenant-1',
        rent_amount_kobo: '100000',
        rent_frequency: 'monthly',
        start_date: '2026-08-01',
        escalation_percent: null,
        ...changes,
      })),
      listExpiring: jest.fn(),
    };
    leaseTenantsRepo = { add: jest.fn(async (_trx, row) => row) };
    leaseClausesRepo = { create: jest.fn() };
    events = { emit: jest.fn() };

    service = new LeasesService(db, leasesRepo, leaseTenantsRepo, leaseClausesRepo, events);
  });

  it('creates a lease and registers the primary tenant as a 100%-liable co-tenant', async () => {
    await service.create(organisationId, {
      unitId: 'unit-1',
      primaryTenantId: 'tenant-1',
      startDate: '2026-08-01',
      endDate: '2027-08-01',
      rentAmountKobo: '1200000',
      rentFrequency: 'annual',
    });

    expect(leaseTenantsRepo.add).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lease_id: 'lease-1', tenant_id: 'tenant-1', is_primary: true, liability_share_percent: 100 }),
    );
  });

  it('rejects activating a lease that does not exist', async () => {
    leasesRepo.findById.mockResolvedValue(undefined);
    await expect(service.activate(organisationId, 'lease-1', {})).rejects.toThrow(NotFoundException);
  });

  it('activates a draft lease and emits lease.signed with the info Financial/Property need', async () => {
    leasesRepo.findById.mockResolvedValue({ id: 'lease-1', status: 'draft' });

    await service.activate(organisationId, 'lease-1', { esignatureProvider: 'DocuSign' });

    expect(events.emit).toHaveBeenCalledWith(
      LeaseEvent.Signed,
      expect.objectContaining({
        organisationId,
        leaseId: 'lease-1',
        unitId: 'unit-1',
        tenantId: 'tenant-1',
        rentAmountKobo: '100000',
        rentFrequency: 'monthly',
      }),
    );
  });

  it('rejects activating a lease that is already terminated', async () => {
    leasesRepo.findById.mockResolvedValue({ id: 'lease-1', status: 'terminated' });
    await expect(service.activate(organisationId, 'lease-1', {})).rejects.toThrow(BadRequestException);
  });

  it('applies the escalation percent when renewing', async () => {
    leasesRepo.findById.mockResolvedValue({
      id: 'lease-1',
      status: 'active',
      rent_amount_kobo: '100000',
      escalation_percent: '10',
    });

    await service.renew(organisationId, 'lease-1', { newEndDate: '2028-08-01' });

    expect(leasesRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      organisationId,
      'lease-1',
      expect.objectContaining({ status: 'renewed', end_date: '2028-08-01', rent_amount_kobo: '110000' }),
    );
  });

  it('leaves rent unchanged on renewal when there is no escalation clause', async () => {
    leasesRepo.findById.mockResolvedValue({ id: 'lease-1', status: 'active', rent_amount_kobo: '100000', escalation_percent: null });

    await service.renew(organisationId, 'lease-1', { newEndDate: '2028-08-01' });

    const [, , , changes] = leasesRepo.update.mock.calls[0];
    expect(changes).not.toHaveProperty('rent_amount_kobo');
  });

  it('terminates an active lease and emits lease.terminated', async () => {
    leasesRepo.findById.mockResolvedValue({ id: 'lease-1', status: 'active', unit_id: 'unit-1' });

    await service.terminate(organisationId, 'lease-1', { reason: 'Tenant requested early exit' });

    expect(events.emit).toHaveBeenCalledWith(
      LeaseEvent.Terminated,
      expect.objectContaining({ leaseId: 'lease-1', unitId: 'unit-1', reason: 'terminated' }),
    );
  });

  it('marks overdue active/renewed leases as expired and emits lease.expired for each', async () => {
    leasesRepo.listExpiring.mockResolvedValue([{ id: 'lease-1', unit_id: 'unit-1', status: 'active' }]);

    const result = await service.markExpiredLeases(organisationId);

    expect(result).toHaveLength(1);
    expect(events.emit).toHaveBeenCalledWith(
      LeaseEvent.Expired,
      expect.objectContaining({ leaseId: 'lease-1', unitId: 'unit-1', reason: 'expired' }),
    );
  });
});
