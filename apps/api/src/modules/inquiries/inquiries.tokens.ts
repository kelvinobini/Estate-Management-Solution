/** DI token kept in its own file for the same reason as auth.tokens.ts (avoids a circular require between the module and the service that @Inject()s it). */
export const INQUIRIES_REDIS_CLIENT = 'INQUIRIES_REDIS_CLIENT';
