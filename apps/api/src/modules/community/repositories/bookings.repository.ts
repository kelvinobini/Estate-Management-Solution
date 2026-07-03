import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { BookingsTable, Database } from '../../../database/kysely.types';

type NewBooking = Insertable<BookingsTable>;
type BookingUpdate = Updateable<BookingsTable>;

@Injectable()
export class BookingsRepository {
  async create(db: Kysely<Database>, booking: NewBooking) {
    return db.insertInto('bookings').values(booking).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, bookingId: string) {
    return db.selectFrom('bookings').selectAll().where('organisation_id', '=', organisationId).where('id', '=', bookingId).executeTakeFirst();
  }

  async listForTenant(db: Kysely<Database>, organisationId: string, tenantId: string) {
    return db
      .selectFrom('bookings')
      .innerJoin('amenities', 'amenities.id', 'bookings.amenity_id')
      .selectAll('bookings')
      .select('amenities.name as amenity_name')
      .where('bookings.organisation_id', '=', organisationId)
      .where('bookings.tenant_id', '=', tenantId)
      .orderBy('bookings.start_time', 'desc')
      .execute();
  }

  /** Org-wide (per-amenity) booking calendar, joined with tenant name, for staff. */
  async listForAmenity(db: Kysely<Database>, organisationId: string, amenityId: string) {
    return db
      .selectFrom('bookings')
      .innerJoin('tenants', 'tenants.id', 'bookings.tenant_id')
      .selectAll('bookings')
      .select('tenants.full_name as tenant_name')
      .where('bookings.organisation_id', '=', organisationId)
      .where('bookings.amenity_id', '=', amenityId)
      .orderBy('bookings.start_time', 'desc')
      .execute();
  }

  /** Overlap check excludes cancelled bookings — a cancelled slot frees up the amenity. */
  async findOverlapping(db: Kysely<Database>, organisationId: string, amenityId: string, start: Date, end: Date) {
    return db
      .selectFrom('bookings')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('amenity_id', '=', amenityId)
      .where('status', '!=', 'cancelled')
      .where('start_time', '<', end)
      .where('end_time', '>', start)
      .execute();
  }

  async update(db: Kysely<Database>, organisationId: string, bookingId: string, changes: BookingUpdate) {
    return db
      .updateTable('bookings')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', bookingId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
