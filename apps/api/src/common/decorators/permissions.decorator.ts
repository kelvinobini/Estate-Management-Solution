import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Declares the permission codes (matching `permissions.code` in the schema,
 * e.g. 'invoice.void') required to invoke a controller method. Enforced by
 * PermissionsGuard.
 */
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
