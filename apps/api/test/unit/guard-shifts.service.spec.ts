import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GuardShiftsService } from '../../src/modules/access/services/guard-shifts.service';

describe('GuardShiftsService.create', () => {
  const organisationId = 'org-1';
  let db: any;
  let guardsRepo: any;
  let shiftsRepo: any;
  let patrolLogsRepo: any;
  let service: GuardShiftsService;

  beforeEach(() => {
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };
    guardsRepo = { findById: jest.fn() };
    shiftsRepo = {
      findOverlapping: jest.fn(async () => []),
      create: jest.fn(async (_trx, shift) => ({ id: 'shift-1', ...shift })),
    };
    patrolLogsRepo = {};

    service = new GuardShiftsService(db, guardsRepo, shiftsRepo, patrolLogsRepo);
  });

  it('throws NotFoundException for a non-existent guard', async () => {
    guardsRepo.findById.mockResolvedValue(undefined);
    await expect(
      service.create(organisationId, 'guard-1', { shiftStart: '2026-08-01T08:00:00Z', shiftEnd: '2026-08-01T16:00:00Z' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects a shift that ends before or at its own start', async () => {
    guardsRepo.findById.mockResolvedValue({ id: 'guard-1' });
    await expect(
      service.create(organisationId, 'guard-1', { shiftStart: '2026-08-01T16:00:00Z', shiftEnd: '2026-08-01T08:00:00Z' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a shift that overlaps an existing shift for the same guard', async () => {
    guardsRepo.findById.mockResolvedValue({ id: 'guard-1' });
    shiftsRepo.findOverlapping.mockResolvedValue([{ id: 'existing-shift' }]);

    await expect(
      service.create(organisationId, 'guard-1', { shiftStart: '2026-08-01T08:00:00Z', shiftEnd: '2026-08-01T16:00:00Z' }),
    ).rejects.toThrow(BadRequestException);
    expect(shiftsRepo.create).not.toHaveBeenCalled();
  });

  it('creates a non-overlapping shift', async () => {
    guardsRepo.findById.mockResolvedValue({ id: 'guard-1' });

    const shift = await service.create(organisationId, 'guard-1', {
      shiftStart: '2026-08-01T08:00:00Z',
      shiftEnd: '2026-08-01T16:00:00Z',
    });

    expect(shift.id).toBe('shift-1');
    expect(shiftsRepo.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ organisation_id: organisationId, guard_id: 'guard-1' }),
    );
  });
});
