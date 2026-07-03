import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkOrdersService } from '../../src/modules/maintenance/services/work-orders.service';

describe('WorkOrdersService', () => {
  const organisationId = 'org-1';
  let db: any;
  let workOrdersRepo: any;
  let workOrderPartsRepo: any;
  let inventoryRepo: any;
  let service: WorkOrdersService;

  beforeEach(() => {
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };
    workOrdersRepo = {
      findById: jest.fn(),
      update: jest.fn(async (_trx, _orgId, _id, changes) => ({ id: 'wo-1', status: 'open', ...changes })),
      incrementCost: jest.fn(),
    };
    workOrderPartsRepo = { create: jest.fn(async (_trx, part) => part) };
    inventoryRepo = { findById: jest.fn(), decrementStock: jest.fn() };

    service = new WorkOrdersService(db, workOrdersRepo, workOrderPartsRepo, inventoryRepo);
  });

  describe('status transitions', () => {
    it.each([
      ['open', 'assigned'],
      ['open', 'cancelled'],
      ['assigned', 'in_progress'],
      ['assigned', 'cancelled'],
      ['in_progress', 'on_hold'],
      ['in_progress', 'closed'],
      ['in_progress', 'cancelled'],
      ['on_hold', 'in_progress'],
      ['on_hold', 'cancelled'],
    ])('allows %s -> %s', async (from, to) => {
      workOrdersRepo.findById.mockResolvedValue({ id: 'wo-1', status: from });
      const result = await service.updateStatus(organisationId, 'wo-1', to);
      expect(result.status).toBe(to);
    });

    it.each([
      ['open', 'closed'],
      ['open', 'in_progress'],
      ['closed', 'in_progress'],
      ['cancelled', 'assigned'],
    ])('rejects %s -> %s', async (from, to) => {
      workOrdersRepo.findById.mockResolvedValue({ id: 'wo-1', status: from });
      await expect(service.updateStatus(organisationId, 'wo-1', to)).rejects.toThrow(BadRequestException);
    });

    it('stamps closed_at when transitioning to closed', async () => {
      workOrdersRepo.findById.mockResolvedValue({ id: 'wo-1', status: 'in_progress' });
      await service.updateStatus(organisationId, 'wo-1', 'closed');
      expect(workOrdersRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        organisationId,
        'wo-1',
        expect.objectContaining({ status: 'closed', closed_at: expect.any(Date) }),
      );
    });

    it('throws NotFoundException for a non-existent work order', async () => {
      workOrdersRepo.findById.mockResolvedValue(undefined);
      await expect(service.updateStatus(organisationId, 'wo-1', 'assigned')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addPart', () => {
    beforeEach(() => {
      workOrdersRepo.findById.mockResolvedValue({ id: 'wo-1', status: 'in_progress' });
      inventoryRepo.findById.mockResolvedValue({ id: 'item-1', name: 'HVAC filter', quantity_on_hand: 10, unit_cost_kobo: '50000' });
    });

    it('decrements stock and accumulates cost onto the work order', async () => {
      inventoryRepo.decrementStock.mockResolvedValue({ id: 'item-1', quantity_on_hand: 7 });

      await service.addPart(organisationId, 'wo-1', { inventoryItemId: 'item-1', quantityUsed: 3 });

      expect(inventoryRepo.decrementStock).toHaveBeenCalledWith(expect.anything(), organisationId, 'item-1', 3);
      expect(workOrderPartsRepo.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ work_order_id: 'wo-1', inventory_item_id: 'item-1', quantity_used: 3, cost_kobo: '150000' }),
      );
      expect(workOrdersRepo.incrementCost).toHaveBeenCalledWith(expect.anything(), organisationId, 'wo-1', 150000n);
    });

    it('rejects when there is insufficient stock', async () => {
      inventoryRepo.decrementStock.mockResolvedValue(undefined); // repo's WHERE guard found insufficient stock

      await expect(service.addPart(organisationId, 'wo-1', { inventoryItemId: 'item-1', quantityUsed: 999 })).rejects.toThrow(
        BadRequestException,
      );
      expect(workOrderPartsRepo.create).not.toHaveBeenCalled();
      expect(workOrdersRepo.incrementCost).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a non-existent inventory item', async () => {
      inventoryRepo.findById.mockResolvedValue(undefined);
      await expect(service.addPart(organisationId, 'wo-1', { inventoryItemId: 'missing', quantityUsed: 1 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
