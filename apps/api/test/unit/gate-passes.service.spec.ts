import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { GatePassesService } from '../../src/modules/access/services/gate-passes.service';

describe('GatePassesService', () => {
  const organisationId = 'org-1';
  let db: any;
  let visitorsRepo: any;
  let gatePassesRepo: any;
  let service: GatePassesService;

  beforeEach(() => {
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };
    visitorsRepo = { findById: jest.fn() };
    gatePassesRepo = {
      create: jest.fn(async (_trx, gatePass) => ({ id: 'gp-1', ...gatePass })),
      findById: jest.fn(),
      findByOtpOrQrPayload: jest.fn(),
      update: jest.fn(async (_trx, _orgId, _id, changes) => ({ id: 'gp-1', ...changes })),
      listExpirable: jest.fn(),
    };

    service = new GatePassesService(db, visitorsRepo, gatePassesRepo);
  });

  describe('issue', () => {
    it('refuses to issue a pass for a blacklisted visitor', async () => {
      visitorsRepo.findById.mockResolvedValue({ id: 'visitor-1', is_blacklisted: true, blacklist_reason: 'Prior theft incident' });

      await expect(
        service.issue(organisationId, { visitorId: 'visitor-1', validFrom: '2026-08-01T09:00:00Z', validUntil: '2026-08-01T17:00:00Z' }),
      ).rejects.toThrow(ForbiddenException);
      expect(gatePassesRepo.create).not.toHaveBeenCalled();
    });

    it('rejects when validUntil is not after validFrom', async () => {
      visitorsRepo.findById.mockResolvedValue({ id: 'visitor-1', is_blacklisted: false });

      await expect(
        service.issue(organisationId, { visitorId: 'visitor-1', validFrom: '2026-08-01T17:00:00Z', validUntil: '2026-08-01T09:00:00Z' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('generates a 6-digit OTP and a GP-prefixed QR payload for a clean visitor', async () => {
      visitorsRepo.findById.mockResolvedValue({ id: 'visitor-1', is_blacklisted: false });

      const gatePass = await service.issue(organisationId, {
        visitorId: 'visitor-1',
        validFrom: '2026-08-01T09:00:00Z',
        validUntil: '2026-08-01T17:00:00Z',
      });

      expect(gatePass.otp_code).toMatch(/^\d{6}$/);
      expect(gatePass.qr_payload).toMatch(/^GP-[0-9a-f]{24}$/);
    });
  });

  describe('checkIn', () => {
    it('throws NotFoundException when no gate pass matches the identifier', async () => {
      gatePassesRepo.findByOtpOrQrPayload.mockResolvedValue(undefined);
      await expect(service.checkIn(organisationId, { identifier: '000000' })).rejects.toThrow(NotFoundException);
    });

    it('rejects check-in for a pass that is not in issued status', async () => {
      gatePassesRepo.findByOtpOrQrPayload.mockResolvedValue({
        id: 'gp-1',
        status: 'checked_out',
        valid_from: new Date(Date.now() - 1000),
        valid_until: new Date(Date.now() + 100000),
      });
      await expect(service.checkIn(organisationId, { identifier: '123456' })).rejects.toThrow(BadRequestException);
    });

    it('rejects check-in before valid_from', async () => {
      gatePassesRepo.findByOtpOrQrPayload.mockResolvedValue({
        id: 'gp-1',
        status: 'issued',
        valid_from: new Date(Date.now() + 100000),
        valid_until: new Date(Date.now() + 200000),
      });
      await expect(service.checkIn(organisationId, { identifier: '123456' })).rejects.toThrow(BadRequestException);
    });

    it('rejects check-in after valid_until', async () => {
      gatePassesRepo.findByOtpOrQrPayload.mockResolvedValue({
        id: 'gp-1',
        status: 'issued',
        valid_from: new Date(Date.now() - 200000),
        valid_until: new Date(Date.now() - 100000),
      });
      await expect(service.checkIn(organisationId, { identifier: '123456' })).rejects.toThrow(BadRequestException);
    });

    it('checks in a valid, currently-active gate pass', async () => {
      gatePassesRepo.findByOtpOrQrPayload.mockResolvedValue({
        id: 'gp-1',
        status: 'issued',
        valid_from: new Date(Date.now() - 1000),
        valid_until: new Date(Date.now() + 100000),
      });

      const result = await service.checkIn(organisationId, { identifier: '123456' });

      expect(result.status).toBe('checked_in');
      expect(gatePassesRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        organisationId,
        'gp-1',
        expect.objectContaining({ status: 'checked_in', checked_in_at: expect.any(Date) }),
      );
    });
  });

  describe('checkOut', () => {
    it('rejects check-out for a pass that was never checked in', async () => {
      gatePassesRepo.findById.mockResolvedValue({ id: 'gp-1', status: 'issued' });
      await expect(service.checkOut(organisationId, 'gp-1')).rejects.toThrow(BadRequestException);
    });

    it('checks out a checked-in pass', async () => {
      gatePassesRepo.findById.mockResolvedValue({ id: 'gp-1', status: 'checked_in' });
      const result = await service.checkOut(organisationId, 'gp-1');
      expect(result.status).toBe('checked_out');
    });
  });

  describe('revoke', () => {
    it('rejects revoking a pass that has already been used', async () => {
      gatePassesRepo.findById.mockResolvedValue({ id: 'gp-1', status: 'checked_in' });
      await expect(service.revoke(organisationId, 'gp-1')).rejects.toThrow(BadRequestException);
    });

    it('revokes an unused issued pass', async () => {
      gatePassesRepo.findById.mockResolvedValue({ id: 'gp-1', status: 'issued' });
      const result = await service.revoke(organisationId, 'gp-1');
      expect(result.status).toBe('revoked');
    });
  });
});
