const NAIRA_FORMATTER = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a kobo amount (as returned by the API — a decimal string or bigint) as "₦x,xxx.xx". */
export function formatNaira(kobo: string | number | bigint): string {
  const value = BigInt(kobo);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const naira = Number(abs / 100n) + Number(abs % 100n) / 100;
  return `${negative ? "-" : ""}₦${NAIRA_FORMATTER.format(naira)}`;
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/**
 * Parses a user-typed Naira amount (e.g. "15000" or "15000.50") into an
 * integer kobo string, without floating-point multiplication — a stray
 * float like 150.1 * 100 can land on 15009.999999999998 in JS.
 */
export function nairaInputToKobo(input: string): string {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error("Enter a valid amount, e.g. 15000.00");
  }
  const [naira, fraction = ""] = trimmed.split(".");
  const kobo = fraction.padEnd(2, "0");
  return (BigInt(naira) * 100n + BigInt(kobo)).toString();
}
