import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, sql } from 'kysely';
import { Database, PollVotesTable } from '../../../database/kysely.types';

type NewPollVote = Insertable<PollVotesTable>;

@Injectable()
export class PollVotesRepository {
  async create(db: Kysely<Database>, vote: NewPollVote) {
    return db.insertInto('poll_votes').values(vote).returningAll().executeTakeFirstOrThrow();
  }

  /**
   * Checks across every option of the poll, not just one option — the DB's
   * UNIQUE(poll_option_id, tenant_id) constraint alone would still let a
   * tenant vote for two different options in the same single-choice poll.
   */
  async findByPollAndTenant(db: Kysely<Database>, organisationId: string, pollId: string, tenantId: string) {
    return db
      .selectFrom('poll_votes')
      .innerJoin('poll_options', 'poll_options.id', 'poll_votes.poll_option_id')
      .selectAll('poll_votes')
      .where('poll_votes.organisation_id', '=', organisationId)
      .where('poll_options.poll_id', '=', pollId)
      .where('poll_votes.tenant_id', '=', tenantId)
      .executeTakeFirst();
  }

  /** Vote count per option for a poll, including options with zero votes. */
  async tallyForPoll(db: Kysely<Database>, organisationId: string, pollId: string) {
    return db
      .selectFrom('poll_options')
      .leftJoin('poll_votes', 'poll_votes.poll_option_id', 'poll_options.id')
      .select(['poll_options.id as poll_option_id', 'poll_options.option_text', sql<number>`count(poll_votes.id)`.as('vote_count')])
      .where('poll_options.organisation_id', '=', organisationId)
      .where('poll_options.poll_id', '=', pollId)
      .groupBy(['poll_options.id', 'poll_options.option_text'])
      .execute();
  }
}
