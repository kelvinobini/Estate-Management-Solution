import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { AuditLogsTable, Database } from '../../../database/kysely.types';

type NewAuditLog = Insertable<AuditLogsTable>;

/** Insert + read only — the DB itself blocks UPDATE/DELETE on audit_logs (see db/schema.sql section 11), so there is no update/delete method here to match. */
@Injectable()
export class AuditLogsRepository {
  async create(db: Kysely<Database>, entry: NewAuditLog) {
    return db.insertInto('audit_logs').values(entry).returningAll().executeTakeFirstOrThrow();
  }

  async listForOrganisation(db: Kysely<Database>, organisationId: string, limit: number) {
    return db
      .selectFrom('audit_logs')
      .leftJoin('users', 'users.id', 'audit_logs.actor_user_id')
      .selectAll('audit_logs')
      .select('users.full_name as actor_name')
      .where('audit_logs.organisation_id', '=', organisationId)
      .orderBy('audit_logs.occurred_at', 'desc')
      .limit(limit)
      .execute();
  }

  async listForEntity(db: Kysely<Database>, organisationId: string, entityType: string, entityId: string) {
    return db
      .selectFrom('audit_logs')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('entity_type', '=', entityType)
      .where('entity_id', '=', entityId)
      .orderBy('occurred_at', 'desc')
      .execute();
  }
}
