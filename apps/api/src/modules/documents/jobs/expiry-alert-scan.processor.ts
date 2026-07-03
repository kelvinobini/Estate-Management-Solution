import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue, Job } from 'bullmq';
import { TenantDatabaseService } from '../../../database/database.service';
import { ExpiryAlertsService } from '../services/expiry-alerts.service';
import { EXPIRY_ALERT_SCAN_QUEUE } from '../documents.tokens';

interface ExpiryAlertScanJobData {
  organisationId: string;
}

/**
 * Daily job: marks due, unsent expiry_alerts as sent. Actual dispatch over
 * email/SMS/push/in-app is the Integrations layer's job (Twilio/SendGrid/FCM
 * — see docs/01-architecture.md section 11), not implemented yet; this is
 * the hook point for it, mirroring the arrears-scan / lease-expiry pattern.
 */
@Injectable()
@Processor(EXPIRY_ALERT_SCAN_QUEUE)
export class ExpiryAlertScanProcessor extends WorkerHost {
  private readonly logger = new Logger(ExpiryAlertScanProcessor.name);

  constructor(
    private readonly tenantDb: TenantDatabaseService,
    private readonly expiryAlertsService: ExpiryAlertsService,
    @InjectQueue(EXPIRY_ALERT_SCAN_QUEUE) private readonly queue: Queue<ExpiryAlertScanJobData>,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async enqueueForAllOrganisations(): Promise<void> {
    const organisations = await this.tenantDb.runAsService((trx) =>
      trx.selectFrom('organisations').select('id').where('is_active', '=', true).execute(),
    );

    for (const org of organisations) {
      await this.queue.add('scan-organisation', { organisationId: org.id });
    }
  }

  async process(job: Job<ExpiryAlertScanJobData>): Promise<void> {
    const dispatched = await this.expiryAlertsService.dispatchDueAlerts(job.data.organisationId);
    this.logger.log(`Organisation ${job.data.organisationId}: ${dispatched.length} expiry alert(s) dispatched`);
  }
}
