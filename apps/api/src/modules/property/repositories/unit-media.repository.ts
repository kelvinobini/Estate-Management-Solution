import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, UnitMediaTable } from '../../../database/kysely.types';

type NewUnitMedia = Insertable<UnitMediaTable>;

@Injectable()
export class UnitMediaRepository {
  async create(db: Kysely<Database>, media: NewUnitMedia) {
    return db.insertInto('unit_media').values(media).returningAll().executeTakeFirstOrThrow();
  }

  async listForUnit(db: Kysely<Database>, organisationId: string, unitId: string) {
    return db
      .selectFrom('unit_media')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('unit_id', '=', unitId)
      .orderBy('sort_order', 'asc')
      .execute();
  }

  async delete(db: Kysely<Database>, organisationId: string, mediaId: string) {
    return db
      .deleteFrom('unit_media')
      .where('organisation_id', '=', organisationId)
      .where('id', '=', mediaId)
      .executeTakeFirstOrThrow();
  }
}
