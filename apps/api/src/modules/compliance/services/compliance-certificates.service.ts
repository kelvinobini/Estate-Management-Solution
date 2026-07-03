import { Injectable } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { ComplianceCertificatesRepository } from '../repositories/compliance-certificates.repository';

/** document_type values treated as regulatory/inspection certificates for this report, as opposed to leases, ID scans, etc. */
export const CERTIFICATE_DOCUMENT_TYPES = [
  'fire_safety_cert',
  'elevator_inspection_cert',
  'electrical_certification',
  'epc_rating',
  'gas_safety_certificate',
  'insurance_certificate',
  'certificate_of_occupancy',
  'governors_consent',
];

const EXPIRING_SOON_WINDOW_DAYS = 30;

type CertificateStatus = 'expired' | 'expiring_soon' | 'valid' | 'no_expiry_date';

@Injectable()
export class ComplianceCertificatesService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly certificatesRepo: ComplianceCertificatesRepository,
  ) {}

  async list(organisationId: string, propertyId?: string) {
    const documents = await this.db.withTenant(organisationId, (trx) =>
      this.certificatesRepo.listByTypes(trx, organisationId, CERTIFICATE_DOCUMENT_TYPES, propertyId),
    );

    const now = new Date();
    return documents.map((doc) => ({ ...doc, complianceStatus: this.classify(doc.expiry_date, now) }));
  }

  private classify(expiryDate: Date | null, now: Date): CertificateStatus {
    if (!expiryDate) {
      return 'no_expiry_date';
    }
    const expiry = new Date(expiryDate);
    if (expiry < now) {
      return 'expired';
    }
    const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    return daysUntilExpiry <= EXPIRING_SOON_WINDOW_DAYS ? 'expiring_soon' : 'valid';
  }
}
