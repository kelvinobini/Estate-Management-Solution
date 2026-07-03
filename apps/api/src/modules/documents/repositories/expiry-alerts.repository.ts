import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, ExpiryAlertsTable } from '../../../database/kysely.types';

type NewExpiryAlert = Insertable<ExpiryAlertsTable>;

@Injectable()
export class ExpiryAlertsRepository {
  async create(db: Kysely<Database>, alert: NewExpiryAlert) {
    return db.insertInto('expiry_alerts').values(alert).returningAll().executeTakeFirstOrThrow();
  }

  async listForDocument(db: Kysely<Database>, organisationId: string, documentId: string) {
    return db
      .selectFrom('expiry_alerts')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('document_id', '=', documentId)
      .execute();
  }

  async listDue(db: Kysely<Database>, organisationId: string, asOf: Date) {
    return db
      .selectFrom('expiry_alerts')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('alert_date', '<=', asOf)
      .where('sent_at', 'is', null)
      .execute();
  }

  async markSent(db: Kysely<Database>, alertId: string) {
    return db.updateTable('expiry_alerts').set({ sent_at: new Date() }).where('id', '=', alertId).returningAll().executeTakeFirstOrThrow();
  }
}
