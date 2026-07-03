import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, FloorsTable } from '../../../database/kysely.types';

type NewFloor = Insertable<FloorsTable>;

@Injectable()
export class FloorsRepository {
  async create(db: Kysely<Database>, floor: NewFloor) {
    return db.insertInto('floors').values(floor).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, floorId: string) {
    return db
      .selectFrom('floors')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', floorId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async listForBlock(db: Kysely<Database>, organisationId: string, blockId: string) {
    return db
      .selectFrom('floors')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('block_id', '=', blockId)
      .where('deleted_at', 'is', null)
      .orderBy('level_number', 'asc')
      .execute();
  }
}
