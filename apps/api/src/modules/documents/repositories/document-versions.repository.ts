import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, DocumentVersionsTable } from '../../../database/kysely.types';

type NewDocumentVersion = Insertable<DocumentVersionsTable>;

@Injectable()
export class DocumentVersionsRepository {
  async create(db: Kysely<Database>, version: NewDocumentVersion) {
    return db.insertInto('document_versions').values(version).returningAll().executeTakeFirstOrThrow();
  }

  async listForDocument(db: Kysely<Database>, organisationId: string, documentId: string) {
    return db
      .selectFrom('document_versions')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('document_id', '=', documentId)
      .orderBy('version_number', 'desc')
      .execute();
  }

  async findLatestVersionNumber(db: Kysely<Database>, organisationId: string, documentId: string) {
    return db
      .selectFrom('document_versions')
      .select('version_number')
      .where('organisation_id', '=', organisationId)
      .where('document_id', '=', documentId)
      .orderBy('version_number', 'desc')
      .limit(1)
      .executeTakeFirst();
  }
}
