import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from '../../src/modules/documents/services/documents.service';

describe('DocumentsService', () => {
  const organisationId = 'org-1';
  let db: any;
  let documentsRepo: any;
  let versionsRepo: any;
  let expiryAlertsService: any;
  let service: DocumentsService;

  beforeEach(() => {
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };
    documentsRepo = {
      create: jest.fn(async (_trx, doc) => ({ id: 'doc-1', ...doc })),
      findById: jest.fn(),
      update: jest.fn(async (_trx, _orgId, id, changes) => ({ id, ...changes })),
      softDelete: jest.fn(),
    };
    versionsRepo = {
      create: jest.fn(async (_trx, version) => ({ id: 'version-1', ...version })),
      findLatestVersionNumber: jest.fn(),
    };
    expiryAlertsService = { scheduleDefaultAlertTx: jest.fn() };

    service = new DocumentsService(db, documentsRepo, versionsRepo, expiryAlertsService);
  });

  describe('create', () => {
    it('creates the document and its first version, pointing current_version_id at it', async () => {
      const result = await service.create(organisationId, 'user-1', {
        documentType: 'lease',
        title: 'Lease Agreement',
        fileUrl: 'https://files.example.com/lease.pdf',
      });

      expect(versionsRepo.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ document_id: 'doc-1', version_number: 1 }));
      expect(documentsRepo.update).toHaveBeenCalledWith(expect.anything(), organisationId, 'doc-1', { current_version_id: 'version-1' });
      expect(result.currentVersion.id).toBe('version-1');
    });

    it('auto-schedules an expiry alert when an expiry date is given', async () => {
      await service.create(organisationId, 'user-1', {
        documentType: 'insurance_certificate',
        title: 'Fire Insurance',
        fileUrl: 'https://files.example.com/insurance.pdf',
        expiryDate: '2026-12-31',
      });

      expect(expiryAlertsService.scheduleDefaultAlertTx).toHaveBeenCalledWith(expect.anything(), organisationId, 'doc-1', new Date('2026-12-31'));
    });

    it('does not schedule an expiry alert when no expiry date is given', async () => {
      await service.create(organisationId, 'user-1', { documentType: 'id_document', title: 'National ID', fileUrl: 'https://files.example.com/id.pdf' });
      expect(expiryAlertsService.scheduleDefaultAlertTx).not.toHaveBeenCalled();
    });
  });

  describe('uploadNewVersion', () => {
    it('throws NotFoundException for a non-existent document', async () => {
      documentsRepo.findById.mockResolvedValue(undefined);
      await expect(service.uploadNewVersion(organisationId, 'doc-1', 'user-1', { fileUrl: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('increments the version number from the latest existing version', async () => {
      documentsRepo.findById.mockResolvedValue({ id: 'doc-1' });
      versionsRepo.findLatestVersionNumber.mockResolvedValue({ version_number: 3 });

      await service.uploadNewVersion(organisationId, 'doc-1', 'user-1', { fileUrl: 'https://files.example.com/v4.pdf' });

      expect(versionsRepo.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ version_number: 4 }));
    });

    it('starts at version 1 when there is no existing version history', async () => {
      documentsRepo.findById.mockResolvedValue({ id: 'doc-1' });
      versionsRepo.findLatestVersionNumber.mockResolvedValue(undefined);

      await service.uploadNewVersion(organisationId, 'doc-1', 'user-1', { fileUrl: 'https://files.example.com/v1.pdf' });

      expect(versionsRepo.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ version_number: 1 }));
    });
  });

  describe('remove', () => {
    it('throws NotFoundException for a non-existent document', async () => {
      documentsRepo.findById.mockResolvedValue(undefined);
      await expect(service.remove(organisationId, 'doc-1')).rejects.toThrow(NotFoundException);
    });

    it('soft-deletes an existing document', async () => {
      documentsRepo.findById.mockResolvedValue({ id: 'doc-1' });
      await service.remove(organisationId, 'doc-1');
      expect(documentsRepo.softDelete).toHaveBeenCalledWith(expect.anything(), organisationId, 'doc-1');
    });
  });
});
