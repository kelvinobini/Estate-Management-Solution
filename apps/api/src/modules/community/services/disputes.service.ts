import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { DisputesRepository } from '../repositories/disputes.repository';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { UpdateDisputeStatusDto } from '../dto/update-dispute-status.dto';

@Injectable()
export class DisputesService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly disputesRepo: DisputesRepository,
  ) {}

  async create(organisationId: string, raisedByUserId: string, dto: CreateDisputeDto) {
    return this.db.withTenant(organisationId, (trx) =>
      this.disputesRepo.create(trx, {
        organisation_id: organisationId,
        complaint_id: dto.complaintId ?? null,
        lease_id: dto.leaseId ?? null,
        raised_by_user_id: raisedByUserId,
        dispute_type: dto.disputeType,
      }),
    );
  }

  async get(organisationId: string, disputeId: string) {
    const dispute = await this.db.withTenant(organisationId, (trx) => this.disputesRepo.findById(trx, organisationId, disputeId));
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }
    return dispute;
  }

  async listForLease(organisationId: string, leaseId: string) {
    return this.db.withTenant(organisationId, (trx) => this.disputesRepo.listForLease(trx, organisationId, leaseId));
  }

  async updateStatus(organisationId: string, disputeId: string, dto: UpdateDisputeStatusDto) {
    if (dto.status === 'resolved' && !dto.resolutionNotes) {
      throw new BadRequestException('resolutionNotes is required when resolving a dispute');
    }

    await this.get(organisationId, disputeId);
    return this.db.withTenant(organisationId, (trx) =>
      this.disputesRepo.update(trx, organisationId, disputeId, {
        status: dto.status,
        resolution_notes: dto.resolutionNotes ?? undefined,
        resolved_at: dto.status === 'resolved' ? new Date() : undefined,
      }),
    );
  }
}
