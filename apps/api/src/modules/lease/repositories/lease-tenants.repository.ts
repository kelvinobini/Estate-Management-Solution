import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, LeaseTenantsTable } from '../../../database/kysely.types';

type NewLeaseTenant = Insertable<LeaseTenantsTable>;

@Injectable()
export class LeaseTenantsRepository {
  async add(db: Kysely<Database>, leaseTenant: NewLeaseTenant) {
    return db.insertInto('lease_tenants').values(leaseTenant).returningAll().executeTakeFirstOrThrow();
  }

  async listForLease(db: Kysely<Database>, leaseId: string) {
    return db
      .selectFrom('lease_tenants')
      .innerJoin('tenants', 'tenants.id', 'lease_tenants.tenant_id')
      .select([
        'lease_tenants.tenant_id',
        'lease_tenants.is_primary',
        'lease_tenants.liability_share_percent',
        'tenants.full_name as tenant_name',
      ])
      .where('lease_tenants.lease_id', '=', leaseId)
      .execute();
  }
}
