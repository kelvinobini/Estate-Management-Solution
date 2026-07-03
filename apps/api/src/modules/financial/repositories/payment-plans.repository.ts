import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, PaymentPlansTable } from '../../../database/kysely.types';

type NewInstallment = Omit<Insertable<PaymentPlansTable>, 'status'>;

@Injectable()
export class PaymentPlansRepository {
  async createMany(db: Kysely<Database>, installments: NewInstallment[]) {
    return db.insertInto('payment_plans').values(installments).returningAll().execute();
  }

  async listForInvoice(db: Kysely<Database>, organisationId: string, invoiceId: string) {
    return db
      .selectFrom('payment_plans')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('invoice_id', '=', invoiceId)
      .orderBy('installment_number', 'asc')
      .execute();
  }

  async markInstallmentPaid(db: Kysely<Database>, installmentId: string) {
    return db
      .updateTable('payment_plans')
      .set({ status: 'paid' })
      .where('id', '=', installmentId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async markOverdueInstallments(db: Kysely<Database>, organisationId: string, asOf: Date) {
    return db
      .updateTable('payment_plans')
      .set({ status: 'overdue' })
      .where('organisation_id', '=', organisationId)
      .where('status', '=', 'pending')
      .where('due_date', '<', asOf)
      .execute();
  }
}
