import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { Database, DisputesTable } from '../../../database/kysely.types';

type NewDispute = Insertable<DisputesTable>;
type DisputeUpdate = Updateable<DisputesTable>;

@Injectable()
export class DisputesRepository {
  async create(db: Kysely<Database>, dispute: NewDispute) {
    return db.insertInto('disputes').values(dispute).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, disputeId: string) {
    return db.selectFrom('disputes').selectAll().where('organisation_id', '=', organisationId).where('id', '=', disputeId).executeTakeFirst();
  }

  async listForLease(db: Kysely<Database>, organisationId: string, leaseId: string) {
    return db
      .selectFrom('disputes')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('lease_id', '=', leaseId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async update(db: Kysely<Database>, organisationId: string, disputeId: string, changes: DisputeUpdate) {
    return db
      .updateTable('disputes')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', disputeId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
