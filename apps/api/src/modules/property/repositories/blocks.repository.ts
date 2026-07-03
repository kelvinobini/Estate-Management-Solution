import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { BlocksTable, Database } from '../../../database/kysely.types';

type NewBlock = Insertable<BlocksTable>;

@Injectable()
export class BlocksRepository {
  async create(db: Kysely<Database>, block: NewBlock) {
    return db.insertInto('blocks').values(block).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, blockId: string) {
    return db
      .selectFrom('blocks')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', blockId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async listForProperty(db: Kysely<Database>, organisationId: string, propertyId: string) {
    return db
      .selectFrom('blocks')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('property_id', '=', propertyId)
      .where('deleted_at', 'is', null)
      .orderBy('name', 'asc')
      .execute();
  }
}
