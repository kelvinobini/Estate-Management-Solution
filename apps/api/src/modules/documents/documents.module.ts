import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ComplianceModule } from '../compliance/compliance.module';
import { LeaseModule } from '../lease/lease.module';
import { PropertyModule } from '../property/property.module';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentsService } from './services/documents.service';
import { ExpiryAlertsService } from './services/expiry-alerts.service';
import { DocumentsRepository } from './repositories/documents.repository';
import { DocumentVersionsRepository } from './repositories/document-versions.repository';
import { ExpiryAlertsRepository } from './repositories/expiry-alerts.repository';
import { ExpiryAlertScanProcessor } from './jobs/expiry-alert-scan.processor';
import { EXPIRY_ALERT_SCAN_QUEUE } from './documents.tokens';

export { EXPIRY_ALERT_SCAN_QUEUE };

@Module({
  imports: [BullModule.registerQueue({ name: EXPIRY_ALERT_SCAN_QUEUE }), ComplianceModule, LeaseModule, PropertyModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    ExpiryAlertsService,
    DocumentsRepository,
    DocumentVersionsRepository,
    ExpiryAlertsRepository,
    ExpiryAlertScanProcessor,
  ],
  exports: [DocumentsService, ExpiryAlertsService],
})
export class DocumentsModule {}
