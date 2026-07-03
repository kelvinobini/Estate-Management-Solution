import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { DataSubjectErasureRepository } from '../repositories/data-subject-erasure.repository';
import { AuditLogsService } from './audit-logs.service';

/**
 * NDPR/GDPR "right to erasure" workflow. A data subject with any lease still
 * in an active-ish state (draft through renewed) cannot be erased — their
 * lease must be terminated first, since the tenancy record is itself
 * evidence of an ongoing legal/financial relationship. Erasure anonymizes
 * rather than hard-deletes (so FKs from invoices/payments/etc. stay intact
 * for financial record-keeping), and is itself audit-logged — without the
 * erased PII in the log entry, since that would defeat the purpose.
 */
@Injectable()
export class DataSubjectErasureService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly erasureRepo: DataSubjectErasureRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async eraseTenant(organisationId: string, tenantId: string, requestedByUserId: string): Promise<void> {
    const tenant = await this.db.withTenant(organisationId, async (trx) => {
      const tenant = await this.erasureRepo.findTenantById(trx, organisationId, tenantId);
      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      const hasActiveLease = await this.erasureRepo.hasActiveLeaseInvolvement(trx, organisationId, tenantId);
      if (hasActiveLease) {
        throw new BadRequestException('Cannot erase a data subject with an active or draft lease — terminate the lease first');
      }

      await this.erasureRepo.anonymizeTenant(trx, organisationId, tenantId);
      if (tenant.user_id) {
        await this.erasureRepo.anonymizeUser(trx, organisationId, tenant.user_id);
      }

      return tenant;
    });

    await this.auditLogsService.record({
      organisationId,
      actorUserId: requestedByUserId,
      action: 'data_subject.erased',
      entityType: 'tenant',
      entityId: tenantId,
      afterState: { erased: true, hadLinkedUserAccount: Boolean(tenant.user_id) },
    });
  }
}
