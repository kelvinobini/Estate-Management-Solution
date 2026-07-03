import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit_action';

export interface AuditActionMetadata {
  /** e.g. 'lease.terminated', 'invoice.voided' — recorded verbatim in audit_logs.action. */
  action: string;
  /** e.g. 'lease', 'invoice' — recorded in audit_logs.entity_type. */
  entityType: string;
  /** Name of the route param holding the entity id (defaults to 'id'). */
  entityIdParam?: string;
  /**
   * Top-level keys to strip from the handler's return value before it's
   * stored as audit_logs.after_state — e.g. 'temporaryPassword' on
   * user.invited. The audit trail should record that the action happened,
   * not secrets that were only meant for the one-time HTTP response.
   */
  redactFields?: string[];
}

/**
 * Marks a controller method as a destructive/compliance-sensitive action to
 * be recorded in the append-only audit_logs table (see docs/01-architecture.md
 * "every destructive action must be logged to audit trail"). Paired with
 * AuditLogInterceptor, which does the actual logging after the handler
 * succeeds — see ComplianceModule for where both get wired onto endpoints.
 */
export const AuditAction = (metadata: AuditActionMetadata) => SetMetadata(AUDIT_ACTION_KEY, metadata);
