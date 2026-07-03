import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { toKobo } from '../../../common/money.util';
import { TenantDatabaseService } from '../../../database/database.service';
import { WorkOrdersRepository } from '../repositories/work-orders.repository';
import { WorkOrderPartsRepository } from '../repositories/work-order-parts.repository';
import { InventoryItemsRepository } from '../repositories/inventory-items.repository';
import { CreateWorkOrderDto } from '../dto/create-work-order.dto';
import { AssignWorkOrderDto } from '../dto/assign-work-order.dto';
import { AddWorkOrderPartDto } from '../dto/add-work-order-part.dto';

/** Valid next statuses per current work order status. Closed/cancelled are terminal. */
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['on_hold', 'closed', 'cancelled'],
  on_hold: ['in_progress', 'cancelled'],
};

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly workOrdersRepo: WorkOrdersRepository,
    private readonly workOrderPartsRepo: WorkOrderPartsRepository,
    private readonly inventoryRepo: InventoryItemsRepository,
  ) {}

  /** `raisedByUserId` is null for system-generated work orders (e.g. the preventive-maintenance job). */
  async create(organisationId: string, raisedByUserId: string | null, propertyId: string, dto: CreateWorkOrderDto) {
    return this.db.withTenant(organisationId, (trx) =>
      this.workOrdersRepo.create(trx, {
        organisation_id: organisationId,
        property_id: propertyId,
        unit_id: dto.unitId ?? null,
        asset_id: dto.assetId ?? null,
        raised_by_user_id: raisedByUserId,
        title: dto.title,
        description: dto.description ?? null,
        priority: dto.priority ?? 'medium',
        cost_kobo: 0,
      }),
    );
  }

  async get(organisationId: string, workOrderId: string) {
    const workOrder = await this.db.withTenant(organisationId, (trx) => this.workOrdersRepo.findById(trx, organisationId, workOrderId));
    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }
    return workOrder;
  }

  async listForProperty(organisationId: string, propertyId: string) {
    return this.db.withTenant(organisationId, (trx) => this.workOrdersRepo.listForProperty(trx, organisationId, propertyId));
  }

  /**
   * `filters.raisedByUserId` scopes a Tenant-role caller to work orders they raised.
   * `filters.assignedUserId` scopes a MaintenanceStaff-role caller to jobs assigned to them.
   * `filters.propertyIds` scopes a Landlord-role caller to properties they own — an empty
   * array (owns nothing) short-circuits without hitting the database.
   */
  async listByStatus(
    organisationId: string,
    status: string,
    filters: { raisedByUserId?: string; assignedUserId?: string; propertyIds?: string[] },
    options: { page: number; pageSize: number },
  ) {
    const pageSize = Math.min(Math.max(options.pageSize, 1), 100);
    const page = Math.max(options.page, 1);
    if (filters.propertyIds && filters.propertyIds.length === 0) {
      return { rows: [], total: 0, page, pageSize };
    }
    const { rows, total } = await this.db.withTenant(organisationId, (trx) =>
      this.workOrdersRepo.listByStatus(trx, organisationId, status, filters, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    );
    return { rows, total, page, pageSize };
  }

  async assign(organisationId: string, workOrderId: string, dto: AssignWorkOrderDto) {
    if (!dto.vendorId && !dto.userId) {
      throw new BadRequestException('vendorId or userId is required');
    }
    return this.transition(organisationId, workOrderId, 'assigned', (trx, workOrder) =>
      this.workOrdersRepo.update(trx, organisationId, workOrder.id, {
        status: 'assigned',
        assigned_vendor_id: dto.vendorId ?? null,
        assigned_user_id: dto.userId ?? null,
      }),
    );
  }

  async updateStatus(organisationId: string, workOrderId: string, targetStatus: string) {
    return this.transition(organisationId, workOrderId, targetStatus, (trx, workOrder) =>
      this.workOrdersRepo.update(trx, organisationId, workOrder.id, {
        status: targetStatus,
        ...(targetStatus === 'closed' && { closed_at: new Date() }),
      }),
    );
  }

  /**
   * Records parts consumed on a work order: atomically decrements inventory
   * (rejecting if stock is insufficient), then accumulates the parts' cost
   * onto the work order's running total.
   */
  async addPart(organisationId: string, workOrderId: string, dto: AddWorkOrderPartDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const workOrder = await this.workOrdersRepo.findById(trx, organisationId, workOrderId);
      if (!workOrder) {
        throw new NotFoundException('Work order not found');
      }

      const item = await this.inventoryRepo.findById(trx, organisationId, dto.inventoryItemId);
      if (!item) {
        throw new NotFoundException('Inventory item not found');
      }

      const decremented = await this.inventoryRepo.decrementStock(trx, organisationId, dto.inventoryItemId, dto.quantityUsed);
      if (!decremented) {
        throw new BadRequestException(`Insufficient stock for '${item.name}' (have ${item.quantity_on_hand}, need ${dto.quantityUsed})`);
      }

      const partCostKobo = toKobo(item.unit_cost_kobo) * BigInt(dto.quantityUsed);

      const part = await this.workOrderPartsRepo.create(trx, {
        work_order_id: workOrderId,
        inventory_item_id: dto.inventoryItemId,
        quantity_used: dto.quantityUsed,
        cost_kobo: partCostKobo.toString(),
      });

      await this.workOrdersRepo.incrementCost(trx, organisationId, workOrderId, partCostKobo);

      return part;
    });
  }

  async listParts(organisationId: string, workOrderId: string) {
    await this.get(organisationId, workOrderId);
    return this.db.withTenant(organisationId, (_trx) => this.workOrderPartsRepo.listForWorkOrder(_trx, workOrderId));
  }

  private async transition<T>(
    organisationId: string,
    workOrderId: string,
    targetStatus: string,
    work: (trx: Parameters<WorkOrdersRepository['update']>[0], workOrder: NonNullable<Awaited<ReturnType<WorkOrdersRepository['findById']>>>) => Promise<T>,
  ): Promise<T> {
    return this.db.withTenant(organisationId, async (trx) => {
      const workOrder = await this.workOrdersRepo.findById(trx, organisationId, workOrderId);
      if (!workOrder) {
        throw new NotFoundException('Work order not found');
      }

      const allowedNext = ALLOWED_STATUS_TRANSITIONS[workOrder.status] ?? [];
      if (!allowedNext.includes(targetStatus)) {
        throw new BadRequestException(`Cannot transition work order from '${workOrder.status}' to '${targetStatus}'`);
      }

      return work(trx, workOrder);
    });
  }
}
