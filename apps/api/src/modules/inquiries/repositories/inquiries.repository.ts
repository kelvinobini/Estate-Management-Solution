import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { Database, InquiriesTable } from '../../../database/kysely.types';

type NewInquiry = Insertable<InquiriesTable>;
type InquiryUpdate = Updateable<InquiriesTable>;

@Injectable()
export class InquiriesRepository {
  /** Resolves the target organisation from the public form's slug — the caller isn't authenticated yet, so there's no JWT org context to rely on. */
  async findOrganisationBySlug(db: Kysely<Database>, slug: string): Promise<{ id: string; name: string } | null> {
    const org = await db
      .selectFrom('organisations')
      .select(['id', 'name'])
      .where('slug', '=', slug)
      .where('is_active', '=', true)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    return org ?? null;
  }

  async create(db: Kysely<Database>, inquiry: NewInquiry) {
    return db.insertInto('inquiries').values(inquiry).returningAll().executeTakeFirstOrThrow();
  }

  /** Org-wide, optionally status-filtered listing for staff to triage. */
  async listForOrganisation(
    db: Kysely<Database>,
    organisationId: string,
    status: string | undefined,
    options: { limit: number; offset: number },
  ) {
    let query = db.selectFrom('inquiries').selectAll().where('organisation_id', '=', organisationId);
    let countQuery = db
      .selectFrom('inquiries')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('organisation_id', '=', organisationId);

    if (status) {
      query = query.where('status', '=', status);
      countQuery = countQuery.where('status', '=', status);
    }

    const [rows, { count }] = await Promise.all([
      query.orderBy('created_at', 'desc').limit(options.limit).offset(options.offset).execute(),
      countQuery.executeTakeFirstOrThrow(),
    ]);

    return { rows, total: Number(count) };
  }

  async update(db: Kysely<Database>, organisationId: string, inquiryId: string, changes: InquiryUpdate) {
    return db
      .updateTable('inquiries')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', inquiryId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
