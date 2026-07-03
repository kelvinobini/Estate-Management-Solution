import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { Database, UnitsTable } from '../../../database/kysely.types';

type NewUnit = Insertable<UnitsTable>;
type UnitUpdate = Updateable<UnitsTable>;

@Injectable()
export class UnitsRepository {
  async create(db: Kysely<Database>, unit: NewUnit) {
    return db.insertInto('units').values(unit).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, unitId: string) {
    return db
      .selectFrom('units')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', unitId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async listForFloor(db: Kysely<Database>, organisationId: string, floorId: string) {
    return db
      .selectFrom('units')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('floor_id', '=', floorId)
      .where('deleted_at', 'is', null)
      .orderBy('unit_code', 'asc')
      .execute();
  }

  async listByStatus(db: Kysely<Database>, organisationId: string, status: string) {
    return db
      .selectFrom('units')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('status', '=', status)
      .where('deleted_at', 'is', null)
      .execute();
  }

  async update(db: Kysely<Database>, organisationId: string, unitId: string, changes: UnitUpdate) {
    return db
      .updateTable('units')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', unitId)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateStatus(db: Kysely<Database>, organisationId: string, unitId: string, status: string) {
    return db
      .updateTable('units')
      .set({ status })
      .where('organisation_id', '=', organisationId)
      .where('id', '=', unitId)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async softDelete(db: Kysely<Database>, organisationId: string, unitId: string) {
    return db
      .updateTable('units')
      .set({ deleted_at: new Date() })
      .where('organisation_id', '=', organisationId)
      .where('id', '=', unitId)
      .executeTakeFirstOrThrow();
  }
}
