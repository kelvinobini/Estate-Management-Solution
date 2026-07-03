import { Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { Database } from '../../../database/kysely.types';

const ACTIVE_LEASE_STATUSES = ['draft', 'pending_signature', 'active', 'renewed'];

@Injectable()
export class DataSubjectErasureRepository {
  async findTenantById(db: Kysely<Database>, organisationId: string, tenantId: string) {
    return db.selectFrom('tenants').selectAll().where('organisation_id', '=', organisationId).where('id', '=', tenantId).executeTakeFirst();
  }

  /** Checks both primary tenancy and co-tenancy (lease_tenants) — a tenant can be a co-tenant on someone else's lease. */
  async hasActiveLeaseInvolvement(db: Kysely<Database>, organisationId: string, tenantId: string): Promise<boolean> {
    const asPrimary = await db
      .selectFrom('leases')
      .select('id')
      .where('organisation_id', '=', organisationId)
      .where('primary_tenant_id', '=', tenantId)
      .where('status', 'in', ACTIVE_LEASE_STATUSES)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (asPrimary) {
      return true;
    }

    const asCoTenant = await db
      .selectFrom('lease_tenants')
      .innerJoin('leases', 'leases.id', 'lease_tenants.lease_id')
      .select('leases.id')
      .where('lease_tenants.tenant_id', '=', tenantId)
      .where('leases.organisation_id', '=', organisationId)
      .where('leases.status', 'in', ACTIVE_LEASE_STATUSES)
      .where('leases.deleted_at', 'is', null)
      .executeTakeFirst();

    return Boolean(asCoTenant);
  }

  async anonymizeTenant(db: Kysely<Database>, organisationId: string, tenantId: string) {
    return db
      .updateTable('tenants')
      .set({
        full_name: 'Erased Data Subject',
        email: null,
        phone: 'ERASED',
        id_document_type: null,
        id_document_url: null,
        deleted_at: new Date(),
      })
      .where('organisation_id', '=', organisationId)
      .where('id', '=', tenantId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  /** email keeps a unique-per-user placeholder since (organisation_id, email) is UNIQUE — a literal constant would collide across erasure requests. */
  async anonymizeUser(db: Kysely<Database>, organisationId: string, userId: string) {
    return db
      .updateTable('users')
      .set({
        full_name: 'Erased Data Subject',
        email: `erased+${userId}@erased.invalid`,
        phone: null,
        status: 'disabled',
        deleted_at: new Date(),
      })
      .where('organisation_id', '=', organisationId)
      .where('id', '=', userId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
