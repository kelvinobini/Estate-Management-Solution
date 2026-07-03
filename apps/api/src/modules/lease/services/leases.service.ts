import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantDatabaseService } from '../../../database/database.service';
import { addKobo, computeVatKobo } from '../../../common/money.util';
import { LeaseEndedEvent, LeaseEvent, LeaseSignedEvent } from '../../../common/events/lease.events';
import { LeasesRepository } from '../repositories/leases.repository';
import { LeaseTenantsRepository } from '../repositories/lease-tenants.repository';
import { LeaseClausesRepository } from '../repositories/lease-clauses.repository';
import { CreateLeaseDto } from '../dto/create-lease.dto';
import { ActivateLeaseDto } from '../dto/activate-lease.dto';
import { RenewLeaseDto } from '../dto/renew-lease.dto';
import { TerminateLeaseDto } from '../dto/terminate-lease.dto';
import { AddCoTenantDto } from '../dto/add-co-tenant.dto';
import { AddLeaseClauseDto } from '../dto/add-lease-clause.dto';

/** Valid next statuses per current lease status. Terminated/expired are terminal. */
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending_signature', 'active'],
  pending_signature: ['active'],
  active: ['renewed', 'terminated'],
  renewed: ['renewed', 'terminated'],
};

@Injectable()
export class LeasesService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly leasesRepo: LeasesRepository,
    private readonly leaseTenantsRepo: LeaseTenantsRepository,
    private readonly leaseClausesRepo: LeaseClausesRepository,
    private readonly events: EventEmitter2,
  ) {}

  async create(organisationId: string, dto: CreateLeaseDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const lease = await this.leasesRepo.create(trx, {
        organisation_id: organisationId,
        unit_id: dto.unitId,
        primary_tenant_id: dto.primaryTenantId,
        status: 'draft',
        start_date: dto.startDate,
        end_date: dto.endDate,
        rent_amount_kobo: dto.rentAmountKobo,
        rent_frequency: dto.rentFrequency,
        deposit_amount_kobo: dto.depositAmountKobo ?? 0,
        escalation_percent: dto.escalationPercent ?? null,
        escalation_frequency_months: dto.escalationFrequencyMonths ?? null,
        break_clause_notice_days: dto.breakClauseNoticeDays ?? null,
        subletting_allowed: dto.sublettingAllowed ?? false,
      });

      await this.leaseTenantsRepo.add(trx, {
        lease_id: lease.id,
        tenant_id: dto.primaryTenantId,
        is_primary: true,
        liability_share_percent: 100,
      });

      return lease;
    });
  }

  async get(organisationId: string, leaseId: string) {
    const lease = await this.db.withTenant(organisationId, (trx) => this.leasesRepo.findById(trx, organisationId, leaseId));
    if (!lease) {
      throw new NotFoundException('Lease not found');
    }
    return lease;
  }

  async listForUnit(organisationId: string, unitId: string) {
    return this.db.withTenant(organisationId, (trx) => this.leasesRepo.listForUnit(trx, organisationId, unitId));
  }

  /** Org-wide, paginated listing for staff-facing screens (e.g. the leasing team's register). */
  async listForOrganisation(organisationId: string, options: { status?: string; page: number; pageSize: number }) {
    const pageSize = Math.min(Math.max(options.pageSize, 1), 100);
    const page = Math.max(options.page, 1);
    const { rows, total } = await this.db.withTenant(organisationId, (trx) =>
      this.leasesRepo.listForOrganisation(trx, organisationId, {
        status: options.status,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    );
    return { rows, total, page, pageSize };
  }

  async listForTenant(organisationId: string, tenantId: string) {
    return this.db.withTenant(organisationId, (trx) => this.leasesRepo.listForTenant(trx, organisationId, tenantId));
  }

  /** Paginated listing scoped to a landlord's own properties, for the Landlord app's leases screen. */
  async listForOwner(organisationId: string, ownerUserId: string, options: { status?: string; page: number; pageSize: number }) {
    const pageSize = Math.min(Math.max(options.pageSize, 1), 100);
    const page = Math.max(options.page, 1);
    const { rows, total } = await this.db.withTenant(organisationId, (trx) =>
      this.leasesRepo.listForOwner(trx, organisationId, ownerUserId, {
        status: options.status,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    );
    return { rows, total, page, pageSize };
  }

  async submitForSignature(organisationId: string, leaseId: string) {
    return this.transition(organisationId, leaseId, 'pending_signature', (trx, lease) =>
      this.leasesRepo.update(trx, organisationId, lease.id, { status: 'pending_signature' }),
    );
  }

  /** Marks the lease active and emits `lease.signed` — Financial creates the first invoice, Property occupies the unit. */
  async activate(organisationId: string, leaseId: string, dto: ActivateLeaseDto) {
    return this.transition(organisationId, leaseId, 'active', async (trx, lease) => {
      const activated = await this.leasesRepo.update(trx, organisationId, lease.id, {
        status: 'active',
        signed_at: new Date(),
        esignature_provider: dto.esignatureProvider ?? null,
        esignature_envelope_id: dto.esignatureEnvelopeId ?? null,
      });

      this.events.emit(
        LeaseEvent.Signed,
        new LeaseSignedEvent(
          organisationId,
          activated.id,
          activated.unit_id,
          activated.primary_tenant_id,
          activated.rent_amount_kobo,
          activated.rent_frequency,
          activated.start_date.toString(),
        ),
      );

      return activated;
    });
  }

  /** Extends end_date and, if an escalation_percent is set on the lease, bumps the rent by that percentage. */
  async renew(organisationId: string, leaseId: string, dto: RenewLeaseDto) {
    return this.transition(organisationId, leaseId, 'renewed', async (trx, lease) => {
      const escalationPercent = lease.escalation_percent ? Number(lease.escalation_percent) : 0;
      const newRentAmountKobo = escalationPercent > 0 ? addKobo(lease.rent_amount_kobo, computeVatKobo(lease.rent_amount_kobo, escalationPercent)) : undefined;

      return this.leasesRepo.update(trx, organisationId, lease.id, {
        status: 'renewed',
        end_date: dto.newEndDate,
        ...(newRentAmountKobo !== undefined && { rent_amount_kobo: newRentAmountKobo.toString() }),
      });
    });
  }

  /** Marks the lease terminated and emits a shared LeaseEndedEvent — Property vacates the unit. */
  async terminate(organisationId: string, leaseId: string, dto: TerminateLeaseDto) {
    return this.transition(organisationId, leaseId, 'terminated', async (trx, lease) => {
      const terminated = await this.leasesRepo.update(trx, organisationId, lease.id, {
        status: 'terminated',
        terminated_at: new Date(),
        termination_reason: dto.reason,
      });

      this.events.emit(LeaseEvent.Terminated, new LeaseEndedEvent(organisationId, terminated.id, terminated.unit_id, 'terminated'));
      return terminated;
    });
  }

  /** Used by the lease-expiry scheduled job. Bulk-marks overdue active/renewed leases as expired. */
  async markExpiredLeases(organisationId: string) {
    return this.db.withTenant(organisationId, async (trx) => {
      const expiring = await this.leasesRepo.listExpiring(trx, organisationId, new Date());
      const results = [];
      for (const lease of expiring) {
        const updated = await this.leasesRepo.update(trx, organisationId, lease.id, { status: 'expired' });
        this.events.emit(LeaseEvent.Expired, new LeaseEndedEvent(organisationId, updated.id, updated.unit_id, 'expired'));
        results.push(updated);
      }
      return results;
    });
  }

  async addCoTenant(organisationId: string, leaseId: string, dto: AddCoTenantDto) {
    await this.get(organisationId, leaseId);
    return this.db.withTenant(organisationId, (trx) =>
      this.leaseTenantsRepo.add(trx, {
        lease_id: leaseId,
        tenant_id: dto.tenantId,
        is_primary: false,
        liability_share_percent: dto.liabilitySharePercent ?? 0,
      }),
    );
  }

  async listCoTenants(organisationId: string, leaseId: string) {
    await this.get(organisationId, leaseId);
    return this.db.withTenant(organisationId, (trx) => this.leaseTenantsRepo.listForLease(trx, leaseId));
  }

  async addClause(organisationId: string, leaseId: string, dto: AddLeaseClauseDto) {
    await this.get(organisationId, leaseId);
    return this.db.withTenant(organisationId, (trx) =>
      this.leaseClausesRepo.create(trx, {
        organisation_id: organisationId,
        lease_id: leaseId,
        clause_type: dto.clauseType,
        clause_text: dto.clauseText,
      }),
    );
  }

  async listClauses(organisationId: string, leaseId: string) {
    return this.db.withTenant(organisationId, (trx) => this.leaseClausesRepo.listForLease(trx, organisationId, leaseId));
  }

  private async transition<T>(
    organisationId: string,
    leaseId: string,
    targetStatus: string,
    work: (trx: Parameters<LeasesRepository['update']>[0], lease: NonNullable<Awaited<ReturnType<LeasesRepository['findById']>>>) => Promise<T>,
  ): Promise<T> {
    return this.db.withTenant(organisationId, async (trx) => {
      const lease = await this.leasesRepo.findById(trx, organisationId, leaseId);
      if (!lease) {
        throw new NotFoundException('Lease not found');
      }

      const allowedNext = ALLOWED_STATUS_TRANSITIONS[lease.status] ?? [];
      if (!allowedNext.includes(targetStatus)) {
        throw new BadRequestException(`Cannot transition lease from '${lease.status}' to '${targetStatus}'`);
      }

      return work(trx, lease);
    });
  }
}
