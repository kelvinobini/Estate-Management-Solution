import { ComplaintsService } from '../../src/modules/community/services/complaints.service';

describe('ComplaintsService.create', () => {
  const organisationId = 'org-1';
  let db: any;
  let complaintsRepo: any;
  let service: ComplaintsService;

  beforeEach(() => {
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };
    complaintsRepo = { create: jest.fn(async (_trx, complaint) => ({ id: 'complaint-1', ...complaint })) };
    service = new ComplaintsService(db, complaintsRepo);
  });

  it('assigns a tight SLA window for a security complaint', async () => {
    const before = Date.now();
    const complaint = await service.create(organisationId, 'tenant-1', {
      tenantId: 'tenant-1',
      category: 'security',
      description: 'Gate left open overnight',
    });
    const slaDueAt = new Date(complaint.sla_due_at!).getTime();

    expect(slaDueAt - before).toBeGreaterThanOrEqual(4 * 60 * 60 * 1000 - 1000);
    expect(slaDueAt - before).toBeLessThan(4 * 60 * 60 * 1000 + 5000);
  });

  it('falls back to the default SLA window for an unlisted category', async () => {
    const before = Date.now();
    const complaint = await service.create(organisationId, 'tenant-1', {
      tenantId: 'tenant-1',
      category: 'parking',
      description: 'Blocked driveway',
    });
    const slaDueAt = new Date(complaint.sla_due_at!).getTime();

    expect(slaDueAt - before).toBeGreaterThanOrEqual(72 * 60 * 60 * 1000 - 1000);
    expect(slaDueAt - before).toBeLessThan(72 * 60 * 60 * 1000 + 5000);
  });

  it('stamps resolved_at when the status is set to resolved', async () => {
    complaintsRepo.findById = jest.fn(async () => ({ id: 'complaint-1' }));
    complaintsRepo.update = jest.fn(async (_trx, _orgId, id, changes) => ({ id, ...changes }));

    const result = await service.updateStatus(organisationId, 'complaint-1', { status: 'resolved' });
    expect(result.resolved_at).toBeInstanceOf(Date);
  });
});
