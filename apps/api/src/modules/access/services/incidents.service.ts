import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { IncidentsRepository } from '../repositories/incidents.repository';
import { CreateIncidentDto } from '../dto/create-incident.dto';
import { UpdateIncidentStatusDto } from '../dto/update-incident-status.dto';

@Injectable()
export class IncidentsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly incidentsRepo: IncidentsRepository,
  ) {}

  async create(organisationId: string, reportedByUserId: string | null, dto: CreateIncidentDto) {
    return this.db.withTenant(organisationId, (trx) =>
      this.incidentsRepo.create(trx, {
        organisation_id: organisationId,
        property_id: dto.propertyId,
        reported_by_user_id: reportedByUserId,
        incident_type: dto.incidentType,
        severity: dto.severity ?? 'low',
        description: dto.description,
        camera_zone: dto.cameraZone ?? null,
      }),
    );
  }

  async get(organisationId: string, incidentId: string) {
    const incident = await this.db.withTenant(organisationId, (trx) => this.incidentsRepo.findById(trx, organisationId, incidentId));
    if (!incident) {
      throw new NotFoundException('Incident not found');
    }
    return incident;
  }

  async listForProperty(organisationId: string, propertyId: string) {
    return this.db.withTenant(organisationId, (trx) => this.incidentsRepo.listForProperty(trx, organisationId, propertyId));
  }

  /** Org-wide, optionally status-filtered listing for the staff security log. */
  async listForOrganisation(
    organisationId: string,
    status: string | undefined,
    options: { page: number; pageSize: number },
  ) {
    const pageSize = Math.min(Math.max(options.pageSize, 1), 100);
    const page = Math.max(options.page, 1);
    const { rows, total } = await this.db.withTenant(organisationId, (trx) =>
      this.incidentsRepo.listForOrganisation(trx, organisationId, status, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    );
    return { rows, total, page, pageSize };
  }

  async updateStatus(organisationId: string, incidentId: string, dto: UpdateIncidentStatusDto) {
    await this.get(organisationId, incidentId);
    return this.db.withTenant(organisationId, (trx) =>
      this.incidentsRepo.update(trx, organisationId, incidentId, {
        status: dto.status,
        resolved_at: dto.status === 'resolved' ? new Date() : undefined,
      }),
    );
  }
}
