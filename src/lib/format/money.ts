// AUD formatting. Whole dollars in headlines, cents in transaction lists (docs/02_voice_and_copy.md).

/** Round to cents, avoiding float drift (0.1 + 0.2). */
export const cents = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Sum money values without float drift. */
export const sumMoney = (values: number[]): number => cents(values.reduce((a, b) => a + Math.round(b * 100), 0) / 100);

function group(n: number): string {
  return Math.trunc(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** $1,234.56 (cents) or $1,235 (whole). Negative → −$53 (true minus sign). */
export function formatAUD(n: number, opts: { cents?: boolean } = {}): string {
  const showCents = opts.cents ?? false;
  const abs = Math.abs(n);
  const rounded = showCents ? cents(abs) : Math.round(abs);
  const whole = group(rounded);
  const frac = showCents ? "." + Math.round((rounded - Math.trunc(rounded)) * 100).toString().padStart(2, "0") : "";
  const sign = n < 0 && rounded !== 0 ? "−" : "";
  return `${sign}$${whole}${frac}`;
}

/** Whole-dollar headline: $1,832 */
export const formatWhole = (n: number) => formatAUD(n);
/** Transaction list: $1,831.95 */
export const formatCents = (n: number) => formatAUD(n, { cents: true });

/** 16.5% — one decimal by default; drops a trailing ".0" (16.0 → 16%). */
export function formatPercent(n: number, decimals = 1): string {
  const s = n.toFixed(decimals);
  return `${decimals > 0 && s.endsWith(".0") ? s.slice(0, -2) : s}%`;
}

/** Factor score: 2.9 / 10 */
export const formatFactor = (n: number): string => `${n.toFixed(1)} / 10`;

/** Compact for tight cells: $314, −$53, $12.3k. Full amounts stay in labels and sheets. */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs < 10000) return formatAUD(n);
  const k = Math.round(abs / 100) / 10;
  return `${n < 0 ? "−" : ""}$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
}
