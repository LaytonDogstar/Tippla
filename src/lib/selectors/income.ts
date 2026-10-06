import type { ArrayMetricValue, PersonaData, Transaction } from "@/lib/api/types";
import { metric } from "@/lib/dataUse";
import { addDays, daysBetween, weekday, type ISODate } from "@/lib/format/dates";
import { posted } from "./transactions";

/** Days of history TaleFin actually saw (AM2035 oldest transaction → data date), capped at `cap`. */
export function historyDays(d: PersonaData, cap = 365): number {
  const oldest = metric<string>(d.bankStatement, "AM2035");
  return Math.min(cap, daysBetween(oldest, d.asOf) + 1);
}

/**
 * Monthly income from AM2072 (90 days). TaleFin divides by the full period (90 days = 3 months) even
 * when there is less history, so thin files would understate; rescale by the days actually covered.
 * Never the 30-day sum: for fortnightly pay, 30 days holds two or three pays (docs/06 correction 1).
 */
export function monthlyIncome(d: PersonaData): { amount: number; basedOnDays: number; excluded: OneOff[] } {
  const v = metric<ArrayMetricValue>(d.bankStatement, "AM2072")["90"];
  const covered = historyDays(d, 90);
  const excluded = oneOffDeposits(d);
  if (!v) return { amount: 0, basedOnDays: covered, excluded };
  const sum = v.sum_amount - excluded.reduce((a, x) => a + x.amount, 0);
  const amount = covered < 90 ? (sum / covered) * (365 / 12) : v.monthly_mean_amount - excluded.reduce((a, x) => a + x.amount, 0) / 3;
  return { amount, basedOnDays: covered, excluded };
}

export interface OneOff { id: string; date: ISODate; amount: number; payer: string }

/**
 * One-off deposits counted as income in the last 90 days (a bond refund, a tax return): not wages or
 * Centrelink, not recurring, the only deposit from that payer in the period, and $1,000 or more.
 * Left out of "monthly income", with a note.
 */
export function oneOffDeposits(d: PersonaData): OneOff[] {
  const since = addDays(d.asOf, -89);
  const credits = posted(d.transactions).filter((t) => t.category === "income" && t.amount > 0 && t.date >= since);
  const fromPayer = (m: string) => credits.filter((t) => t.merchant === m).length;
  // Spec 05: the member's word wins: "One-off" leaves a payer out, "Regular pay" keeps it in.
  const oneOff = new Set(d.memberRules?.oneOffIncome ?? []), regular = new Set(d.memberRules?.regularIncome ?? []);
  return credits
    .filter((t) => !regular.has(t.merchant) && (oneOff.has(t.merchant) || (!t.is_recurring && t.subcategory !== "wages" && t.subcategory !== "centrelink" && t.amount >= 1000 && fromPayer(t.merchant) === 1)))
    .map((t) => ({ id: t.id, date: t.date, amount: t.amount, payer: t.merchant }));
}

export function incomeSources(d: PersonaData) {
  return {
    wagesMonthly: monthlyFrom(d, "AM2001"),
    centrelinkMonthly: monthlyFrom(d, "AM2002"),
    otherRegularMonthly: monthlyFrom(d, "AM2197"),
    employer: titleCase(metric<string>(d.bankStatement, "AM2163")),
    primaryType: metric<string>(d.bankStatement, "AM2101"),
    nextIncomeDate: metric<string>(d.bankStatement, "AM2037"),
    nextWagesDate: metric<string>(d.bankStatement, "AM2077"),
  };
}

function monthlyFrom(d: PersonaData, code: "AM2001" | "AM2002" | "AM2197"): number {
  const v = metric<ArrayMetricValue>(d.bankStatement, code)["90"];
  if (!v) return 0;
  const covered = historyDays(d, 90);
  return covered < 90 ? (v.sum_amount / covered) * (365 / 12) : v.monthly_mean_amount;
}

// ---- When each income comes in -------------------------------------------------------------

export type IncomeSource = "wages" | "centrelink" | "other";

export interface IncomeStream {
  source: IncomeSource;
  /** Employer, "Centrelink", or the payer name. Centrelink is styled exactly like wages. */
  payer: string;
  /** Typical amount: exact when every recent payment was the same (Centrelink), else rounded to $10 ("about $1,960"). */
  typicalAmount: number;
  exact: boolean;
  /** 7, 14 or 28 days, or "monthly". */
  cadence: number | "monthly";
  lastDate: ISODate;
  /** Predicted dates after the data date, up to the horizon. */
  next: ISODate[];
  basis: "transactions" | "summary";
}

const round10 = (n: number) => Math.round(n / 10) * 10;
function typical(amounts: number[]): { typicalAmount: number; exact: boolean } {
  const recent = amounts.slice(-6);
  const exact = recent.length > 0 && Math.max(...recent) - Math.min(...recent) < 0.01;
  const mean = recent.reduce((a, b) => a + b, 0) / (recent.length || 1);
  return { typicalAmount: exact ? recent[0]! : round10(mean), exact };
}

function snapCadence(gapDays: number): number | "monthly" | null {
  for (const c of [7, 14, 28]) if (Math.abs(gapDays - c) <= 2) return c;
  if (gapDays >= 29 && gapDays <= 32) return "monthly";
  return null;
}

function addMonths(d: ISODate, n: number): ISODate {
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), Math.min(day, last))).toISOString().slice(0, 10);
}

function project(last: ISODate, cadence: number | "monthly", after: ISODate, until: ISODate): ISODate[] {
  const out: ISODate[] = [];
  let next = last;
  for (let i = 1; i < 60; i++) {
    next = cadence === "monthly" ? addMonths(last, i) : addDays(last, cadence * i);
    if (next > until) break;
    if (next > after) out.push(next);
  }
  return out;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)]! : 0;
};

/** Every regular income stream, from the transaction feed (one stream per payer). */
export function incomeStreams(d: PersonaData, horizonDays = 35): IncomeStream[] {
  const until = addDays(d.asOf, horizonDays);
  const since = addDays(d.asOf, -89);
  const groups = new Map<string, Transaction[]>();
  for (const t of posted(d.transactions).filter((x) => x.amount > 0 && x.category === "income" && x.date >= since)) {
    const key = `${t.subcategory ?? "other"}|${t.merchant}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const nextWages = safeDate(() => metric<string>(d.bankStatement, "AM2077"));
  const streams: IncomeStream[] = [];
  for (const [key, items] of groups) {
    if (items.length < 2) continue;
    items.sort((a, b) => a.date.localeCompare(b.date));
    const gaps = items.slice(1).map((t, i) => daysBetween(items[i]!.date, t.date));
    const cadence = snapCadence(median(gaps));
    if (!cadence) continue;
    const source = (key.split("|")[0] === "wages" ? "wages" : key.split("|")[0] === "centrelink" ? "centrelink" : "other") as IncomeSource;
    const last = items.at(-1)!.date;
    let next = project(last, cadence, d.asOf, until);
    // TaleFin's own next-wages date wins for the primary wage when it disagrees by a day or two.
    if (source === "wages" && nextWages && next[0] && Math.abs(daysBetween(next[0], nextWages)) <= 3 && next[0] !== nextWages) {
      next = project(addDays(nextWages, typeof cadence === "number" ? -cadence : 0), cadence, d.asOf, until);
    }
    streams.push({
      source, payer: items.at(-1)!.merchant, cadence, lastDate: last, next, basis: "transactions",
      ...typical(items.map((t) => t.amount)),
    });
  }
  return streams.sort((a, b) => (a.next[0] ?? "9").localeCompare(b.next[0] ?? "9"));
}

/**
 * The same from TaleFin's summary alone (no transaction feed): one stream per income metric, cadence
 * estimated from count and first/last dates over 90 days. Wages use TaleFin's next-wages date (AM2077).
 */
export function incomeStreamsFromSummary(d: PersonaData, horizonDays = 35): IncomeStream[] {
  const until = addDays(d.asOf, horizonDays);
  const defs = [
    { code: "AM2001" as const, source: "wages" as const, payer: titleCase(metric<string>(d.bankStatement, "AM2163")) },
    { code: "AM2002" as const, source: "centrelink" as const, payer: "Centrelink" },
    { code: "AM2197" as const, source: "other" as const, payer: "Other regular income" },
  ];
  const out: IncomeStream[] = [];
  for (const def of defs) {
    const v = metric<ArrayMetricValue>(d.bankStatement, def.code)["90"];
    if (!v || !v.count || v.count < 2 || !v.earliest || !v.latest) continue;
    const cadence = snapCadence(daysBetween(v.earliest, v.latest) / (v.count - 1));
    if (!cadence) continue;
    let next = project(v.latest, cadence, d.asOf, until);
    if (def.source === "wages") {
      const nw = safeDate(() => metric<string>(d.bankStatement, "AM2077"));
      if (nw && typeof cadence === "number") next = project(addDays(nw, -cadence), cadence, d.asOf, until);
    }
    const exact = v.min_amount !== null && v.max_amount !== null && v.max_amount - v.min_amount < 0.01;
    out.push({ source: def.source, payer: def.payer, typicalAmount: exact ? v.mean_amount ?? 0 : round10(v.mean_amount ?? 0), exact, cadence, lastDate: v.latest, next, basis: "summary" });
  }
  return out.sort((a, b) => (a.next[0] ?? "9").localeCompare(b.next[0] ?? "9"));
}

export interface ExpectedIncome { date: ISODate; source: IncomeSource; payer: string; amount: number; exact: boolean }

/** Every expected income between the data date and `until`, in date order. */
export function upcomingIncome(d: PersonaData, until: ISODate): ExpectedIncome[] {
  const horizon = Math.max(0, daysBetween(d.asOf, until));
  const streams = d.transactions.length ? incomeStreams(d, horizon) : incomeStreamsFromSummary(d, horizon);
  const oneOff = new Set(d.memberRules?.oneOffIncome ?? []); // spec 05: the member said it won't repeat
  return streams.filter((s) => !oneOff.has(s.payer))
    .flatMap((s) => s.next.map((date) => ({ date, source: s.source, payer: s.payer, amount: s.typicalAmount, exact: s.exact })))
    .sort((a, b) => a.date.localeCompare(b.date) || a.payer.localeCompare(b.payer));
}

/** Typical pay and pattern for the primary wage: "about $1,960 every second Thursday". */
export function payPattern(d: PersonaData): { typicalAmount: number; everyDays: number | null; weekday: string | null; count: number } {
  const w = incomeStreams(d).find((s) => s.source === "wages");
  const count = d.transactions.filter((t) => t.status === "posted" && t.subcategory === "wages").length;
  if (!w) return { typicalAmount: 0, everyDays: null, weekday: null, count };
  return { typicalAmount: w.typicalAmount, everyDays: typeof w.cadence === "number" ? w.cadence : null, weekday: weekday(w.lastDate), count };
}

function safeDate(f: () => string): ISODate | null {
  try { return f(); } catch { return null; }
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
