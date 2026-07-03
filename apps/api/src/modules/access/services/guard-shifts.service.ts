import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { GuardsRepository } from '../repositories/guards.repository';
import { GuardShiftsRepository } from '../repositories/guard-shifts.repository';
import { PatrolLogsRepository } from '../repositories/patrol-logs.repository';
import { CreateGuardShiftDto } from '../dto/create-guard-shift.dto';
import { CreatePatrolLogDto } from '../dto/create-patrol-log.dto';

@Injectable()
export class GuardShiftsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly guardsRepo: GuardsRepository,
    private readonly shiftsRepo: GuardShiftsRepository,
    private readonly patrolLogsRepo: PatrolLogsRepository,
  ) {}

  async create(organisationId: string, guardId: string, dto: CreateGuardShiftDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const guard = await this.guardsRepo.findById(trx, organisationId, guardId);
      if (!guard) {
        throw new NotFoundException('Guard not found');
      }

      const start = new Date(dto.shiftStart);
      const end = new Date(dto.shiftEnd);
      if (end <= start) {
        throw new BadRequestException('shiftEnd must be after shiftStart');
      }

      const overlapping = await this.shiftsRepo.findOverlapping(trx, organisationId, guardId, start, end);
      if (overlapping.length > 0) {
        throw new BadRequestException('This shift overlaps with an existing shift for the same guard');
      }

      return this.shiftsRepo.create(trx, { organisation_id: organisationId, guard_id: guardId, shift_start: start, shift_end: end });
    });
  }

  async listForGuard(organisationId: string, guardId: string) {
    return this.db.withTenant(organisationId, (trx) => this.shiftsRepo.listForGuard(trx, organisationId, guardId));
  }

  /** Exposed for controller-level ownership checks (SecurityGuard callers may only touch their own shifts). */
  async getShift(organisationId: string, shiftId: string) {
    const shift = await this.db.withTenant(organisationId, (trx) => this.shiftsRepo.findById(trx, organisationId, shiftId));
    if (!shift) {
      throw new NotFoundException('Guard shift not found');
    }
    return shift;
  }

  async logPatrol(organisationId: string, shiftId: string, dto: CreatePatrolLogDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const shift = await this.shiftsRepo.findById(trx, organisationId, shiftId);
      if (!shift) {
        throw new NotFoundException('Guard shift not found');
      }

      return this.patrolLogsRepo.create(trx, {
        organisation_id: organisationId,
        guard_shift_id: shiftId,
        checkpoint_name: dto.checkpointName,
        notes: dto.notes ?? null,
      });
    });
  }

  async listPatrolLogs(organisationId: string, shiftId: string) {
    return this.db.withTenant(organisationId, (trx) => this.patrolLogsRepo.listForShift(trx, organisationId, shiftId));
  }
}
