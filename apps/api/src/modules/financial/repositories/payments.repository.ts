import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, PaymentsTable } from '../../../database/kysely.types';

type NewPayment = Insertable<PaymentsTable>;

@Injectable()
export class PaymentsRepository {
  async create(db: Kysely<Database>, payment: NewPayment) {
    return db.insertInto('payments').values(payment).returningAll().executeTakeFirstOrThrow();
  }

  async findByGatewayReference(db: Kysely<Database>, gateway: string, reference: string) {
    return db
      .selectFrom('payments')
      .selectAll()
      .where('gateway', '=', gateway)
      .where('gateway_reference', '=', reference)
      .executeTakeFirst();
  }

  async markStatus(db: Kysely<Database>, paymentId: string, status: string, paidAt: Date | null) {
    return db
      .updateTable('payments')
      .set({ status, paid_at: paidAt })
      .where('id', '=', paymentId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async listForInvoice(db: Kysely<Database>, organisationId: string, invoiceId: string) {
    return db
      .selectFrom('payments')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('invoice_id', '=', invoiceId)
      .where('status', '=', 'successful')
      .execute();
  }
}
