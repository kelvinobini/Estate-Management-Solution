import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, ArrearsTable } from '../../../database/kysely.types';

type NewArrear = Insertable<ArrearsTable>;

@Injectable()
export class ArrearsRepository {
  async findByInvoice(db: Kysely<Database>, organisationId: string, invoiceId: string) {
    return db
      .selectFrom('arrears')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('invoice_id', '=', invoiceId)
      .executeTakeFirst();
  }

  async create(db: Kysely<Database>, arrear: NewArrear) {
    return db.insertInto('arrears').values(arrear).returningAll().executeTakeFirstOrThrow();
  }

  async updateOutstandingAndDays(
    db: Kysely<Database>,
    id: string,
    outstandingKobo: bigint,
    daysOverdue: number,
  ) {
    return db
      .updateTable('arrears')
      .set({ outstanding_kobo: outstandingKobo.toString(), days_overdue: daysOverdue })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async applyLateFee(db: Kysely<Database>, id: string, newLateFeeKobo: bigint) {
    return db
      .updateTable('arrears')
      .set({ late_fee_kobo: newLateFeeKobo.toString() })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async escalateStage(db: Kysely<Database>, id: string, stage: string) {
    return db
      .updateTable('arrears')
      .set({ recovery_stage: stage })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async listByTenant(db: Kysely<Database>, organisationId: string, tenantId: string) {
    return db
      .selectFrom('arrears')
      .innerJoin('invoices', 'invoices.id', 'arrears.invoice_id')
      .select([
        'arrears.id',
        'arrears.tenant_id',
        'arrears.invoice_id',
        'arrears.outstanding_kobo',
        'arrears.days_overdue',
        'arrears.late_fee_kobo',
        'arrears.recovery_stage',
        'invoices.invoice_number',
      ])
      .where('arrears.organisation_id', '=', organisationId)
      .where('arrears.tenant_id', '=', tenantId)
      .where('arrears.recovery_stage', '!=', 'resolved')
      .orderBy('arrears.days_overdue', 'desc')
      .execute();
  }
}
