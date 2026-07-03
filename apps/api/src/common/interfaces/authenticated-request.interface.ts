import { Request } from 'express';

/**
 * Claims carried by the self-issued RS256 JWT (see docs/01-architecture.md section 5):
 * `organisation_id` drives Postgres RLS via TenantDatabaseService, `permissions` drives
 * the PermissionsGuard.
 */
export interface JwtClaims {
  sub: string;
  organisation_id: string;
  role: string;
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  user: JwtClaims;
}
