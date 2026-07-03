import { generateKeyPairSync } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { TokenService } from '../../src/modules/auth/services/token.service';

class FakeRedis {
  private readonly store = new Map<string, string>();

  async set(key: string, value: string, _mode: 'EX', _ttlSeconds: number): Promise<'OK'> {
    this.store.set(key, value);
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }
}

describe('TokenService', () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  let service: TokenService;

  beforeEach(() => {
    const values: Record<string, string> = {
      JWT_PRIVATE_KEY: privateKey,
      JWT_PUBLIC_KEY: publicKey,
      JWT_ISSUER: 'https://auth.estatecore.test',
    };
    const config = {
      getOrThrow: jest.fn((key: string) => values[key]),
      get: jest.fn((key: string) => values[key]),
    } as any;

    service = new TokenService(config, new FakeRedis() as any);
  });

  it('signs an access token whose claims round-trip through jsonwebtoken', () => {
    const token = service.signAccessToken({
      sub: 'user-1',
      organisation_id: 'org-1',
      role: 'OrgAdmin',
      permissions: ['invoice.read'],
    });

    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    expect(decoded).toMatchObject({
      sub: 'user-1',
      organisation_id: 'org-1',
      role: 'OrgAdmin',
      permissions: ['invoice.read'],
    });
  });

  it('signs and verifies an MFA challenge token for the right user', () => {
    const token = service.signMfaChallengeToken('user-1');
    expect(service.verifyMfaChallengeToken(token)).toBe('user-1');
  });

  it('rejects an MFA challenge token verification if the token is garbage', () => {
    expect(() => service.verifyMfaChallengeToken('not-a-jwt')).toThrow(UnauthorizedException);
  });

  it('issues a refresh token and rotates it exactly once', async () => {
    const token = await service.issueRefreshToken('user-1', 'org-1');
    const rotated = await service.rotateRefreshToken(token);

    expect(rotated.userId).toBe('user-1');
    expect(rotated.organisationId).toBe('org-1');
    expect(rotated.newRefreshToken).not.toBe(token);

    // the old token was single-use and has been deleted
    await expect(service.rotateRefreshToken(token)).rejects.toThrow(UnauthorizedException);
  });

  it('revokes a refresh token so it can no longer be rotated', async () => {
    const token = await service.issueRefreshToken('user-1', 'org-1');
    await service.revokeRefreshToken(token);
    await expect(service.rotateRefreshToken(token)).rejects.toThrow(UnauthorizedException);
  });
});
