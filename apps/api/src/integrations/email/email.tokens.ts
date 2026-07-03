/** BullMQ queue name — kept in its own file for the same reason as auth.tokens.ts (avoids a circular require between the module and the processor that @InjectQueue()s it). */
export const EMAIL_QUEUE = 'email';
