import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JwtClaims } from '../interfaces/authenticated-request.interface';
import { normalizePem } from '../pem.util';

/**
 * Verifies the self-issued RS256 JWT (see modules/auth) on every request and
 * attaches its claims to `request.user`. MFA enforcement for admin/finance
 * roles is handled at token-issuance time by the Auth service, not re-checked here.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.slice('Bearer '.length);
    const publicKey = normalizePem(this.config.getOrThrow<string>('JWT_PUBLIC_KEY'));

    try {
      const claims = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: this.config.get<string>('JWT_ISSUER'),
      }) as unknown as JwtClaims;

      request.user = claims;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
