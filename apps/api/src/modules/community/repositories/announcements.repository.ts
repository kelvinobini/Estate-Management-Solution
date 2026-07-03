import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { AnnouncementsTable, Database } from '../../../database/kysely.types';

type NewAnnouncement = Insertable<AnnouncementsTable>;
type AnnouncementUpdate = Updateable<AnnouncementsTable>;

@Injectable()
export class AnnouncementsRepository {
  async create(db: Kysely<Database>, announcement: NewAnnouncement) {
    return db.insertInto('announcements').values(announcement).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, announcementId: string) {
    return db
      .selectFrom('announcements')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', announcementId)
      .executeTakeFirst();
  }

  async listForProperty(db: Kysely<Database>, organisationId: string, propertyId: string) {
    return db
      .selectFrom('announcements')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('property_id', '=', propertyId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  /** Org-wide listing (property-scoped and org-wide announcements together) for the staff communications register. */
  async listForOrganisation(db: Kysely<Database>, organisationId: string, options: { limit: number; offset: number }) {
    const [rows, { count }] = await Promise.all([
      db
        .selectFrom('announcements')
        .selectAll()
        .where('organisation_id', '=', organisationId)
        .orderBy('created_at', 'desc')
        .limit(options.limit)
        .offset(options.offset)
        .execute(),
      db
        .selectFrom('announcements')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('organisation_id', '=', organisationId)
        .executeTakeFirstOrThrow(),
    ]);

    return { rows, total: Number(count) };
  }

  async update(db: Kysely<Database>, organisationId: string, announcementId: string, changes: AnnouncementUpdate) {
    return db
      .updateTable('announcements')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', announcementId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
