import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { ComplaintsTable, Database } from '../../../database/kysely.types';

type NewComplaint = Insertable<ComplaintsTable>;
type ComplaintUpdate = Updateable<ComplaintsTable>;

@Injectable()
export class ComplaintsRepository {
  async create(db: Kysely<Database>, complaint: NewComplaint) {
    return db.insertInto('complaints').values(complaint).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, complaintId: string) {
    return db
      .selectFrom('complaints')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', complaintId)
      .executeTakeFirst();
  }

  async listForTenant(db: Kysely<Database>, organisationId: string, tenantId: string) {
    return db
      .selectFrom('complaints')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('tenant_id', '=', tenantId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  /** Org-wide listing (optionally status-filtered), joined with tenant name, for the staff triage register. */
  async listForOrganisation(
    db: Kysely<Database>,
    organisationId: string,
    status: string | undefined,
    options: { limit: number; offset: number },
  ) {
    let query = db
      .selectFrom('complaints')
      .innerJoin('tenants', 'tenants.id', 'complaints.tenant_id')
      .selectAll('complaints')
      .select('tenants.full_name as tenant_name')
      .where('complaints.organisation_id', '=', organisationId);
    let countQuery = db
      .selectFrom('complaints')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('organisation_id', '=', organisationId);

    if (status) {
      query = query.where('complaints.status', '=', status);
      countQuery = countQuery.where('status', '=', status);
    }

    const [rows, { count }] = await Promise.all([
      query.orderBy('complaints.created_at', 'desc').limit(options.limit).offset(options.offset).execute(),
      countQuery.executeTakeFirstOrThrow(),
    ]);

    return { rows, total: Number(count) };
  }

  async listOverdue(db: Kysely<Database>, organisationId: string, asOf: Date) {
    return db
      .selectFrom('complaints')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('status', 'in', ['open', 'in_review'])
      .where('sla_due_at', '<', asOf)
      .execute();
  }

  async update(db: Kysely<Database>, organisationId: string, complaintId: string, changes: ComplaintUpdate) {
    return db
      .updateTable('complaints')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', complaintId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
