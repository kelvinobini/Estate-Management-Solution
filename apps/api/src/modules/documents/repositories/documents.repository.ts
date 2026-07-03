import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { Database, DocumentsTable } from '../../../database/kysely.types';

type NewDocument = Insertable<DocumentsTable>;
type DocumentUpdate = Updateable<DocumentsTable>;

@Injectable()
export class DocumentsRepository {
  async create(db: Kysely<Database>, document: NewDocument) {
    return db.insertInto('documents').values(document).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, documentId: string) {
    return db
      .selectFrom('documents')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', documentId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async listForProperty(db: Kysely<Database>, organisationId: string, propertyId: string) {
    return db
      .selectFrom('documents')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('property_id', '=', propertyId)
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async listForTenant(db: Kysely<Database>, organisationId: string, tenantId: string) {
    return db
      .selectFrom('documents')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('tenant_id', '=', tenantId)
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async listForLease(db: Kysely<Database>, organisationId: string, leaseId: string) {
    return db
      .selectFrom('documents')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('lease_id', '=', leaseId)
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async listExpiringWithin(db: Kysely<Database>, organisationId: string, asOf: Date) {
    return db
      .selectFrom('documents')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('expiry_date', 'is not', null)
      .where('expiry_date', '<=', asOf)
      .where('deleted_at', 'is', null)
      .execute();
  }

  async update(db: Kysely<Database>, organisationId: string, documentId: string, changes: DocumentUpdate) {
    return db
      .updateTable('documents')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', documentId)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async softDelete(db: Kysely<Database>, organisationId: string, documentId: string) {
    return db
      .updateTable('documents')
      .set({ deleted_at: new Date() })
      .where('organisation_id', '=', organisationId)
      .where('id', '=', documentId)
      .executeTakeFirstOrThrow();
  }
}
