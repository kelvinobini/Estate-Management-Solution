import { Injectable } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { AuditLogsRepository } from '../repositories/audit-logs.repository';

export interface RecordAuditLogInput {
  organisationId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const DEFAULT_LIST_LIMIT = 200;

@Injectable()
export class AuditLogsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly auditLogsRepo: AuditLogsRepository,
  ) {}

  async record(input: RecordAuditLogInput): Promise<void> {
    await this.db.withTenant(input.organisationId, (trx) =>
      this.auditLogsRepo.create(trx, {
        organisation_id: input.organisationId,
        actor_user_id: input.actorUserId,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId,
        before_state: input.beforeState ?? null,
        after_state: input.afterState ?? null,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
      }),
    );
  }

  async listForOrganisation(organisationId: string, limit = DEFAULT_LIST_LIMIT) {
    return this.db.withTenant(organisationId, (trx) => this.auditLogsRepo.listForOrganisation(trx, organisationId, limit));
  }

  async listForEntity(organisationId: string, entityType: string, entityId: string) {
    return this.db.withTenant(organisationId, (trx) => this.auditLogsRepo.listForEntity(trx, organisationId, entityType, entityId));
  }
}
