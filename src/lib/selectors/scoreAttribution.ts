// Why the SmartScore moved since the last refresh. The factor changes are real (TaleFin returns a breakdown
// each refresh and Tippla stores it). Splitting the points between them uses SAMPLE weights (Q3); the parts
// are scaled and rounded so they always add up to the actual change. Each part links to the transactions
// behind it, so "new pay advance −9" points at the 24/09 Beforepay credit.
import type { FactorKey, PersonaData } from "@/lib/api/types";
import { SAMPLE_FACTOR_WEIGHTS } from "@/config/flags";
import { attributionCopy as t } from "@/content/feed";
import { factorCopy } from "@/content/en-AU";
import { formatDayMonth, type ISODate } from "@/lib/format/dates";
import { formatAUD, sumMoney } from "@/lib/format/money";
import { posted } from "./transactions";

export interface AttributionPart {
  factor: FactorKey;
  name: string;
  from: number;
  to: number;
  /** Estimated points (Q3). Parts add up to the actual score change. */
  points: number;
  /** Plain-words reason from the transactions, and a short label for the one-line summary. */
  reason: string | null;
  short: string;
  transactionIds: string[];
}

export interface ScoreAttribution {
  from: { date: ISODate; score: number };
  to: { date: ISODate; score: number };
  delta: number;
  parts: AttributionPart[];
  /** "new pay advance −9, gambling deposits −6" */
  summary: string;
  estimated: true;
}

/** Factors shown to the customer (Income sources is score-only: it never gets its own line). */
const SHOWN: FactorKey[] = ["INCOME", "DISPOSABLE_INCOME", "LOAN_AMOUNT_AND_TYPE", "MISSED_PAYMENT", "RELIABLE_PAYMENT_HISTORY", "CASH_SPEND", "PRODUCTIVE_SPEND", "ADVERSE_SPEND"];

/** Round to integers that still add up to `total` (largest remainder). */
function roundToTotal(values: number[], total: number): number[] {
  const floors = values.map((v) => Math.trunc(v));
  let rest = total - floors.reduce((a, b) => a + b, 0);
  const order = values.map((v, i) => ({ i, r: v - Math.trunc(v) })).sort((a, b) => (rest > 0 ? b.r - a.r : a.r - b.r));
  for (const { i } of order) {
    if (rest === 0) break;
    const step = rest > 0 ? 1 : -1;
    floors[i]! += step;
    rest -= step;
  }
  return floors;
}

function reasonFor(d: PersonaData, f: FactorKey, from: ISODate, to: ISODate, down: boolean): { reason: string | null; short: string; ids: string[] } {
  const tx = posted(d.transactions).filter((x) => x.date > from && x.date <= to);
  const name = factorCopy[f].name;
  switch (f) {
    case "LOAN_AMOUNT_AND_TYPE": {
      const adv = tx.filter((x) => x.category === "wage_advance" && x.amount > 0);
      if (down && adv.length) return { reason: t.reasons.newAdvance(adv.at(-1)!.merchant, formatDayMonth(adv.at(-1)!.date)), short: t.reasons.newAdvanceShort, ids: adv.map((x) => x.id) };
      return { reason: null, short: name.toLowerCase(), ids: [] };
    }
    case "ADVERSE_SPEND": {
      const g = tx.filter((x) => x.category === "gambling" && x.amount < 0);
      if (down && g.length) return { reason: t.reasons.gambling(formatAUD(sumMoney(g.map((x) => -x.amount)))), short: t.reasons.gamblingShort, ids: g.map((x) => x.id) };
      return { reason: null, short: name.toLowerCase(), ids: [] };
    }
    case "MISSED_PAYMENT": {
      const fails = tx.filter((x) => x.subcategory === "dishonour");
      if (down && fails.length) return { reason: t.reasons.dishonour(fails.length), short: t.reasons.dishonourShort, ids: fails.map((x) => x.id) };
      if (!down && !fails.length) return { reason: t.reasons.noFailed, short: t.reasons.noFailedShort, ids: [] };
      return { reason: null, short: name.toLowerCase(), ids: [] };
    }
    case "CASH_SPEND": {
      const c = tx.filter((x) => x.category === "cash" && x.amount < 0);
      if (c.length) return { reason: t.reasons.cash(formatAUD(sumMoney(c.map((x) => -x.amount)))), short: t.reasons.cashShort, ids: c.map((x) => x.id) };
      return { reason: null, short: name.toLowerCase(), ids: [] };
    }
    case "DISPOSABLE_INCOME": {
      const net = sumMoney(tx.filter((x) => x.category !== "transfer" && x.category !== "wage_advance").map((x) => x.amount));
      // Only say it when the words agree with the direction (spending above income pulls it down).
      const fits = down ? net < 0 : net > 0;
      return { reason: fits ? t.reasons.leftOver(formatAUD(net)) : null, short: t.reasons.leftOverShort, ids: [] };
    }
    case "INCOME":
      return { reason: down ? null : t.reasons.income, short: down ? name.toLowerCase() : t.reasons.incomeShort, ids: [] };
    default:
      return { reason: null, short: name.toLowerCase(), ids: [] };
  }
}

export function scoreAttribution(d: PersonaData): ScoreAttribution | null {
  const h = d.scoreHistory;
  if (h.length < 2) return null;
  const prev = h[h.length - 2]!, last = h[h.length - 1]!;
  const before = prev.breakdown, after = last.breakdown ?? d.score?.breakdown;
  const delta = last.score - prev.score;
  if (!before || !after) return null;
  const moved = (Object.keys(SAMPLE_FACTOR_WEIGHTS) as FactorKey[])
    .map((f) => ({ f, from: before[f], to: after[f] }))
    .filter((x): x is { f: FactorKey; from: number; to: number } => x.from !== null && x.to !== null && Math.abs(x.to - x.from) >= 0.05);
  const raw = moved.map((x) => SAMPLE_FACTOR_WEIGHTS[x.f] * (x.to - x.from));
  const rawTotal = raw.reduce((a, b) => a + b, 0);
  // Scale the estimate to the real change so the parts reconcile; if the estimate points the other way
  // (or is zero), share the change by size of movement instead.
  const share = rawTotal !== 0 && Math.sign(rawTotal) === Math.sign(delta)
    ? raw.map((r) => (r / rawTotal) * delta)
    : moved.map((x) => (Math.abs(x.to - x.from) / Math.max(1e-9, moved.reduce((a, m) => a + Math.abs(m.to - m.from), 0))) * delta);
  const pts = roundToTotal(share, delta);
  const parts: AttributionPart[] = moved.map((x, i) => {
    const r = reasonFor(d, x.f, prev.scored_date, last.scored_date, x.to < x.from);
    return { factor: x.f, name: factorCopy[x.f].name, from: x.from, to: x.to, points: pts[i]!, reason: r.reason, short: r.short, transactionIds: r.ids };
  });
  // Score-only factors (Income sources) fold into "other" rather than getting their own line.
  const shown = parts.filter((p) => SHOWN.includes(p.factor) && p.points !== 0);
  const hidden = parts.filter((p) => !SHOWN.includes(p.factor) || p.points === 0);
  const otherPts = hidden.reduce((a, p) => a + p.points, 0);
  const visible = [...shown].sort((a, b) => Math.abs(b.points) - Math.abs(a.points) || a.name.localeCompare(b.name));
  if (otherPts !== 0) visible.push({ factor: "GOVERNMENT_RELIANCE", name: t.other, from: 0, to: 0, points: otherPts, reason: null, short: t.other.toLowerCase(), transactionIds: [] });
  const summary = visible.slice(0, 3).map((p) => `${p.short} ${t.points(p.points)}`).join(", ");
  return { from: { date: prev.scored_date, score: prev.score }, to: { date: last.scored_date, score: last.score }, delta, parts: visible, summary, estimated: true };
}
