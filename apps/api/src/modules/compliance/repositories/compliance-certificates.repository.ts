import { Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { Database } from '../../../database/kysely.types';

/**
 * Deliberately queries the `documents` table directly rather than importing
 * DocumentsModule/DocumentsRepository: DocumentsModule needs the audit-log
 * interceptor from this module (for document.deleted), and the reverse
 * import would make the two modules circularly dependent. A few lines of
 * duplicated query logic here is the cheaper trade-off.
 */
@Injectable()
export class ComplianceCertificatesRepository {
  async listByTypes(db: Kysely<Database>, organisationId: string, documentTypes: string[], propertyId?: string) {
    let query = db
      .selectFrom('documents')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('document_type', 'in', documentTypes)
      .where('deleted_at', 'is', null);

    if (propertyId) {
      query = query.where('property_id', '=', propertyId);
    }

    return query.orderBy('expiry_date', 'asc').execute();
  }
}
