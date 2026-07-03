import { ComplianceCertificatesService } from '../../src/modules/compliance/services/compliance-certificates.service';

describe('ComplianceCertificatesService.list', () => {
  const organisationId = 'org-1';
  let db: any;
  let certificatesRepo: any;
  let service: ComplianceCertificatesService;

  beforeEach(() => {
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };
    certificatesRepo = { listByTypes: jest.fn() };
    service = new ComplianceCertificatesService(db, certificatesRepo);
  });

  it('classifies each certificate by its expiry date relative to now', async () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    certificatesRepo.listByTypes.mockResolvedValue([
      { id: 'doc-expired', expiry_date: new Date(now - 10 * day) },
      { id: 'doc-expiring-soon', expiry_date: new Date(now + 5 * day) },
      { id: 'doc-valid', expiry_date: new Date(now + 200 * day) },
      { id: 'doc-no-expiry', expiry_date: null },
    ]);

    const result = await service.list(organisationId);

    expect(result.find((d) => d.id === 'doc-expired')!.complianceStatus).toBe('expired');
    expect(result.find((d) => d.id === 'doc-expiring-soon')!.complianceStatus).toBe('expiring_soon');
    expect(result.find((d) => d.id === 'doc-valid')!.complianceStatus).toBe('valid');
    expect(result.find((d) => d.id === 'doc-no-expiry')!.complianceStatus).toBe('no_expiry_date');
  });

  it('passes the certificate document types and optional propertyId through to the repository', async () => {
    certificatesRepo.listByTypes.mockResolvedValue([]);
    await service.list(organisationId, 'property-1');

    expect(certificatesRepo.listByTypes).toHaveBeenCalledWith(
      expect.anything(),
      organisationId,
      expect.arrayContaining(['fire_safety_cert', 'epc_rating']),
      'property-1',
    );
  });
});
