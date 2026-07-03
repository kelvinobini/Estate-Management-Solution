import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, MeterReadingsTable } from '../../../database/kysely.types';

type NewMeterReading = Insertable<MeterReadingsTable>;

@Injectable()
export class MeterReadingsRepository {
  async create(db: Kysely<Database>, reading: NewMeterReading) {
    return db.insertInto('meter_readings').values(reading).returningAll().executeTakeFirstOrThrow();
  }

  async listForMeter(db: Kysely<Database>, organisationId: string, meterId: string) {
    return db
      .selectFrom('meter_readings')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('meter_id', '=', meterId)
      .orderBy('read_at', 'desc')
      .execute();
  }

  async findLatest(db: Kysely<Database>, organisationId: string, meterId: string) {
    return db
      .selectFrom('meter_readings')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('meter_id', '=', meterId)
      .orderBy('read_at', 'desc')
      .limit(1)
      .executeTakeFirst();
  }

  /** Last reading at or before `asOf` — used to find the reading nearest a billing period boundary. */
  async findLatestAsOf(db: Kysely<Database>, organisationId: string, meterId: string, asOf: Date) {
    return db
      .selectFrom('meter_readings')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('meter_id', '=', meterId)
      .where('read_at', '<=', asOf)
      .orderBy('read_at', 'desc')
      .limit(1)
      .executeTakeFirst();
  }
}
