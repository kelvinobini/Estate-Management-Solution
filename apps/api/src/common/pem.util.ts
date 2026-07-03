/**
 * .env files don't handle multi-line values well, so PEM keys (JWT_PRIVATE_KEY/
 * JWT_PUBLIC_KEY) are conventionally stored on one line with literal `\n`
 * escape sequences and unescaped here at read time. A PEM pasted with real
 * newlines (e.g. via a secrets manager, not a .env file) passes through unchanged.
 */
export function normalizePem(value: string): string {
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value;
}
