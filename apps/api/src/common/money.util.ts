/**
 * All monetary values in EstateCore are integers denominated in kobo
 * (1 NGN = 100 kobo) and handled as BigInt to avoid floating-point error.
 * Never use `Number` for arithmetic on money — only for display formatting
 * after conversion back to a decimal string.
 */

export function toKobo(value: string | number | bigint): bigint {
  return BigInt(value);
}

export function addKobo(...amounts: Array<string | number | bigint>): bigint {
  return amounts.reduce<bigint>((sum, amount) => sum + toKobo(amount), 0n);
}

export function subtractKobo(a: string | number | bigint, b: string | number | bigint): bigint {
  return toKobo(a) - toKobo(b);
}

/**
 * Computes VAT on a subtotal given a percentage rate (e.g. 7.5 for Nigeria's
 * standard VAT rate). Rounds to the nearest kobo using round-half-up.
 */
export function computeVatKobo(subtotalKobo: string | number | bigint, vatRatePercent: number): bigint {
  const subtotal = toKobo(subtotalKobo);
  const rateBasisPoints = BigInt(Math.round(vatRatePercent * 100)); // e.g. 7.5% -> 750 basis points
  const numerator = subtotal * rateBasisPoints + 5000n; // + half of 10000 for round-half-up
  return numerator / 10000n;
}

/**
 * Multiplies a kobo unit price by a decimal quantity (e.g. kWh consumption)
 * without floating point, by parsing the decimal string directly into a
 * scaled BigInt rather than going through `Number(quantity) * scale` (which
 * would reintroduce float imprecision for the quantity itself). Rounds to
 * the nearest kobo using round-half-up, same convention as computeVatKobo.
 */
export function multiplyKoboByQuantity(unitPriceKobo: string | number | bigint, quantity: string | number, decimalPlaces = 3): bigint {
  const price = toKobo(unitPriceKobo);
  const scale = 10n ** BigInt(decimalPlaces);
  const quantityScaled = parseDecimalToScaledBigInt(quantity.toString(), decimalPlaces);
  const numerator = price * quantityScaled + scale / 2n;
  return numerator / scale;
}

function parseDecimalToScaledBigInt(value: string, decimalPlaces: number): bigint {
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [wholePart, fractionPart = ''] = unsigned.split('.');
  const paddedFraction = (fractionPart + '0'.repeat(decimalPlaces)).slice(0, decimalPlaces);
  const scaled = BigInt(wholePart || '0') * 10n ** BigInt(decimalPlaces) + BigInt(paddedFraction || '0');
  return negative ? -scaled : scaled;
}

function formatScaledBigInt(value: bigint, decimalPlaces: number): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const scale = 10n ** BigInt(decimalPlaces);
  const whole = abs / scale;
  const fraction = (abs % scale).toString().padStart(decimalPlaces, '0');
  return `${negative ? '-' : ''}${whole}${decimalPlaces > 0 ? `.${fraction}` : ''}`;
}

/**
 * Subtracts two arbitrary-precision decimal quantities (e.g. meter reading
 * values, NUMERIC(14,3)) without floating point. Unlike subtractKobo, these
 * are not integer kobo amounts — `BigInt("1234.567")` throws — so this
 * parses each operand into a scaled BigInt first.
 */
export function subtractDecimalQuantities(a: string, b: string, decimalPlaces = 3): string {
  const diff = parseDecimalToScaledBigInt(a, decimalPlaces) - parseDecimalToScaledBigInt(b, decimalPlaces);
  return formatScaledBigInt(diff, decimalPlaces);
}

export function formatNaira(kobo: string | number | bigint): string {
  const value = toKobo(kobo);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const naira = abs / 100n;
  const koboRemainder = abs % 100n;
  const formatted = `${naira.toLocaleString('en-NG')}.${koboRemainder.toString().padStart(2, '0')}`;
  return `${negative ? '-' : ''}NGN ${formatted}`;
}
