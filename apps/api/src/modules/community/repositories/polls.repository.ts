import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, PollsTable } from '../../../database/kysely.types';

type NewPoll = Insertable<PollsTable>;

@Injectable()
export class PollsRepository {
  async create(db: Kysely<Database>, poll: NewPoll) {
    return db.insertInto('polls').values(poll).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, pollId: string) {
    return db.selectFrom('polls').selectAll().where('organisation_id', '=', organisationId).where('id', '=', pollId).executeTakeFirst();
  }

  async listForProperty(db: Kysely<Database>, organisationId: string, propertyId: string) {
    return db
      .selectFrom('polls')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('property_id', '=', propertyId)
      .orderBy('opens_at', 'desc')
      .execute();
  }
}
