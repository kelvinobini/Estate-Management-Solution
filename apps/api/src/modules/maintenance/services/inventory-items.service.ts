import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { InventoryItemsRepository } from '../repositories/inventory-items.repository';
import { CreateInventoryItemDto } from '../dto/create-inventory-item.dto';
import { RestockInventoryDto } from '../dto/restock-inventory.dto';

@Injectable()
export class InventoryItemsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly inventoryRepo: InventoryItemsRepository,
  ) {}

  async create(organisationId: string, dto: CreateInventoryItemDto) {
    return this.db.withTenant(organisationId, (trx) =>
      this.inventoryRepo.create(trx, {
        organisation_id: organisationId,
        name: dto.name,
        sku: dto.sku ?? null,
        reorder_level: dto.reorderLevel ?? 0,
        unit_cost_kobo: dto.unitCostKobo ?? 0,
      }),
    );
  }

  async get(organisationId: string, itemId: string) {
    const item = await this.db.withTenant(organisationId, (trx) => this.inventoryRepo.findById(trx, organisationId, itemId));
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    return item;
  }

  async list(organisationId: string) {
    return this.db.withTenant(organisationId, (trx) => this.inventoryRepo.listForOrganisation(trx, organisationId));
  }

  async listBelowReorderLevel(organisationId: string) {
    return this.db.withTenant(organisationId, (trx) => this.inventoryRepo.listBelowReorderLevel(trx, organisationId));
  }

  async restock(organisationId: string, itemId: string, dto: RestockInventoryDto) {
    await this.get(organisationId, itemId);
    return this.db.withTenant(organisationId, (trx) => this.inventoryRepo.incrementStock(trx, organisationId, itemId, dto.quantity));
  }
}
