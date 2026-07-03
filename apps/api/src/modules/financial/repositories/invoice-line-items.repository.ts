import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, InvoiceLineItemsTable } from '../../../database/kysely.types';

type NewLineItem = Insertable<InvoiceLineItemsTable>;

@Injectable()
export class InvoiceLineItemsRepository {
  async createMany(db: Kysely<Database>, items: NewLineItem[]) {
    if (items.length === 0) {
      return [];
    }
    return db.insertInto('invoice_line_items').values(items).returningAll().execute();
  }

  async listForInvoice(db: Kysely<Database>, organisationId: string, invoiceId: string) {
    return db
      .selectFrom('invoice_line_items')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('invoice_id', '=', invoiceId)
      .execute();
  }
}
