import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, switchMap } from 'rxjs';
import { AuthenticatedRequest } from '../../../common/interfaces/authenticated-request.interface';
import { AuditLogsService } from '../services/audit-logs.service';
import { AUDIT_ACTION_KEY, AuditActionMetadata } from '../decorators/audit-action.decorator';

/**
 * Records an audit_logs entry once the handler completes successfully — if
 * the handler throws, nothing is logged, since there's nothing to audit for
 * an action that didn't actually happen. Entity id comes from a route param
 * (see AuditActionMetadata.entityIdParam); the handler's return value is
 * stored as after_state on a best-effort basis.
 *
 * Uses `switchMap` (not `tap`) so the audit write is actually awaited before
 * the response completes — `tap`'s callback isn't awaited by RxJS even if it
 * returns a Promise. A failure to *write* the audit log is logged via Nest's
 * Logger rather than thrown, since the underlying business action already
 * succeeded and shouldn't be turned into a 500 just because the audit
 * subsystem hiccuped.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<AuditActionMetadata | undefined>(AUDIT_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const entityId = firstValue(request.params[metadata.entityIdParam ?? 'id']);
    const userAgent = firstValue(request.headers['user-agent']);

    return next.handle().pipe(
      switchMap(async (result) => {
        try {
          await this.auditLogsService.record({
            organisationId: request.user.organisation_id,
            actorUserId: request.user.sub,
            action: metadata.action,
            entityType: metadata.entityType,
            entityId,
            afterState: redact(result, metadata.redactFields),
            ipAddress: request.ip ?? null,
            userAgent,
          });
        } catch (error) {
          this.logger.error(`Failed to write audit log for action '${metadata.action}': ${(error as Error).message}`);
        }
        return result;
      }),
    );
  }
}

/** Express types several request fields (route params, some headers) as `string | string[] | undefined` even though a single value is the overwhelmingly common case. */
function firstValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

/** Strips the given top-level keys before the value is persisted as after_state — the HTTP response itself is untouched. */
function redact(value: unknown, fields: string[] | undefined): unknown {
  if (!fields || fields.length === 0 || typeof value !== 'object' || value === null) {
    return value;
  }
  const copy = { ...(value as Record<string, unknown>) };
  for (const field of fields) {
    delete copy[field];
  }
  return copy;
}
