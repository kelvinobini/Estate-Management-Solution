import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { Database, VendorsTable } from '../../../database/kysely.types';

type NewVendor = Insertable<VendorsTable>;
type VendorUpdate = Updateable<VendorsTable>;

@Injectable()
export class VendorsRepository {
  async create(db: Kysely<Database>, vendor: NewVendor) {
    return db.insertInto('vendors').values(vendor).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, vendorId: string) {
    return db
      .selectFrom('vendors')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', vendorId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async listForOrganisation(db: Kysely<Database>, organisationId: string) {
    return db
      .selectFrom('vendors')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('deleted_at', 'is', null)
      .orderBy('company_name', 'asc')
      .execute();
  }

  async update(db: Kysely<Database>, organisationId: string, vendorId: string, changes: VendorUpdate) {
    return db
      .updateTable('vendors')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', vendorId)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
