import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { Database, TenantsTable } from '../../../database/kysely.types';

type NewTenant = Insertable<TenantsTable>;
type TenantUpdate = Updateable<TenantsTable>;

@Injectable()
export class TenantsRepository {
  async create(db: Kysely<Database>, tenant: NewTenant) {
    return db.insertInto('tenants').values(tenant).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, tenantId: string) {
    return db
      .selectFrom('tenants')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', tenantId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  /** Resolves a Tenant-role JWT's `sub` (a users.id) to the tenant record it's linked to, if any. */
  async findByUserId(db: Kysely<Database>, organisationId: string, userId: string) {
    return db
      .selectFrom('tenants')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('user_id', '=', userId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async listForOrganisation(db: Kysely<Database>, organisationId: string) {
    return db
      .selectFrom('tenants')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('deleted_at', 'is', null)
      .orderBy('full_name', 'asc')
      .execute();
  }

  async update(db: Kysely<Database>, organisationId: string, tenantId: string, changes: TenantUpdate) {
    return db
      .updateTable('tenants')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', tenantId)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
