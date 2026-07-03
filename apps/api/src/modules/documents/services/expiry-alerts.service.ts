import { Injectable } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { ExpiryAlertsRepository } from '../repositories/expiry-alerts.repository';
import { CreateExpiryAlertDto } from '../dto/create-expiry-alert.dto';

const DEFAULT_LEAD_DAYS = 30;

@Injectable()
export class ExpiryAlertsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly expiryAlertsRepo: ExpiryAlertsRepository,
  ) {}

  async create(organisationId: string, documentId: string, dto: CreateExpiryAlertDto) {
    return this.db.withTenant(organisationId, (trx) =>
      this.expiryAlertsRepo.create(trx, {
        organisation_id: organisationId,
        document_id: documentId,
        alert_date: dto.alertDate,
        channel: dto.channel ?? 'email',
      }),
    );
  }

  async listForDocument(organisationId: string, documentId: string) {
    return this.db.withTenant(organisationId, (trx) => this.expiryAlertsRepo.listForDocument(trx, organisationId, documentId));
  }

  /** Auto-scheduling hook called by DocumentsService when a document is created/updated with an expiry_date. */
  async scheduleDefaultAlertTx(trx: Parameters<ExpiryAlertsRepository['create']>[0], organisationId: string, documentId: string, expiryDate: Date) {
    const alertDate = new Date(expiryDate);
    alertDate.setDate(alertDate.getDate() - DEFAULT_LEAD_DAYS);
    return this.expiryAlertsRepo.create(trx, {
      organisation_id: organisationId,
      document_id: documentId,
      alert_date: alertDate,
      channel: 'email',
    });
  }

  /** Used by the expiry-alert-scan scheduled job. Actual dispatch (email/SMS/push) is the Integrations layer's job — this is the hook point for it. */
  async dispatchDueAlerts(organisationId: string) {
    return this.db.withTenant(organisationId, async (trx) => {
      const due = await this.expiryAlertsRepo.listDue(trx, organisationId, new Date());
      const results = [];
      for (const alert of due) {
        results.push(await this.expiryAlertsRepo.markSent(trx, alert.id));
      }
      return results;
    });
  }
}
