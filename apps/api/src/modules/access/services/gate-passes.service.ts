import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, randomInt } from 'crypto';
import { TenantDatabaseService } from '../../../database/database.service';
import { VisitorsRepository } from '../repositories/visitors.repository';
import { GatePassesRepository } from '../repositories/gate-passes.repository';
import { IssueGatePassDto } from '../dto/issue-gate-pass.dto';
import { CheckInGatePassDto } from '../dto/check-in-gate-pass.dto';

@Injectable()
export class GatePassesService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly visitorsRepo: VisitorsRepository,
    private readonly gatePassesRepo: GatePassesRepository,
  ) {}

  /** Refuses to issue a pass for a blacklisted visitor — the block happens here, not just at the gate. */
  async issue(organisationId: string, dto: IssueGatePassDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const visitor = await this.visitorsRepo.findById(trx, organisationId, dto.visitorId);
      if (!visitor) {
        throw new NotFoundException('Visitor not found');
      }
      if (visitor.is_blacklisted) {
        throw new ForbiddenException(`Visitor is blacklisted: ${visitor.blacklist_reason ?? 'no reason recorded'}`);
      }

      const validFrom = new Date(dto.validFrom);
      const validUntil = new Date(dto.validUntil);
      if (validUntil <= validFrom) {
        throw new BadRequestException('validUntil must be after validFrom');
      }

      return this.gatePassesRepo.create(trx, {
        organisation_id: organisationId,
        visitor_id: dto.visitorId,
        otp_code: this.generateOtp(),
        qr_payload: this.generateQrPayload(),
        valid_from: validFrom,
        valid_until: validUntil,
      });
    });
  }

  async get(organisationId: string, gatePassId: string) {
    const gatePass = await this.db.withTenant(organisationId, (trx) => this.gatePassesRepo.findById(trx, organisationId, gatePassId));
    if (!gatePass) {
      throw new NotFoundException('Gate pass not found');
    }
    return gatePass;
  }

  async listForVisitor(organisationId: string, visitorId: string) {
    return this.db.withTenant(organisationId, (trx) => this.gatePassesRepo.listForVisitor(trx, organisationId, visitorId));
  }

  /** Org-wide, status-filtered listing for the gate/front-desk log. */
  async listByStatus(organisationId: string, status: string, options: { page: number; pageSize: number }) {
    const pageSize = Math.min(Math.max(options.pageSize, 1), 100);
    const page = Math.max(options.page, 1);
    const { rows, total } = await this.db.withTenant(organisationId, (trx) =>
      this.gatePassesRepo.listByStatus(trx, organisationId, status, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    );
    return { rows, total, page, pageSize };
  }

  /** Looked up by either the OTP the visitor recites or the QR payload the gate scans — see CheckInGatePassDto. */
  async checkIn(organisationId: string, dto: CheckInGatePassDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const gatePass = await this.gatePassesRepo.findByOtpOrQrPayload(trx, organisationId, dto.identifier);
      if (!gatePass) {
        throw new NotFoundException('No gate pass matches this code');
      }

      if (gatePass.status !== 'issued') {
        throw new BadRequestException(`Gate pass is '${gatePass.status}', not eligible for check-in`);
      }

      const now = new Date();
      if (now < new Date(gatePass.valid_from)) {
        throw new BadRequestException('Gate pass is not yet valid');
      }
      if (now > new Date(gatePass.valid_until)) {
        throw new BadRequestException('Gate pass has expired');
      }

      return this.gatePassesRepo.update(trx, organisationId, gatePass.id, { status: 'checked_in', checked_in_at: now });
    });
  }

  async checkOut(organisationId: string, gatePassId: string) {
    return this.db.withTenant(organisationId, async (trx) => {
      const gatePass = await this.gatePassesRepo.findById(trx, organisationId, gatePassId);
      if (!gatePass) {
        throw new NotFoundException('Gate pass not found');
      }
      if (gatePass.status !== 'checked_in') {
        throw new BadRequestException(`Gate pass is '${gatePass.status}', not eligible for check-out`);
      }

      return this.gatePassesRepo.update(trx, organisationId, gatePassId, { status: 'checked_out', checked_out_at: new Date() });
    });
  }

  async revoke(organisationId: string, gatePassId: string) {
    return this.db.withTenant(organisationId, async (trx) => {
      const gatePass = await this.gatePassesRepo.findById(trx, organisationId, gatePassId);
      if (!gatePass) {
        throw new NotFoundException('Gate pass not found');
      }
      if (gatePass.status !== 'issued') {
        throw new BadRequestException(`Only an unused ('issued') gate pass can be revoked, this one is '${gatePass.status}'`);
      }

      return this.gatePassesRepo.update(trx, organisationId, gatePassId, { status: 'revoked' });
    });
  }

  /** Used by the daily gate-pass-expiry job. */
  async expireOverdue(organisationId: string) {
    return this.db.withTenant(organisationId, async (trx) => {
      const expirable = await this.gatePassesRepo.listExpirable(trx, organisationId, new Date());
      const results = [];
      for (const gatePass of expirable) {
        results.push(await this.gatePassesRepo.update(trx, organisationId, gatePass.id, { status: 'expired' }));
      }
      return results;
    });
  }

  private generateOtp(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private generateQrPayload(): string {
    return `GP-${randomBytes(12).toString('hex')}`;
  }
}
