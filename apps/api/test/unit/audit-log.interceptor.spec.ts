import { firstValueFrom, of, throwError } from 'rxjs';
import { AuditLogInterceptor } from '../../src/modules/compliance/interceptors/audit-log.interceptor';

describe('AuditLogInterceptor', () => {
  let reflector: any;
  let auditLogsService: any;
  let interceptor: AuditLogInterceptor;

  const makeContext = (params: Record<string, string>, user: any) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ params, user, ip: '127.0.0.1', headers: { 'user-agent': 'jest-test' } }),
      }),
    }) as any;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    auditLogsService = { record: jest.fn() };
    interceptor = new AuditLogInterceptor(reflector, auditLogsService);
  });

  it('passes the result through untouched when there is no @AuditAction metadata', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = makeContext({ id: 'entity-1' }, { sub: 'user-1', organisation_id: 'org-1' });
    const next = { handle: () => of({ ok: true }) };

    const result = await firstValueFrom(interceptor.intercept(context, next) as any);

    expect(result).toEqual({ ok: true });
    expect(auditLogsService.record).not.toHaveBeenCalled();
  });

  it('records an audit log entry using the route param as entity id', async () => {
    reflector.getAllAndOverride.mockReturnValue({ action: 'lease.terminated', entityType: 'lease' });
    const context = makeContext({ id: 'lease-1' }, { sub: 'user-1', organisation_id: 'org-1' });
    const next = { handle: () => of({ status: 'terminated' }) };

    const result = await firstValueFrom(interceptor.intercept(context, next) as any);

    expect(result).toEqual({ status: 'terminated' });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        organisationId: 'org-1',
        actorUserId: 'user-1',
        action: 'lease.terminated',
        entityType: 'lease',
        entityId: 'lease-1',
        afterState: { status: 'terminated' },
        ipAddress: '127.0.0.1',
        userAgent: 'jest-test',
      }),
    );
  });

  it('does not fail the request if writing the audit log itself throws', async () => {
    reflector.getAllAndOverride.mockReturnValue({ action: 'invoice.voided', entityType: 'invoice' });
    auditLogsService.record.mockRejectedValue(new Error('db unavailable'));
    const context = makeContext({ id: 'invoice-1' }, { sub: 'user-1', organisation_id: 'org-1' });
    const next = { handle: () => of({ status: 'void' }) };

    const result = await firstValueFrom(interceptor.intercept(context, next) as any);
    expect(result).toEqual({ status: 'void' }); // the underlying action's result still comes through
  });

  it('never logs when the handler itself throws', async () => {
    reflector.getAllAndOverride.mockReturnValue({ action: 'invoice.voided', entityType: 'invoice' });
    const context = makeContext({ id: 'invoice-1' }, { sub: 'user-1', organisation_id: 'org-1' });
    const next = { handle: () => throwError(() => new Error('not found')) };

    await expect(firstValueFrom(interceptor.intercept(context, next) as any)).rejects.toThrow('not found');
    expect(auditLogsService.record).not.toHaveBeenCalled();
  });

  it('strips redactFields from after_state but still returns them in the HTTP response', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'user.invited',
      entityType: 'user',
      redactFields: ['temporaryPassword'],
    });
    const context = makeContext({}, { sub: 'user-1', organisation_id: 'org-1' });
    const next = { handle: () => of({ user: { id: 'user-2' }, temporaryPassword: 'super-secret-temp-pw' }) };

    const result = await firstValueFrom(interceptor.intercept(context, next) as any);

    expect(result).toEqual({ user: { id: 'user-2' }, temporaryPassword: 'super-secret-temp-pw' });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({ afterState: { user: { id: 'user-2' } } }),
    );
  });
});
