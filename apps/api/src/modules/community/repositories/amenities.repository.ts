import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { AmenitiesTable, Database } from '../../../database/kysely.types';

type NewAmenity = Insertable<AmenitiesTable>;

@Injectable()
export class AmenitiesRepository {
  async create(db: Kysely<Database>, amenity: NewAmenity) {
    return db.insertInto('amenities').values(amenity).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, amenityId: string) {
    return db.selectFrom('amenities').selectAll().where('organisation_id', '=', organisationId).where('id', '=', amenityId).executeTakeFirst();
  }

  async listForProperty(db: Kysely<Database>, organisationId: string, propertyId: string) {
    return db
      .selectFrom('amenities')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('property_id', '=', propertyId)
      .execute();
  }
}
