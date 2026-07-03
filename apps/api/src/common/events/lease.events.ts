/**
 * Cross-module lease lifecycle event contracts. This is the flagship example
 * from docs/01-architecture.md section 3 ("lease.signed -> Financial module
 * creates the first invoice -> Community module notifies the tenant") — the
 * payload shape lives here, in neutral shared ground, rather than inside the
 * Lease module, so Financial/Property/Community listeners don't have to
 * import from (and thus depend on) the Lease module directly.
 */

export const LeaseEvent = {
  Signed: 'lease.signed',
  Terminated: 'lease.terminated',
  Expired: 'lease.expired',
} as const;

export class LeaseSignedEvent {
  constructor(
    public readonly organisationId: string,
    public readonly leaseId: string,
    public readonly unitId: string,
    public readonly tenantId: string,
    public readonly rentAmountKobo: string,
    public readonly rentFrequency: string,
    public readonly startDate: string,
  ) {}
}

/** Emitted for both LeaseEvent.Terminated and LeaseEvent.Expired — listeners generally treat both the same way (e.g. vacate the unit). */
export class LeaseEndedEvent {
  constructor(
    public readonly organisationId: string,
    public readonly leaseId: string,
    public readonly unitId: string,
    public readonly reason: 'terminated' | 'expired',
  ) {}
}
