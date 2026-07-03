import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { Database, MaintenanceSchedulesTable } from '../../../database/kysely.types';

type NewSchedule = Insertable<MaintenanceSchedulesTable>;
type ScheduleUpdate = Updateable<MaintenanceSchedulesTable>;

@Injectable()
export class MaintenanceSchedulesRepository {
  async create(db: Kysely<Database>, schedule: NewSchedule) {
    return db.insertInto('maintenance_schedules').values(schedule).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, scheduleId: string) {
    return db
      .selectFrom('maintenance_schedules')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', scheduleId)
      .executeTakeFirst();
  }

  async listForAsset(db: Kysely<Database>, organisationId: string, assetId: string) {
    return db
      .selectFrom('maintenance_schedules')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('asset_id', '=', assetId)
      .execute();
  }

  async listDue(db: Kysely<Database>, organisationId: string, asOf: Date) {
    return db
      .selectFrom('maintenance_schedules')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('next_due_at', '<=', asOf)
      .execute();
  }

  async update(db: Kysely<Database>, organisationId: string, scheduleId: string, changes: ScheduleUpdate) {
    return db
      .updateTable('maintenance_schedules')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', scheduleId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
