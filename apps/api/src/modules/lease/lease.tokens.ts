// Kept in its own file for the same reason as financial.tokens.ts: lease.module.ts
// also imports LeaseExpiryProcessor (which uses this as an @InjectQueue(...)
// decorator argument), and a circular require would resolve it to `undefined`.
export const LEASE_EXPIRY_QUEUE = 'lease-expiry-scan';
