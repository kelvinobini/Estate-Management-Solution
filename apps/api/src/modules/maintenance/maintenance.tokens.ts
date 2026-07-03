// Kept in its own file for the same reason as financial.tokens.ts / lease.tokens.ts:
// maintenance.module.ts also imports PreventiveMaintenanceProcessor (which uses this
// as an @InjectQueue(...) decorator argument), and a circular require would resolve
// it to `undefined`.
export const PREVENTIVE_MAINTENANCE_QUEUE = 'preventive-maintenance-scan';
