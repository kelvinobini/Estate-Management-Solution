import { Inject, Injectable } from '@nestjs/common';
import { Kysely, Transaction, sql } from 'kysely';
import { KYSELY_INSTANCE } from './database.tokens';
import { Database } from './kysely.types';

/**
 * Every write/read that touches a tenant-scoped table must go through
 * `withTenant`. It opens a transaction and sets `app.current_org_id` as a
 * transaction-local Postgres setting (`SET LOCAL`, cleared automatically on
 * COMMIT/ROLLBACK) so the RLS policies defined in db/schema.sql section 13
 * enforce isolation even if a repository query forgets a WHERE clause.
 *
 * Background jobs / SuperAdmin flows that must cross tenants use
 * `runAsService`, which relies on the `service_role` Postgres role having
 * BYPASSRLS — the tenant policies themselves are never relaxed.
 */
@Injectable()
export class TenantDatabaseService {
  constructor(@Inject(KYSELY_INSTANCE) private readonly db: Kysely<Database>) {}

  async withTenant<T>(
    organisationId: string,
    work: (trx: Transaction<Database>) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction().execute(async (trx) => {
      await sql`select set_config('app.current_org_id', ${organisationId}, true)`.execute(trx);
      return work(trx);
    });
  }

  async runAsService<T>(work: (trx: Transaction<Database>) => Promise<T>): Promise<T> {
    return this.db.transaction().execute((trx) => work(trx));
  }
}
