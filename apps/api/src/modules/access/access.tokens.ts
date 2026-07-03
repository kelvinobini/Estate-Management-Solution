// Kept in its own file for the same reason as financial.tokens.ts / lease.tokens.ts /
// maintenance.tokens.ts: access.module.ts also imports GatePassExpiryProcessor (which
// uses this as an @InjectQueue(...) decorator argument), and a circular require would
// resolve it to `undefined`.
export const GATE_PASS_EXPIRY_QUEUE = 'gate-pass-expiry-scan';
