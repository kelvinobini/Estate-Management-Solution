import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { TenantDatabaseService } from '../../../database/database.service';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { AuthRepository } from '../repositories/auth.repository';
import { TokenService } from './token.service';
import { MfaService } from './mfa.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ConfirmMfaEnrollmentDto, VerifyMfaLoginDto } from '../dto/mfa.dto';
import { REDIS_CLIENT } from '../auth.tokens';

/**
 * Roles that must have MFA enrolled before they can obtain a full session,
 * per the platform's "MFA mandatory for admin and finance roles" requirement.
 */
const MFA_REQUIRED_ROLES = new Set(['SuperAdmin', 'OrgAdmin', 'FinanceOfficer']);

/** Failed-attempt limits — password guessing gets the usual generous window; a
 *  6-digit TOTP code only has 1e6 combinations, so its window is tighter and
 *  matches the challenge token's own TTL (no point rate-limiting past when the
 *  token itself expires). */
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const MFA_MAX_ATTEMPTS = 5;
const MFA_WINDOW_SECONDS = 5 * 60;

type LoginResult =
  | { status: 'mfa_setup_required'; setupToken: string }
  | { status: 'mfa_challenge'; mfaChallengeToken: string }
  | { status: 'authenticated'; accessToken: string; refreshToken: string };

/**
 * Auth is inherently a pre-tenant-context concern — until a user is
 * identified there is no `organisation_id` to scope RLS by — so every DB
 * access here goes through `TenantDatabaseService.runAsService` (BYPASSRLS)
 * rather than `withTenant`, consistent with how PaymentsService looks up a
 * webhook's payment row before it knows which organisation it belongs to.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly authRepo: AuthRepository,
    private readonly tokens: TokenService,
    private readonly mfa: MfaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const rateLimitKey = `login_attempts:${dto.organisationSlug}:${dto.email.toLowerCase()}`;
    await this.assertNotLocked(rateLimitKey, LOGIN_MAX_ATTEMPTS);

    const { user, roleNames } = await this.db.runAsService(async (trx) => {
      const organisation = await this.authRepo.findOrganisationBySlug(trx, dto.organisationSlug);
      if (!organisation) {
        await this.recordFailedAttempt(rateLimitKey, LOGIN_WINDOW_SECONDS);
        throw new UnauthorizedException('Invalid credentials');
      }

      const user = await this.authRepo.findActiveUserByEmail(trx, organisation.id, dto.email);
      if (!user?.password_hash || !(await bcrypt.compare(dto.password, user.password_hash))) {
        await this.recordFailedAttempt(rateLimitKey, LOGIN_WINDOW_SECONDS);
        throw new UnauthorizedException('Invalid credentials');
      }

      const roleNames = await this.authRepo.findRoleNamesForUser(trx, user.id);
      return { user, roleNames };
    });

    await this.redis.del(rateLimitKey);
    const requiresMfa = roleNames.some((role) => MFA_REQUIRED_ROLES.has(role));

    if (requiresMfa && !user.mfa_enabled) {
      const setupToken = this.tokens.signAccessToken(this.buildClaims(user.id, user.organisation_id, roleNames, []));
      return { status: 'mfa_setup_required', setupToken };
    }

    if (user.mfa_enabled) {
      return { status: 'mfa_challenge', mfaChallengeToken: this.tokens.signMfaChallengeToken(user.id) };
    }

    const session = await this.issueSession(user.id, user.organisation_id, roleNames);
    return { status: 'authenticated', ...session };
  }

  async verifyMfaAndCompleteLogin(dto: VerifyMfaLoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const userId = this.tokens.verifyMfaChallengeToken(dto.mfaChallengeToken);
    const rateLimitKey = `mfa_attempts:${userId}`;
    await this.assertNotLocked(rateLimitKey, MFA_MAX_ATTEMPTS);

    const { user, roleNames } = await this.db.runAsService(async (trx) => {
      const user = await this.authRepo.findById(trx, userId);
      if (!user) {
        throw new UnauthorizedException('Invalid challenge');
      }
      const roleNames = await this.authRepo.findRoleNamesForUser(trx, user.id);
      return { user, roleNames };
    });

    if (!user.mfa_enabled || !user.mfa_secret_encrypted || !this.mfa.verifyCode(user.mfa_secret_encrypted, userId, dto.code)) {
      await this.recordFailedAttempt(rateLimitKey, MFA_WINDOW_SECONDS);
      throw new UnauthorizedException('Invalid MFA code');
    }

    await this.redis.del(rateLimitKey);
    return this.issueSession(user.id, user.organisation_id, roleNames);
  }

  async refresh(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    const { userId, organisationId, newRefreshToken } = await this.tokens.rotateRefreshToken(dto.refreshToken);

    const { roleNames, permissions } = await this.db.runAsService(async (trx) => {
      const user = await this.authRepo.findById(trx, userId);
      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('Account is no longer active');
      }
      const roleNames = await this.authRepo.findRoleNamesForUser(trx, userId);
      const permissions = await this.authRepo.findPermissionCodesForUser(trx, userId);
      return { roleNames, permissions };
    });

    const accessToken = this.tokens.signAccessToken(this.buildClaims(userId, organisationId, roleNames, permissions));
    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    await this.tokens.revokeRefreshToken(dto.refreshToken);
  }

  /**
   * Begins MFA enrollment for an already-authenticated user (see AuthController
   * for the limited-scope guard). The TOTP label is cosmetic only — it's
   * embedded in the provisioning URI for display in the authenticator app and
   * does not affect code generation — so the user id is used rather than
   * threading the email through the JWT.
   */
  async enrollMfa(userId: string): Promise<{ provisioningUri: string }> {
    const enrollment = this.mfa.generateEnrollment(userId);
    await this.db.runAsService((trx) => this.authRepo.setMfaSecret(trx, userId, enrollment.encryptedSecret));
    return { provisioningUri: enrollment.provisioningUri };
  }

  /** Confirms enrollment by validating one live code, then flips mfa_enabled on. */
  async confirmMfaEnrollment(userId: string, dto: ConfirmMfaEnrollmentDto): Promise<void> {
    const user = await this.db.runAsService((trx) => this.authRepo.findById(trx, userId));
    if (!user?.mfa_secret_encrypted) {
      throw new BadRequestException('No MFA enrollment in progress for this account');
    }
    if (!this.mfa.verifyCode(user.mfa_secret_encrypted, userId, dto.code)) {
      throw new UnauthorizedException('Invalid MFA code');
    }
    await this.db.runAsService((trx) => this.authRepo.enableMfa(trx, userId));
  }

  private async issueSession(
    userId: string,
    organisationId: string,
    roleNames: string[],
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const permissions = await this.db.runAsService(async (trx) => {
      await this.authRepo.updateLastLogin(trx, userId);
      return this.authRepo.findPermissionCodesForUser(trx, userId);
    });

    const accessToken = this.tokens.signAccessToken(this.buildClaims(userId, organisationId, roleNames, permissions));
    const refreshToken = await this.tokens.issueRefreshToken(userId, organisationId);
    return { accessToken, refreshToken };
  }

  private buildClaims(userId: string, organisationId: string, roleNames: string[], permissions: string[]): JwtClaims {
    return {
      sub: userId,
      organisation_id: organisationId,
      role: roleNames[0] ?? 'Tenant',
      permissions,
    };
  }

  /** Only failed attempts count; a successful login/MFA check resets its own key. */
  private async assertNotLocked(key: string, maxAttempts: number): Promise<void> {
    const attempts = await this.redis.get(key);
    if (attempts && Number(attempts) >= maxAttempts) {
      const ttl = await this.redis.ttl(key);
      throw new HttpException(
        `Too many attempts. Try again in ${Math.max(1, Math.ceil(ttl / 60))} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async recordFailedAttempt(key: string, windowSeconds: number): Promise<void> {
    const attempts = await this.redis.incr(key);
    if (attempts === 1) {
      await this.redis.expire(key, windowSeconds);
    }
  }
}
