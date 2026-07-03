import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { Database, InventoryItemsTable } from '../../../database/kysely.types';

type NewInventoryItem = Insertable<InventoryItemsTable>;
type InventoryItemUpdate = Updateable<InventoryItemsTable>;

@Injectable()
export class InventoryItemsRepository {
  async create(db: Kysely<Database>, item: NewInventoryItem) {
    return db.insertInto('inventory_items').values(item).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, itemId: string) {
    return db
      .selectFrom('inventory_items')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', itemId)
      .executeTakeFirst();
  }

  async listForOrganisation(db: Kysely<Database>, organisationId: string) {
    return db.selectFrom('inventory_items').selectAll().where('organisation_id', '=', organisationId).orderBy('name', 'asc').execute();
  }

  async listBelowReorderLevel(db: Kysely<Database>, organisationId: string) {
    return db
      .selectFrom('inventory_items')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .whereRef('quantity_on_hand', '<=', 'reorder_level')
      .execute();
  }

  async update(db: Kysely<Database>, organisationId: string, itemId: string, changes: InventoryItemUpdate) {
    return db
      .updateTable('inventory_items')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', itemId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async decrementStock(db: Kysely<Database>, organisationId: string, itemId: string, quantity: number) {
    return db
      .updateTable('inventory_items')
      .set((eb) => ({ quantity_on_hand: eb('quantity_on_hand', '-', quantity) }))
      .where('organisation_id', '=', organisationId)
      .where('id', '=', itemId)
      .where('quantity_on_hand', '>=', quantity)
      .returningAll()
      .executeTakeFirst();
  }

  async incrementStock(db: Kysely<Database>, organisationId: string, itemId: string, quantity: number) {
    return db
      .updateTable('inventory_items')
      .set((eb) => ({ quantity_on_hand: eb('quantity_on_hand', '+', quantity) }))
      .where('organisation_id', '=', organisationId)
      .where('id', '=', itemId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
