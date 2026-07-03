import * as bcrypt from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../src/modules/auth/services/auth.service';

describe('AuthService.login', () => {
  const organisation = { id: 'org-1', slug: 'demo' };
  let passwordHash: string;
  let db: any;
  let authRepo: any;
  let tokens: any;
  let mfa: any;
  let redis: any;
  let service: AuthService;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('correct-password', 4);
  });

  function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'user-1',
      organisation_id: organisation.id,
      email: 'admin@demo.estatecore.app',
      password_hash: passwordHash,
      mfa_enabled: false,
      mfa_secret_encrypted: null,
      status: 'active',
      ...overrides,
    };
  }

  beforeEach(() => {
    db = { runAsService: jest.fn((work: (trx: unknown) => unknown) => work({})) };
    authRepo = {
      findOrganisationBySlug: jest.fn(async () => organisation),
      findActiveUserByEmail: jest.fn(),
      findRoleNamesForUser: jest.fn(),
      updateLastLogin: jest.fn(async () => undefined),
      findPermissionCodesForUser: jest.fn(async () => ['invoice.read']),
      findById: jest.fn(),
      setMfaSecret: jest.fn(),
      enableMfa: jest.fn(),
    };
    tokens = {
      signAccessToken: jest.fn(() => 'access-token'),
      signMfaChallengeToken: jest.fn(() => 'mfa-challenge-token'),
      verifyMfaChallengeToken: jest.fn(() => 'user-1'),
      issueRefreshToken: jest.fn(async () => 'refresh-token'),
      rotateRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
    };
    mfa = { generateEnrollment: jest.fn(), verifyCode: jest.fn() };
    redis = {
      get: jest.fn(async () => null),
      incr: jest.fn(async () => 1),
      expire: jest.fn(async () => undefined),
      ttl: jest.fn(async () => 900),
      del: jest.fn(async () => undefined),
    };

    service = new AuthService(db, authRepo, tokens, mfa, redis);
  });

  it('rejects an incorrect password', async () => {
    authRepo.findActiveUserByEmail.mockResolvedValue(makeUser());
    authRepo.findRoleNamesForUser.mockResolvedValue(['Tenant']);

    await expect(
      service.login({ organisationSlug: 'demo', email: 'admin@demo.estatecore.app', password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects login for an unknown organisation slug without revealing whether the org exists', async () => {
    authRepo.findOrganisationBySlug.mockResolvedValue(undefined);

    await expect(
      service.login({ organisationSlug: 'nonexistent', email: 'x@example.com', password: 'whatever1' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('logs a non-privileged role straight through to an authenticated session', async () => {
    authRepo.findActiveUserByEmail.mockResolvedValue(makeUser());
    authRepo.findRoleNamesForUser.mockResolvedValue(['Tenant']);

    const result = await service.login({
      organisationSlug: 'demo',
      email: 'admin@demo.estatecore.app',
      password: 'correct-password',
    });

    expect(result).toEqual({ status: 'authenticated', accessToken: 'access-token', refreshToken: 'refresh-token' });
    expect(authRepo.updateLastLogin).toHaveBeenCalledWith(expect.anything(), 'user-1');
  });

  it('requires MFA setup for a privileged role that has not enrolled yet', async () => {
    authRepo.findActiveUserByEmail.mockResolvedValue(makeUser({ mfa_enabled: false }));
    authRepo.findRoleNamesForUser.mockResolvedValue(['OrgAdmin']);

    const result = await service.login({
      organisationSlug: 'demo',
      email: 'admin@demo.estatecore.app',
      password: 'correct-password',
    });

    expect(result).toEqual({ status: 'mfa_setup_required', setupToken: 'access-token' });
    // the setup-only token must carry zero permissions
    expect(tokens.signAccessToken).toHaveBeenCalledWith(expect.objectContaining({ permissions: [] }));
  });

  it('issues an MFA challenge for a privileged role that already has MFA enabled', async () => {
    authRepo.findActiveUserByEmail.mockResolvedValue(makeUser({ mfa_enabled: true }));
    authRepo.findRoleNamesForUser.mockResolvedValue(['OrgAdmin']);

    const result = await service.login({
      organisationSlug: 'demo',
      email: 'admin@demo.estatecore.app',
      password: 'correct-password',
    });

    expect(result).toEqual({ status: 'mfa_challenge', mfaChallengeToken: 'mfa-challenge-token' });
  });

  it('completes login after a valid MFA code', async () => {
    authRepo.findById.mockResolvedValue(makeUser({ mfa_enabled: true, mfa_secret_encrypted: 'enc-secret' }));
    authRepo.findRoleNamesForUser.mockResolvedValue(['OrgAdmin']);
    mfa.verifyCode.mockReturnValue(true);

    const result = await service.verifyMfaAndCompleteLogin({ mfaChallengeToken: 'mfa-challenge-token', code: '123456' });

    expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
  });

  it('rejects an invalid MFA code', async () => {
    authRepo.findById.mockResolvedValue(makeUser({ mfa_enabled: true, mfa_secret_encrypted: 'enc-secret' }));
    authRepo.findRoleNamesForUser.mockResolvedValue(['OrgAdmin']);
    mfa.verifyCode.mockReturnValue(false);

    await expect(
      service.verifyMfaAndCompleteLogin({ mfaChallengeToken: 'mfa-challenge-token', code: '000000' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('locks out login after too many failed attempts, without touching the database', async () => {
    redis.get.mockResolvedValue('5');

    await expect(
      service.login({ organisationSlug: 'demo', email: 'admin@demo.estatecore.app', password: 'wrong-password' }),
    ).rejects.toMatchObject({ status: 429 });
    expect(authRepo.findOrganisationBySlug).not.toHaveBeenCalled();
  });

  it('resets the login lockout counter on a successful login', async () => {
    authRepo.findActiveUserByEmail.mockResolvedValue(makeUser());
    authRepo.findRoleNamesForUser.mockResolvedValue(['Tenant']);

    await service.login({
      organisationSlug: 'demo',
      email: 'admin@demo.estatecore.app',
      password: 'correct-password',
    });

    expect(redis.del).toHaveBeenCalledWith('login_attempts:demo:admin@demo.estatecore.app');
  });

  it('locks out MFA verification after too many failed codes', async () => {
    redis.get.mockResolvedValue('5');

    await expect(
      service.verifyMfaAndCompleteLogin({ mfaChallengeToken: 'mfa-challenge-token', code: '000000' }),
    ).rejects.toMatchObject({ status: 429 });
    expect(authRepo.findById).not.toHaveBeenCalled();
  });
});
