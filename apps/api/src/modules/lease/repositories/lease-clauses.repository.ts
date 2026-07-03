import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, LeaseClausesTable } from '../../../database/kysely.types';

type NewLeaseClause = Insertable<LeaseClausesTable>;

@Injectable()
export class LeaseClausesRepository {
  async create(db: Kysely<Database>, clause: NewLeaseClause) {
    return db.insertInto('lease_clauses').values(clause).returningAll().executeTakeFirstOrThrow();
  }

  async listForLease(db: Kysely<Database>, organisationId: string, leaseId: string) {
    return db
      .selectFrom('lease_clauses')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('lease_id', '=', leaseId)
      .execute();
  }
}
