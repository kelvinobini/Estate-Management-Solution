import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, GuardsTable } from '../../../database/kysely.types';

type NewGuard = Insertable<GuardsTable>;

@Injectable()
export class GuardsRepository {
  async create(db: Kysely<Database>, guard: NewGuard) {
    return db.insertInto('guards').values(guard).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, guardId: string) {
    return db
      .selectFrom('guards')
      .innerJoin('users', 'users.id', 'guards.user_id')
      .selectAll('guards')
      .select(['users.full_name as user_full_name', 'users.email as user_email'])
      .where('guards.organisation_id', '=', organisationId)
      .where('guards.id', '=', guardId)
      .executeTakeFirst();
  }

  async listForProperty(db: Kysely<Database>, organisationId: string, propertyId: string) {
    return db
      .selectFrom('guards')
      .innerJoin('users', 'users.id', 'guards.user_id')
      .selectAll('guards')
      .select(['users.full_name as user_full_name', 'users.email as user_email'])
      .where('guards.organisation_id', '=', organisationId)
      .where('guards.property_id', '=', propertyId)
      .execute();
  }

  /** A guard can in principle be assigned to more than one property; callers that need "the" assignment (e.g. auto-filling an incident report) take the first. */
  async findByUserId(db: Kysely<Database>, organisationId: string, userId: string) {
    return db
      .selectFrom('guards')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('user_id', '=', userId)
      .orderBy('created_at', 'asc')
      .executeTakeFirst();
  }
}
