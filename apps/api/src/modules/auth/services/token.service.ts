import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import Redis from 'ioredis';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { normalizePem } from '../../../common/pem.util';
import { REDIS_CLIENT } from '../auth.tokens';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const MFA_CHALLENGE_TTL_SECONDS = 5 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

interface MfaChallengePayload {
  sub: string;
  typ: 'mfa_challenge';
}

interface RefreshTokenRecord {
  userId: string;
  organisationId: string;
}

/**
 * Issues and verifies RS256 access tokens, short-lived MFA challenge tokens,
 * and opaque (non-JWT) refresh tokens. Refresh tokens are stored in Redis as
 * a hash of the token, never the raw value, and are single-use — each
 * refresh call rotates to a new token, so a replayed old token is rejected.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  signAccessToken(claims: JwtClaims): string {
    // `claims` already carries `sub`; passing a `subject` option too makes
    // jsonwebtoken throw ("payload already has a sub property").
    return jwt.sign(claims, this.privateKey, {
      algorithm: 'RS256',
      issuer: this.config.get<string>('JWT_ISSUER'),
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
  }

  signMfaChallengeToken(userId: string): string {
    const payload: MfaChallengePayload = { sub: userId, typ: 'mfa_challenge' };
    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      issuer: this.config.get<string>('JWT_ISSUER'),
      expiresIn: MFA_CHALLENGE_TTL_SECONDS,
    });
  }

  verifyMfaChallengeToken(token: string): string {
    try {
      const payload = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: this.config.get<string>('JWT_ISSUER'),
      }) as unknown as MfaChallengePayload;

      if (payload.typ !== 'mfa_challenge') {
        throw new UnauthorizedException('Invalid challenge token');
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA challenge token');
    }
  }

  async issueRefreshToken(userId: string, organisationId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const record: RefreshTokenRecord = { userId, organisationId };
    await this.redis.set(this.refreshKey(token), JSON.stringify(record), 'EX', REFRESH_TOKEN_TTL_SECONDS);
    return token;
  }

  /** Validates and single-use-rotates a refresh token, returning the new token alongside the record it pointed to. */
  async rotateRefreshToken(oldToken: string): Promise<RefreshTokenRecord & { newRefreshToken: string }> {
    const key = this.refreshKey(oldToken);
    const raw = await this.redis.get(key);
    if (!raw) {
      throw new UnauthorizedException('Refresh token is invalid, expired, or already used');
    }

    const record = JSON.parse(raw) as RefreshTokenRecord;
    await this.redis.del(key);
    const newRefreshToken = await this.issueRefreshToken(record.userId, record.organisationId);
    return { ...record, newRefreshToken };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.redis.del(this.refreshKey(token));
  }

  private refreshKey(token: string): string {
    return `refresh:${createHash('sha256').update(token).digest('hex')}`;
  }

  private get privateKey(): string {
    return normalizePem(this.config.getOrThrow<string>('JWT_PRIVATE_KEY'));
  }

  private get publicKey(): string {
    return normalizePem(this.config.getOrThrow<string>('JWT_PUBLIC_KEY'));
  }
}
