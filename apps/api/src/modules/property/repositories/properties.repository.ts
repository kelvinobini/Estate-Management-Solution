import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { Database, PropertiesTable } from '../../../database/kysely.types';

type NewProperty = Insertable<PropertiesTable>;
type PropertyUpdate = Updateable<PropertiesTable>;

@Injectable()
export class PropertiesRepository {
  async create(db: Kysely<Database>, property: NewProperty) {
    return db.insertInto('properties').values(property).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, propertyId: string) {
    return db
      .selectFrom('properties')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', propertyId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async listForOrganisation(db: Kysely<Database>, organisationId: string) {
    return db
      .selectFrom('properties')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('deleted_at', 'is', null)
      .orderBy('name', 'asc')
      .execute();
  }

  /** A Landlord-role caller's portfolio — properties linked via property_owners, not every property in the org. */
  async listOwnedByUser(db: Kysely<Database>, organisationId: string, userId: string) {
    return db
      .selectFrom('properties')
      .innerJoin('property_owners', 'property_owners.property_id', 'properties.id')
      .selectAll('properties')
      .where('properties.organisation_id', '=', organisationId)
      .where('properties.deleted_at', 'is', null)
      .where('property_owners.user_id', '=', userId)
      .orderBy('properties.name', 'asc')
      .execute();
  }

  async listOwnedPropertyIds(db: Kysely<Database>, userId: string): Promise<string[]> {
    const rows = await db.selectFrom('property_owners').select('property_id').where('user_id', '=', userId).execute();
    return rows.map((row) => row.property_id);
  }

  async isOwner(db: Kysely<Database>, propertyId: string, userId: string): Promise<boolean> {
    const row = await db
      .selectFrom('property_owners')
      .select('property_id')
      .where('property_id', '=', propertyId)
      .where('user_id', '=', userId)
      .executeTakeFirst();
    return row !== undefined;
  }

  async addOwner(db: Kysely<Database>, propertyId: string, userId: string): Promise<void> {
    await db
      .insertInto('property_owners')
      .values({ property_id: propertyId, user_id: userId })
      .onConflict((oc) => oc.columns(['property_id', 'user_id']).doNothing())
      .execute();
  }

  /** Staff-facing "who owns this property" — joined with the user's name/email for display. */
  async listOwners(db: Kysely<Database>, propertyId: string) {
    return db
      .selectFrom('property_owners')
      .innerJoin('users', 'users.id', 'property_owners.user_id')
      .select(['users.id', 'users.full_name', 'users.email'])
      .where('property_owners.property_id', '=', propertyId)
      .orderBy('users.full_name', 'asc')
      .execute();
  }

  async update(db: Kysely<Database>, organisationId: string, propertyId: string, changes: PropertyUpdate) {
    return db
      .updateTable('properties')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', propertyId)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async softDelete(db: Kysely<Database>, organisationId: string, propertyId: string) {
    return db
      .updateTable('properties')
      .set({ deleted_at: new Date() })
      .where('organisation_id', '=', organisationId)
      .where('id', '=', propertyId)
      .executeTakeFirstOrThrow();
  }

  async createValuation(db: Kysely<Database>, valuation: Insertable<Database['property_valuations']>) {
    return db.insertInto('property_valuations').values(valuation).returningAll().executeTakeFirstOrThrow();
  }

  async listValuations(db: Kysely<Database>, organisationId: string, propertyId: string) {
    return db
      .selectFrom('property_valuations')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('property_id', '=', propertyId)
      .orderBy('valuation_date', 'desc')
      .execute();
  }
}
