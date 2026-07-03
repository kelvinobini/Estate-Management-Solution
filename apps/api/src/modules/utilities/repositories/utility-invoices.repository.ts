import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { Database, UtilityInvoicesTable } from '../../../database/kysely.types';

type NewUtilityInvoice = Insertable<UtilityInvoicesTable>;
type UtilityInvoiceUpdate = Updateable<UtilityInvoicesTable>;

@Injectable()
export class UtilityInvoicesRepository {
  async create(db: Kysely<Database>, utilityInvoice: NewUtilityInvoice) {
    return db.insertInto('utility_invoices').values(utilityInvoice).returningAll().executeTakeFirstOrThrow();
  }

  async listForMeter(db: Kysely<Database>, organisationId: string, meterId: string) {
    return db
      .selectFrom('utility_invoices')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('meter_id', '=', meterId)
      .orderBy('period_start', 'desc')
      .execute();
  }

  async update(db: Kysely<Database>, organisationId: string, utilityInvoiceId: string, changes: UtilityInvoiceUpdate) {
    return db
      .updateTable('utility_invoices')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', utilityInvoiceId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
