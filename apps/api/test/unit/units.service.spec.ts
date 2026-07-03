import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UnitsService } from '../../src/modules/property/services/units.service';

describe('UnitsService.updateStatus', () => {
  const organisationId = 'org-1';
  let db: any;
  let floorsRepo: any;
  let blocksRepo: any;
  let unitsRepo: any;
  let unitMediaRepo: any;
  let events: any;
  let service: UnitsService;

  beforeEach(() => {
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };
    floorsRepo = { findById: jest.fn() };
    blocksRepo = { findById: jest.fn() };
    unitsRepo = {
      findById: jest.fn(),
      updateStatus: jest.fn(async (_trx: unknown, _orgId: string, _id: string, status: string) => ({
        id: 'unit-1',
        status,
      })),
    };
    unitMediaRepo = {};
    events = { emit: jest.fn() };

    service = new UnitsService(db, floorsRepo, blocksRepo, unitsRepo, unitMediaRepo, events);
  });

  it('throws NotFoundException when the unit does not exist', async () => {
    unitsRepo.findById.mockResolvedValue(undefined);
    await expect(service.updateStatus(organisationId, 'unit-1', 'occupied')).rejects.toThrow(NotFoundException);
  });

  it('treats setting the same status as a no-op', async () => {
    unitsRepo.findById.mockResolvedValue({ id: 'unit-1', status: 'vacant' });
    const result = await service.updateStatus(organisationId, 'unit-1', 'vacant');
    expect(result).toEqual({ id: 'unit-1', status: 'vacant' });
    expect(unitsRepo.updateStatus).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it.each([
    ['vacant', 'reserved'],
    ['vacant', 'occupied'],
    ['vacant', 'under_maintenance'],
    ['reserved', 'occupied'],
    ['reserved', 'vacant'],
    ['occupied', 'vacant'],
    ['occupied', 'under_maintenance'],
    ['under_maintenance', 'vacant'],
    ['under_maintenance', 'occupied'],
  ])('allows %s -> %s', async (from, to) => {
    unitsRepo.findById.mockResolvedValue({ id: 'unit-1', status: from });
    const result = await service.updateStatus(organisationId, 'unit-1', to);
    expect(result).toEqual({ id: 'unit-1', status: to });
    expect(events.emit).toHaveBeenCalledWith('unit.status_changed', expect.objectContaining({ from, to }));
  });

  it.each([
    ['occupied', 'reserved'],
    ['reserved', 'under_maintenance'],
    ['under_maintenance', 'reserved'],
  ])('rejects %s -> %s', async (from, to) => {
    unitsRepo.findById.mockResolvedValue({ id: 'unit-1', status: from });
    await expect(service.updateStatus(organisationId, 'unit-1', to)).rejects.toThrow(BadRequestException);
    expect(unitsRepo.updateStatus).not.toHaveBeenCalled();
  });
});
