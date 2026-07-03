import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, PatrolLogsTable } from '../../../database/kysely.types';

type NewPatrolLog = Insertable<PatrolLogsTable>;

@Injectable()
export class PatrolLogsRepository {
  async create(db: Kysely<Database>, log: NewPatrolLog) {
    return db.insertInto('patrol_logs').values(log).returningAll().executeTakeFirstOrThrow();
  }

  async listForShift(db: Kysely<Database>, organisationId: string, shiftId: string) {
    return db
      .selectFrom('patrol_logs')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('guard_shift_id', '=', shiftId)
      .orderBy('logged_at', 'asc')
      .execute();
  }
}
