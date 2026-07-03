/**
 * DI token kept in its own file, imported by both database.module.ts and
 * database.service.ts. Declaring it inside database.module.ts (which also
 * imports database.service.ts) creates a circular require: when Node
 * resolves the cycle, database.service.ts's `@Inject(KYSELY_INSTANCE)`
 * decorator would evaluate before database.module.ts had assigned the
 * constant, capturing `undefined` as the token and breaking DI at runtime.
 */
export const KYSELY_INSTANCE = 'KYSELY_INSTANCE';
