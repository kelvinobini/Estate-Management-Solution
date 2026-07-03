// Kept in its own file for the same reason as financial.tokens.ts / lease.tokens.ts /
// maintenance.tokens.ts / access.tokens.ts: documents.module.ts also imports
// ExpiryAlertScanProcessor (which uses this as an @InjectQueue(...) decorator
// argument), and a circular require would resolve it to `undefined`.
export const EXPIRY_ALERT_SCAN_QUEUE = 'expiry-alert-scan';
