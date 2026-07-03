const NAIRA_FORMATTER = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a kobo amount (as returned by the API — a decimal string) as "₦x,xxx.xx". Mirrors apps/web/src/lib/format.ts. */
export function formatNaira(kobo: string | number | bigint): string {
  const value = BigInt(kobo);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const naira = Number(abs / 100n) + Number(abs % 100n) / 100;
  return `${negative ? "-" : ""}₦${NAIRA_FORMATTER.format(naira)}`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
