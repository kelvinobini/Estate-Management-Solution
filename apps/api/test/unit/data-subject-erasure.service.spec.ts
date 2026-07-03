import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSubjectErasureService } from '../../src/modules/compliance/services/data-subject-erasure.service';

describe('DataSubjectErasureService.eraseTenant', () => {
  const organisationId = 'org-1';
  let db: any;
  let erasureRepo: any;
  let auditLogsService: any;
  let service: DataSubjectErasureService;

  beforeEach(() => {
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };
    erasureRepo = {
      findTenantById: jest.fn(),
      hasActiveLeaseInvolvement: jest.fn(),
      anonymizeTenant: jest.fn(),
      anonymizeUser: jest.fn(),
    };
    auditLogsService = { record: jest.fn() };
    service = new DataSubjectErasureService(db, erasureRepo, auditLogsService);
  });

  it('throws NotFoundException for a non-existent tenant', async () => {
    erasureRepo.findTenantById.mockResolvedValue(undefined);
    await expect(service.eraseTenant(organisationId, 'tenant-1', 'staff-1')).rejects.toThrow(NotFoundException);
  });

  it('refuses to erase a tenant with an active or draft lease', async () => {
    erasureRepo.findTenantById.mockResolvedValue({ id: 'tenant-1', user_id: null });
    erasureRepo.hasActiveLeaseInvolvement.mockResolvedValue(true);

    await expect(service.eraseTenant(organisationId, 'tenant-1', 'staff-1')).rejects.toThrow(BadRequestException);
    expect(erasureRepo.anonymizeTenant).not.toHaveBeenCalled();
  });

  it('anonymizes the tenant record when there is no active lease involvement', async () => {
    erasureRepo.findTenantById.mockResolvedValue({ id: 'tenant-1', user_id: null });
    erasureRepo.hasActiveLeaseInvolvement.mockResolvedValue(false);

    await service.eraseTenant(organisationId, 'tenant-1', 'staff-1');

    expect(erasureRepo.anonymizeTenant).toHaveBeenCalledWith(expect.anything(), organisationId, 'tenant-1');
    expect(erasureRepo.anonymizeUser).not.toHaveBeenCalled();
  });

  it('also anonymizes the linked user account when the tenant has a portal login', async () => {
    erasureRepo.findTenantById.mockResolvedValue({ id: 'tenant-1', user_id: 'user-1' });
    erasureRepo.hasActiveLeaseInvolvement.mockResolvedValue(false);

    await service.eraseTenant(organisationId, 'tenant-1', 'staff-1');

    expect(erasureRepo.anonymizeUser).toHaveBeenCalledWith(expect.anything(), organisationId, 'user-1');
  });

  it('records an audit log entry without leaking the erased PII', async () => {
    erasureRepo.findTenantById.mockResolvedValue({ id: 'tenant-1', user_id: 'user-1', full_name: 'Real Name', email: 'real@example.com' });
    erasureRepo.hasActiveLeaseInvolvement.mockResolvedValue(false);

    await service.eraseTenant(organisationId, 'tenant-1', 'staff-1');

    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        organisationId,
        actorUserId: 'staff-1',
        action: 'data_subject.erased',
        entityType: 'tenant',
        entityId: 'tenant-1',
      }),
    );
    const [callArgs] = auditLogsService.record.mock.calls[0];
    expect(JSON.stringify(callArgs.afterState)).not.toContain('Real Name');
    expect(JSON.stringify(callArgs.afterState)).not.toContain('real@example.com');
  });
});
