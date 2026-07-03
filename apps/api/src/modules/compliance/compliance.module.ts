import { Module } from '@nestjs/common';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { ComplianceController } from './controllers/compliance.controller';
import { DataSubjectErasureController } from './controllers/data-subject-erasure.controller';
import { AuditLogsService } from './services/audit-logs.service';
import { ComplianceCertificatesService } from './services/compliance-certificates.service';
import { DataSubjectErasureService } from './services/data-subject-erasure.service';
import { AuditLogsRepository } from './repositories/audit-logs.repository';
import { ComplianceCertificatesRepository } from './repositories/compliance-certificates.repository';
import { DataSubjectErasureRepository } from './repositories/data-subject-erasure.repository';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

/**
 * Deliberately depends on nothing but the (global) DatabaseModule — every
 * other module that wants audit logging imports ComplianceModule, never the
 * reverse, so there's no risk of a circular module dependency.
 */
@Module({
  controllers: [AuditLogsController, ComplianceController, DataSubjectErasureController],
  providers: [
    AuditLogsService,
    ComplianceCertificatesService,
    DataSubjectErasureService,
    AuditLogsRepository,
    ComplianceCertificatesRepository,
    DataSubjectErasureRepository,
    AuditLogInterceptor,
  ],
  exports: [AuditLogsService, AuditLogInterceptor],
})
export class ComplianceModule {}
