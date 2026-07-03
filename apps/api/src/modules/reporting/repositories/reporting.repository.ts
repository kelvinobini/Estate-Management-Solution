import { Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { Database } from '../../../database/kysely.types';

/**
 * Purely read-only aggregate queries over tables owned by other modules
 * (Property, Lease, Financial, Maintenance). This is the CQRS "read side"
 * described in docs/01-architecture.md section 1 — implemented here as
 * direct Postgres aggregations rather than a separate Elasticsearch
 * projection, since there's no event-sourced read-model pipeline built yet
 * to keep an external index in sync. Revisit if/when portfolio scale makes
 * these queries too slow for the primary transactional database.
 */
@Injectable()
export class ReportingRepository {
  async occupancyByStatus(db: Kysely<Database>, organisationId: string, propertyId?: string) {
    let query = db
      .selectFrom('units')
      .innerJoin('floors', 'floors.id', 'units.floor_id')
      .innerJoin('blocks', 'blocks.id', 'floors.block_id')
      .select(['units.status', sql<number>`count(*)`.as('unit_count')])
      .where('units.organisation_id', '=', organisationId)
      .where('units.deleted_at', 'is', null)
      .groupBy('units.status');

    if (propertyId) {
      query = query.where('blocks.property_id', '=', propertyId);
    }

    return query.execute();
  }

  /** Sum of successful payments in [periodStart, periodEnd), optionally scoped to one property (via the invoice's unit). */
  async totalRevenueKobo(db: Kysely<Database>, organisationId: string, propertyId: string | undefined, periodStart: Date, periodEnd: Date) {
    let query = db
      .selectFrom('payments')
      .innerJoin('invoices', 'invoices.id', 'payments.invoice_id')
      .select(sql<string>`coalesce(sum(payments.amount_kobo), 0)`.as('total_kobo'))
      .where('payments.organisation_id', '=', organisationId)
      .where('payments.status', '=', 'successful')
      .where('payments.paid_at', '>=', periodStart)
      .where('payments.paid_at', '<', periodEnd);

    if (propertyId) {
      query = query
        .innerJoin('units', 'units.id', 'invoices.unit_id')
        .innerJoin('floors', 'floors.id', 'units.floor_id')
        .innerJoin('blocks', 'blocks.id', 'floors.block_id')
        .where('blocks.property_id', '=', propertyId);
    }

    return query.executeTakeFirstOrThrow();
  }

  /** Total maintenance (work order) cost — work_orders already carries property_id directly, no join needed. */
  async totalMaintenanceCostKobo(db: Kysely<Database>, organisationId: string, propertyId?: string) {
    let query = db
      .selectFrom('work_orders')
      .select(sql<string>`coalesce(sum(cost_kobo), 0)`.as('total_kobo'))
      .where('organisation_id', '=', organisationId);

    if (propertyId) {
      query = query.where('property_id', '=', propertyId);
    }

    return query.executeTakeFirstOrThrow();
  }

  /** Total floor area for a property, used to express maintenance cost per sqm. */
  async totalUnitAreaSqm(db: Kysely<Database>, organisationId: string, propertyId: string) {
    return db
      .selectFrom('units')
      .innerJoin('floors', 'floors.id', 'units.floor_id')
      .innerJoin('blocks', 'blocks.id', 'floors.block_id')
      .select(sql<string>`coalesce(sum(units.size_sqm), 0)`.as('total_sqm'))
      .where('units.organisation_id', '=', organisationId)
      .where('blocks.property_id', '=', propertyId)
      .where('units.deleted_at', 'is', null)
      .executeTakeFirstOrThrow();
  }

  /** Outstanding arrears grouped by recovery stage — the "aged debtors" report. */
  async agedDebtors(db: Kysely<Database>, organisationId: string) {
    return db
      .selectFrom('arrears')
      .select(['recovery_stage', sql<string>`coalesce(sum(outstanding_kobo), 0)`.as('total_outstanding_kobo'), sql<number>`count(*)`.as('count')])
      .where('organisation_id', '=', organisationId)
      .where('recovery_stage', '!=', 'resolved')
      .groupBy('recovery_stage')
      .execute();
  }

  /** Rent roll: every active/renewed lease with its unit and tenant. */
  async rentRoll(db: Kysely<Database>, organisationId: string, propertyId?: string) {
    let query = db
      .selectFrom('leases')
      .innerJoin('units', 'units.id', 'leases.unit_id')
      .innerJoin('floors', 'floors.id', 'units.floor_id')
      .innerJoin('blocks', 'blocks.id', 'floors.block_id')
      .innerJoin('tenants', 'tenants.id', 'leases.primary_tenant_id')
      .select([
        'leases.id as lease_id',
        'units.unit_code',
        'tenants.full_name as tenant_name',
        'leases.rent_amount_kobo',
        'leases.rent_frequency',
        'leases.start_date',
        'leases.end_date',
      ])
      .where('leases.organisation_id', '=', organisationId)
      .where('leases.status', 'in', ['active', 'renewed'])
      .where('leases.deleted_at', 'is', null);

    if (propertyId) {
      query = query.where('blocks.property_id', '=', propertyId);
    }

    return query.orderBy('units.unit_code', 'asc').execute();
  }

  /**
   * Average gap, in days, between one lease ending (terminated_at, or
   * end_date if never explicitly terminated) and the next lease on the same
   * unit starting — an approximation of "average days-to-let" using a
   * window function, since there's no dedicated vacancy-start event log.
   */
  async averageDaysToLet(db: Kysely<Database>, organisationId: string, propertyId?: string) {
    const propertyFilter = propertyId ? sql`AND b.property_id = ${propertyId}` : sql``;

    // `date - date` yields a plain integer day count in Postgres (not an interval),
    // so no EXTRACT() is needed. LAG() reaches the same unit's immediately preceding
    // lease (by start_date) within the window, giving the gap between one tenancy
    // ending and the next beginning.
    const result = await sql<{ avg_days: string | null }>`
      SELECT AVG(gap_days) AS avg_days FROM (
        SELECT
          l.start_date - LAG(COALESCE(l.terminated_at::date, l.end_date))
            OVER (PARTITION BY l.unit_id ORDER BY l.start_date) AS gap_days
        FROM leases l
        JOIN units u ON u.id = l.unit_id
        JOIN floors f ON f.id = u.floor_id
        JOIN blocks b ON b.id = f.block_id
        WHERE l.organisation_id = ${organisationId} AND l.deleted_at IS NULL
        ${propertyFilter}
      ) gaps
      WHERE gap_days IS NOT NULL AND gap_days >= 0
    `.execute(db);

    return result.rows[0]?.avg_days ?? null;
  }

  async latestPropertyValuationKobo(db: Kysely<Database>, organisationId: string, propertyId: string) {
    return db
      .selectFrom('property_valuations')
      .select('valuation_kobo')
      .where('organisation_id', '=', organisationId)
      .where('property_id', '=', propertyId)
      .orderBy('valuation_date', 'desc')
      .limit(1)
      .executeTakeFirst();
  }
}
