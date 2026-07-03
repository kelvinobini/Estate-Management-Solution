import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, PollOptionsTable } from '../../../database/kysely.types';

type NewPollOption = Insertable<PollOptionsTable>;

@Injectable()
export class PollOptionsRepository {
  async createMany(db: Kysely<Database>, options: NewPollOption[]) {
    return db.insertInto('poll_options').values(options).returningAll().execute();
  }

  async findById(db: Kysely<Database>, organisationId: string, optionId: string) {
    return db
      .selectFrom('poll_options')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', optionId)
      .executeTakeFirst();
  }

  async listForPoll(db: Kysely<Database>, organisationId: string, pollId: string) {
    return db.selectFrom('poll_options').selectAll().where('organisation_id', '=', organisationId).where('poll_id', '=', pollId).execute();
  }
}
