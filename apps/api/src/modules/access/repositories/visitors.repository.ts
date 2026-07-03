import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { Database, VisitorsTable } from '../../../database/kysely.types';

type NewVisitor = Insertable<VisitorsTable>;
type VisitorUpdate = Updateable<VisitorsTable>;

@Injectable()
export class VisitorsRepository {
  async create(db: Kysely<Database>, visitor: NewVisitor) {
    return db.insertInto('visitors').values(visitor).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, visitorId: string) {
    return db.selectFrom('visitors').selectAll().where('organisation_id', '=', organisationId).where('id', '=', visitorId).executeTakeFirst();
  }

  async listForHostTenant(db: Kysely<Database>, organisationId: string, hostTenantId: string) {
    return db
      .selectFrom('visitors')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('host_tenant_id', '=', hostTenantId)
      .execute();
  }

  /** Org-wide, paginated listing for staff-facing screens (e.g. the front-desk visitor register). */
  async listForOrganisation(
    db: Kysely<Database>,
    organisationId: string,
    options: { limit: number; offset: number },
  ) {
    const [rows, { count }] = await Promise.all([
      db
        .selectFrom('visitors')
        .leftJoin('tenants', 'tenants.id', 'visitors.host_tenant_id')
        .selectAll('visitors')
        .select('tenants.full_name as host_tenant_name')
        .where('visitors.organisation_id', '=', organisationId)
        .orderBy('visitors.created_at', 'desc')
        .limit(options.limit)
        .offset(options.offset)
        .execute(),
      db
        .selectFrom('visitors')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('organisation_id', '=', organisationId)
        .executeTakeFirstOrThrow(),
    ]);

    return { rows, total: Number(count) };
  }

  async update(db: Kysely<Database>, organisationId: string, visitorId: string, changes: VisitorUpdate) {
    return db
      .updateTable('visitors')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', visitorId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
