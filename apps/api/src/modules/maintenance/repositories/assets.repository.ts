import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { AssetsTable, Database } from '../../../database/kysely.types';

type NewAsset = Insertable<AssetsTable>;
type AssetUpdate = Updateable<AssetsTable>;

@Injectable()
export class AssetsRepository {
  async create(db: Kysely<Database>, asset: NewAsset) {
    return db.insertInto('assets').values(asset).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, assetId: string) {
    return db
      .selectFrom('assets')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', assetId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async findByQrCode(db: Kysely<Database>, organisationId: string, qrCode: string) {
    return db
      .selectFrom('assets')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('qr_code', '=', qrCode)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async listForProperty(db: Kysely<Database>, organisationId: string, propertyId: string) {
    return db
      .selectFrom('assets')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('property_id', '=', propertyId)
      .where('deleted_at', 'is', null)
      .orderBy('name', 'asc')
      .execute();
  }

  async update(db: Kysely<Database>, organisationId: string, assetId: string, changes: AssetUpdate) {
    return db
      .updateTable('assets')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', assetId)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
