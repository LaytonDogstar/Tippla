// Parsing for CurrencyInput (components.md 15b): accept "$1,234.5", reject ambiguous input, return integer cents.
// Empty is null, never zero. No silent rounding of a third decimal place.

export type ParseResult = { ok: true; cents: number | null } | { ok: false; reason: "format" | "precision" | "negative" };

export function parseCurrency(input: string, opts: { allowNegative?: boolean } = {}): ParseResult {
  const s = input.trim().replace(/^\$\s*/, "").replace(/\s+/g, "");
  if (s === "") return { ok: true, cents: null };
  const neg = s.startsWith("-") || s.startsWith("−");
  const body = neg ? s.slice(1).replace(/^\$/, "") : s;
  if (neg && !opts.allowNegative) return { ok: false, reason: "negative" };
  // Grouping commas only in valid positions: 1,234 or 12,345,678 (no 1,23).
  if (!/^(\d{1,3}(,\d{3})+|\d+)?(\.\d*)?$/.test(body) || body === "." || body === "") return { ok: false, reason: "format" };
  const [whole = "0", frac = ""] = body.replace(/,/g, "").split(".");
  if (frac.length > 2) return { ok: false, reason: "precision" };
  const cents = Number(whole || "0") * 100 + Number((frac + "00").slice(0, 2));
  return { ok: true, cents: neg ? -cents : cents };
}

/** Normalised display on blur: 123456 → "1,234.56". */
export function formatCurrencyInput(cents: number): string {
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${cents < 0 ? "−" : ""}${whole}.${String(abs % 100).padStart(2, "0")}`;
}
