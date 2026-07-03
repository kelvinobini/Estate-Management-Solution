import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { DocumentsRepository } from '../repositories/documents.repository';
import { DocumentVersionsRepository } from '../repositories/document-versions.repository';
import { ExpiryAlertsService } from './expiry-alerts.service';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { CreateDocumentVersionDto } from '../dto/create-document-version.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly documentsRepo: DocumentsRepository,
    private readonly versionsRepo: DocumentVersionsRepository,
    private readonly expiryAlertsService: ExpiryAlertsService,
  ) {}

  /**
   * Creates the document record and its first version together, and — if an
   * expiry date is given — auto-schedules a reminder 30 days ahead (see
   * ExpiryAlertsService.scheduleDefaultAlertTx). All in one transaction.
   */
  async create(organisationId: string, uploadedByUserId: string, dto: CreateDocumentDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const document = await this.documentsRepo.create(trx, {
        organisation_id: organisationId,
        property_id: dto.propertyId ?? null,
        unit_id: dto.unitId ?? null,
        tenant_id: dto.tenantId ?? null,
        lease_id: dto.leaseId ?? null,
        document_type: dto.documentType,
        title: dto.title,
        access_level: dto.accessLevel ?? 'restricted',
        expiry_date: dto.expiryDate ?? null,
      });

      const version = await this.versionsRepo.create(trx, {
        organisation_id: organisationId,
        document_id: document.id,
        version_number: 1,
        file_url: dto.fileUrl,
        file_hash: dto.fileHash ?? null,
        uploaded_by_user_id: uploadedByUserId,
      });

      const updated = await this.documentsRepo.update(trx, organisationId, document.id, { current_version_id: version.id });

      if (dto.expiryDate) {
        await this.expiryAlertsService.scheduleDefaultAlertTx(trx, organisationId, document.id, new Date(dto.expiryDate));
      }

      return { ...updated, currentVersion: version };
    });
  }

  async get(organisationId: string, documentId: string) {
    const document = await this.db.withTenant(organisationId, (trx) => this.documentsRepo.findById(trx, organisationId, documentId));
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async listForProperty(organisationId: string, propertyId: string) {
    return this.db.withTenant(organisationId, (trx) => this.documentsRepo.listForProperty(trx, organisationId, propertyId));
  }

  async listForTenant(organisationId: string, tenantId: string) {
    return this.db.withTenant(organisationId, (trx) => this.documentsRepo.listForTenant(trx, organisationId, tenantId));
  }

  async listForLease(organisationId: string, leaseId: string) {
    return this.db.withTenant(organisationId, (trx) => this.documentsRepo.listForLease(trx, organisationId, leaseId));
  }

  /** Uploads a new version and repoints the document at it — the version history itself is immutable and never overwritten. */
  async uploadNewVersion(organisationId: string, documentId: string, uploadedByUserId: string, dto: CreateDocumentVersionDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const document = await this.documentsRepo.findById(trx, organisationId, documentId);
      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const latest = await this.versionsRepo.findLatestVersionNumber(trx, organisationId, documentId);
      const nextVersionNumber = (latest?.version_number ?? 0) + 1;

      const version = await this.versionsRepo.create(trx, {
        organisation_id: organisationId,
        document_id: documentId,
        version_number: nextVersionNumber,
        file_url: dto.fileUrl,
        file_hash: dto.fileHash ?? null,
        uploaded_by_user_id: uploadedByUserId,
      });

      return this.documentsRepo.update(trx, organisationId, documentId, { current_version_id: version.id });
    });
  }

  async listVersions(organisationId: string, documentId: string) {
    return this.db.withTenant(organisationId, (trx) => this.versionsRepo.listForDocument(trx, organisationId, documentId));
  }

  async remove(organisationId: string, documentId: string): Promise<void> {
    await this.get(organisationId, documentId);
    await this.db.withTenant(organisationId, (trx) => this.documentsRepo.softDelete(trx, organisationId, documentId));
  }
}
