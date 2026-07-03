import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, GuardShiftsTable } from '../../../database/kysely.types';

type NewGuardShift = Insertable<GuardShiftsTable>;

@Injectable()
export class GuardShiftsRepository {
  async create(db: Kysely<Database>, shift: NewGuardShift) {
    return db.insertInto('guard_shifts').values(shift).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, shiftId: string) {
    return db
      .selectFrom('guard_shifts')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', shiftId)
      .executeTakeFirst();
  }

  async listForGuard(db: Kysely<Database>, organisationId: string, guardId: string) {
    return db
      .selectFrom('guard_shifts')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('guard_id', '=', guardId)
      .orderBy('shift_start', 'desc')
      .execute();
  }

  /** Overlap check: an existing shift for this guard overlaps [start, end) if it starts before end and ends after start. */
  async findOverlapping(db: Kysely<Database>, organisationId: string, guardId: string, start: Date, end: Date) {
    return db
      .selectFrom('guard_shifts')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('guard_id', '=', guardId)
      .where('shift_start', '<', end)
      .where('shift_end', '>', start)
      .execute();
  }
}
