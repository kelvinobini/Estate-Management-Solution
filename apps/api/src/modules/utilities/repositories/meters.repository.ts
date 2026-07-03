import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, MetersTable } from '../../../database/kysely.types';

type NewMeter = Insertable<MetersTable>;

@Injectable()
export class MetersRepository {
  async create(db: Kysely<Database>, meter: NewMeter) {
    return db.insertInto('meters').values(meter).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, meterId: string) {
    return db.selectFrom('meters').selectAll().where('organisation_id', '=', organisationId).where('id', '=', meterId).executeTakeFirst();
  }

  async listForProperty(db: Kysely<Database>, organisationId: string, propertyId: string) {
    return db
      .selectFrom('meters')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('property_id', '=', propertyId)
      .execute();
  }

  async listForUnit(db: Kysely<Database>, organisationId: string, unitId: string) {
    return db.selectFrom('meters').selectAll().where('organisation_id', '=', organisationId).where('unit_id', '=', unitId).execute();
  }
}
