import { ExpiryAlertsService } from '../../src/modules/documents/services/expiry-alerts.service';

describe('ExpiryAlertsService', () => {
  const organisationId = 'org-1';
  let db: any;
  let expiryAlertsRepo: any;
  let service: ExpiryAlertsService;

  beforeEach(() => {
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };
    expiryAlertsRepo = {
      create: jest.fn(async (_trx, alert) => ({ id: 'alert-1', ...alert })),
      listDue: jest.fn(async () => []),
      markSent: jest.fn(async (_trx, id) => ({ id, sent_at: new Date() })),
    };
    service = new ExpiryAlertsService(db, expiryAlertsRepo);
  });

  it('schedules a default alert 30 days before the expiry date', async () => {
    const fakeTrx = {} as any;
    await service.scheduleDefaultAlertTx(fakeTrx, organisationId, 'doc-1', new Date('2026-12-31T00:00:00Z'));

    expect(expiryAlertsRepo.create).toHaveBeenCalledWith(
      fakeTrx,
      expect.objectContaining({ organisation_id: organisationId, document_id: 'doc-1', channel: 'email' }),
    );
    const [, insertedAlert] = expiryAlertsRepo.create.mock.calls[0];
    expect(insertedAlert.alert_date.toISOString().slice(0, 10)).toBe('2026-12-01');
  });

  it('marks every due alert as sent', async () => {
    expiryAlertsRepo.listDue.mockResolvedValue([{ id: 'alert-1' }, { id: 'alert-2' }]);
    const results = await service.dispatchDueAlerts(organisationId);

    expect(expiryAlertsRepo.markSent).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
  });
});
