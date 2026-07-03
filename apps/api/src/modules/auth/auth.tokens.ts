/**
 * DI token kept in its own file for the same reason as database.tokens.ts:
 * auth.module.ts also imports TokenService (which uses this as an
 * `@Inject(...)` decorator argument), and declaring the constant inside
 * auth.module.ts would create a circular require that resolves to
 * `undefined` at the point the decorator evaluates.
 */
export const REDIS_CLIENT = 'REDIS_CLIENT';
