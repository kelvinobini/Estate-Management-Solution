import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { Database, LeasesTable } from '../../../database/kysely.types';

type NewLease = Insertable<LeasesTable>;
type LeaseUpdate = Updateable<LeasesTable>;

@Injectable()
export class LeasesRepository {
  async create(db: Kysely<Database>, lease: NewLease) {
    return db.insertInto('leases').values(lease).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, leaseId: string) {
    return db
      .selectFrom('leases')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', leaseId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async listForUnit(db: Kysely<Database>, organisationId: string, unitId: string) {
    return db
      .selectFrom('leases')
      .innerJoin('tenants', 'tenants.id', 'leases.primary_tenant_id')
      .selectAll('leases')
      .select('tenants.full_name as tenant_name')
      .where('leases.organisation_id', '=', organisationId)
      .where('leases.unit_id', '=', unitId)
      .where('leases.deleted_at', 'is', null)
      .orderBy('leases.start_date', 'desc')
      .execute();
  }

  async listForTenant(db: Kysely<Database>, organisationId: string, tenantId: string) {
    return db
      .selectFrom('leases')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('primary_tenant_id', '=', tenantId)
      .where('deleted_at', 'is', null)
      .orderBy('start_date', 'desc')
      .execute();
  }

  /** Org-wide, paginated listing for staff-facing screens (e.g. the leasing team's register). */
  async listForOrganisation(
    db: Kysely<Database>,
    organisationId: string,
    options: { status?: string; limit: number; offset: number },
  ) {
    let query = db
      .selectFrom('leases')
      .innerJoin('tenants', 'tenants.id', 'leases.primary_tenant_id')
      .innerJoin('units', 'units.id', 'leases.unit_id')
      .selectAll('leases')
      .select(['tenants.full_name as tenant_name', 'units.unit_code as unit_code'])
      .where('leases.organisation_id', '=', organisationId)
      .where('leases.deleted_at', 'is', null);

    if (options.status) {
      query = query.where('leases.status', '=', options.status);
    }

    const [rows, { count }] = await Promise.all([
      query.orderBy('leases.start_date', 'desc').limit(options.limit).offset(options.offset).execute(),
      this.countForOrganisation(db, organisationId, options.status),
    ]);

    return { rows, total: Number(count) };
  }

  private async countForOrganisation(db: Kysely<Database>, organisationId: string, status?: string) {
    let query = db
      .selectFrom('leases')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('organisation_id', '=', organisationId)
      .where('deleted_at', 'is', null);

    if (status) {
      query = query.where('status', '=', status);
    }

    return query.executeTakeFirstOrThrow();
  }

  /** Paginated lease listing scoped to the properties a landlord owns, via leases.unit_id -> units -> floors -> blocks -> property_owners. */
  async listForOwner(
    db: Kysely<Database>,
    organisationId: string,
    ownerUserId: string,
    options: { status?: string; limit: number; offset: number },
  ) {
    let query = db
      .selectFrom('leases')
      .innerJoin('tenants', 'tenants.id', 'leases.primary_tenant_id')
      .innerJoin('units', 'units.id', 'leases.unit_id')
      .innerJoin('floors', 'floors.id', 'units.floor_id')
      .innerJoin('blocks', 'blocks.id', 'floors.block_id')
      .innerJoin('property_owners', 'property_owners.property_id', 'blocks.property_id')
      .innerJoin('properties', 'properties.id', 'blocks.property_id')
      .selectAll('leases')
      .select(['tenants.full_name as tenant_name', 'units.unit_code as unit_code', 'properties.name as property_name'])
      .where('leases.organisation_id', '=', organisationId)
      .where('leases.deleted_at', 'is', null)
      .where('property_owners.user_id', '=', ownerUserId);

    if (options.status) {
      query = query.where('leases.status', '=', options.status);
    }

    const [rows, { count }] = await Promise.all([
      query.orderBy('leases.start_date', 'desc').limit(options.limit).offset(options.offset).execute(),
      this.countForOwner(db, organisationId, ownerUserId, options.status),
    ]);

    return { rows, total: Number(count) };
  }

  private async countForOwner(db: Kysely<Database>, organisationId: string, ownerUserId: string, status?: string) {
    let query = db
      .selectFrom('leases')
      .innerJoin('units', 'units.id', 'leases.unit_id')
      .innerJoin('floors', 'floors.id', 'units.floor_id')
      .innerJoin('blocks', 'blocks.id', 'floors.block_id')
      .innerJoin('property_owners', 'property_owners.property_id', 'blocks.property_id')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('leases.organisation_id', '=', organisationId)
      .where('leases.deleted_at', 'is', null)
      .where('property_owners.user_id', '=', ownerUserId);

    if (status) {
      query = query.where('leases.status', '=', status);
    }

    return query.executeTakeFirstOrThrow();
  }

  async listExpiring(db: Kysely<Database>, organisationId: string, asOf: Date) {
    return db
      .selectFrom('leases')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('status', 'in', ['active', 'renewed'])
      .where('end_date', '<', asOf)
      .where('deleted_at', 'is', null)
      .execute();
  }

  async update(db: Kysely<Database>, organisationId: string, leaseId: string, changes: LeaseUpdate) {
    return db
      .updateTable('leases')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', leaseId)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
