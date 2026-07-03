/**
 * BullMQ queue names, kept in their own file for the same reason as
 * database.tokens.ts: financial.module.ts also imports the job processors
 * that use these as `@InjectQueue(...)` decorator arguments, and declaring
 * the constants inside financial.module.ts would create a circular require
 * that resolves to `undefined` at the point the decorator evaluates.
 */
// BullMQ queue names cannot contain ':' — it's used internally as a Redis key delimiter.
export const RECURRING_INVOICES_QUEUE = 'financial-recurring-invoices';
export const ARREARS_SCAN_QUEUE = 'financial-arrears-scan';
