import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, InvoicesTable } from '../../../database/kysely.types';

type NewInvoice = Insertable<InvoicesTable>;

@Injectable()
export class InvoicesRepository {
  async create(db: Kysely<Database>, invoice: NewInvoice) {
    return db.insertInto('invoices').values(invoice).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, invoiceId: string) {
    return db
      .selectFrom('invoices')
      .leftJoin('tenants', 'tenants.id', 'invoices.tenant_id')
      .selectAll('invoices')
      .select('tenants.full_name as tenant_name')
      .where('invoices.organisation_id', '=', organisationId)
      .where('invoices.id', '=', invoiceId)
      .where('invoices.deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async listForTenant(db: Kysely<Database>, organisationId: string, tenantId: string) {
    return db
      .selectFrom('invoices')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('tenant_id', '=', tenantId)
      .where('deleted_at', 'is', null)
      .orderBy('due_date', 'desc')
      .execute();
  }

  /** Org-wide, paginated listing for staff-facing screens (e.g. the finance team's invoice register). */
  async listForOrganisation(
    db: Kysely<Database>,
    organisationId: string,
    options: { status?: string; limit: number; offset: number },
  ) {
    let query = db
      .selectFrom('invoices')
      .leftJoin('tenants', 'tenants.id', 'invoices.tenant_id')
      .selectAll('invoices')
      .select('tenants.full_name as tenant_name')
      .where('invoices.organisation_id', '=', organisationId)
      .where('invoices.deleted_at', 'is', null);

    if (options.status) {
      query = query.where('invoices.status', '=', options.status);
    }

    const [rows, { count }] = await Promise.all([
      query.orderBy('invoices.due_date', 'desc').limit(options.limit).offset(options.offset).execute(),
      this.countForOrganisation(db, organisationId, options.status),
    ]);

    return { rows, total: Number(count) };
  }

  private async countForOrganisation(db: Kysely<Database>, organisationId: string, status?: string) {
    let query = db
      .selectFrom('invoices')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('organisation_id', '=', organisationId)
      .where('deleted_at', 'is', null);

    if (status) {
      query = query.where('status', '=', status);
    }

    return query.executeTakeFirstOrThrow();
  }

  /**
   * Paginated invoice listing scoped to the properties a landlord owns, via
   * invoices.unit_id -> units -> floors -> blocks -> property_owners. Invoices
   * with no unit_id (org-level charges) can't be attributed to any property,
   * so they're excluded rather than shown to every landlord.
   */
  async listForOwner(
    db: Kysely<Database>,
    organisationId: string,
    ownerUserId: string,
    options: { status?: string; limit: number; offset: number },
  ) {
    let query = db
      .selectFrom('invoices')
      .innerJoin('units', 'units.id', 'invoices.unit_id')
      .innerJoin('floors', 'floors.id', 'units.floor_id')
      .innerJoin('blocks', 'blocks.id', 'floors.block_id')
      .innerJoin('property_owners', 'property_owners.property_id', 'blocks.property_id')
      .innerJoin('properties', 'properties.id', 'blocks.property_id')
      .leftJoin('tenants', 'tenants.id', 'invoices.tenant_id')
      .selectAll('invoices')
      .select(['tenants.full_name as tenant_name', 'properties.id as property_id', 'properties.name as property_name'])
      .where('invoices.organisation_id', '=', organisationId)
      .where('invoices.deleted_at', 'is', null)
      .where('property_owners.user_id', '=', ownerUserId);

    if (options.status) {
      query = query.where('invoices.status', '=', options.status);
    }

    const [rows, { count }] = await Promise.all([
      query.orderBy('invoices.due_date', 'desc').limit(options.limit).offset(options.offset).execute(),
      this.countForOwner(db, organisationId, ownerUserId, options.status),
    ]);

    return { rows, total: Number(count) };
  }

  private async countForOwner(db: Kysely<Database>, organisationId: string, ownerUserId: string, status?: string) {
    let query = db
      .selectFrom('invoices')
      .innerJoin('units', 'units.id', 'invoices.unit_id')
      .innerJoin('floors', 'floors.id', 'units.floor_id')
      .innerJoin('blocks', 'blocks.id', 'floors.block_id')
      .innerJoin('property_owners', 'property_owners.property_id', 'blocks.property_id')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('invoices.organisation_id', '=', organisationId)
      .where('invoices.deleted_at', 'is', null)
      .where('property_owners.user_id', '=', ownerUserId);

    if (status) {
      query = query.where('invoices.status', '=', status);
    }

    return query.executeTakeFirstOrThrow();
  }

  async listOverdue(db: Kysely<Database>, organisationId: string, asOf: Date) {
    return db
      .selectFrom('invoices')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('status', 'in', ['issued', 'partially_paid'])
      .where('due_date', '<', asOf)
      .where('deleted_at', 'is', null)
      .execute();
  }

  async markIssued(db: Kysely<Database>, organisationId: string, invoiceId: string) {
    return db
      .updateTable('invoices')
      .set({ status: 'issued', issued_at: new Date() })
      .where('organisation_id', '=', organisationId)
      .where('id', '=', invoiceId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async markVoid(db: Kysely<Database>, organisationId: string, invoiceId: string) {
    return db
      .updateTable('invoices')
      .set({ status: 'void' })
      .where('organisation_id', '=', organisationId)
      .where('id', '=', invoiceId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async applyPayment(
    db: Kysely<Database>,
    organisationId: string,
    invoiceId: string,
    newAmountPaidKobo: bigint,
    newStatus: 'partially_paid' | 'paid',
  ) {
    return db
      .updateTable('invoices')
      .set({ amount_paid_kobo: newAmountPaidKobo.toString(), status: newStatus })
      .where('organisation_id', '=', organisationId)
      .where('id', '=', invoiceId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async markOverdue(db: Kysely<Database>, organisationId: string, invoiceId: string) {
    return db
      .updateTable('invoices')
      .set({ status: 'overdue' })
      .where('organisation_id', '=', organisationId)
      .where('id', '=', invoiceId)
      .execute();
  }
}
