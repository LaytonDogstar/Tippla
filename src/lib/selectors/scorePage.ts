// SmartScore page (one column, 12/10/2026). The direction label and the next update from the score history; every
// factor's change since the last update (each update stores all factor scores); a reason line per factor; the
// "Most room to move" ranking by estimated points available (sample weights); and the shortfall guard, read from
// the same pay-cycle summary Today's hero uses.
import type { FactorKey, PersonaData } from "@/lib/api/types";
import { SAMPLE_FACTOR_WEIGHTS, ACTIONABLE_FACTORS } from "@/config/flags";
import { addDays, daysBetween, formatDayMonth, type ISODate } from "@/lib/format/dates";
import { factorDrivers } from "./factorDetail";
import { factors, type Factor } from "./score";
import type { PayCycleSummary } from "./payCycle";
import type { ScoreAttribution } from "./scoreAttribution";

/** Days between updates: the usual gap in the history (not stored, so worked out). null with under two updates. */
export function updateCadence(history: { scored_date: ISODate }[]): number | null {
  if (history.length < 2) return null;
  const gaps = history.slice(1).map((h, i) => daysBetween(history[i]!.scored_date, h.scored_date)).sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)]!;
}

export const nextUpdate = (history: { scored_date: ISODate }[]): ISODate | null => {
  const c = updateCadence(history);
  return c === null ? null : addDays(history.at(-1)!.scored_date, c);
};

/** "falling for 10 weeks": how long the score has moved the same way, from the last run of same-direction changes. */
export function scoreDirection(history: { scored_date: ISODate; score: number }[]): { dir: "up" | "down" | "steady"; weeks: number } | null {
  if (history.length < 2) return null;
  const sign = (i: number) => Math.sign(history[i]!.score - history[i - 1]!.score);
  const last = sign(history.length - 1);
  let i = history.length - 1;
  while (i > 1 && sign(i - 1) === last) i--;
  const weeks = Math.round(daysBetween(history[i - 1]!.scored_date, history.at(-1)!.scored_date) / 7);
  return { dir: last > 0 ? "up" : last < 0 ? "down" : "steady", weeks };
}

export interface FactorLine {
  key: FactorKey; name: string; value: number | null;
  /** The previous update's score for this factor; null if there wasn't one. */
  previous: number | null;
  /** value − previous, one decimal; null when either is missing. */
  change: number | null;
  /** Estimated points available: sample weight × (10 − score). Ranks "Most room to move". */
  pointsAvailable: number;
  reason: string | null;
  actionable: boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Every factor with its change since the last update and a reason line. Reasons, in order: what moved it (the
 * "What changed" reason), Money left over's before-payday shortfall, Current borrowing's open loans, else the first
 * line of the factor's drawer.
 */
export function factorLines(d: PersonaData, opts: { attribution: ScoreAttribution | null; payCycle: PayCycleSummary; loansOpen?: string | null; shortReason?: (amt: string) => string }): FactorLine[] {
  const prev = d.scoreHistory.at(-2)?.breakdown ?? null;
  return factors(d).filter((f) => f.key !== "GOVERNMENT_RELIANCE").map((f: Factor) => {
    const previous = prev?.[f.key] ?? null;
    const part = opts.attribution?.parts.find((p) => p.factor === f.key);
    const short = f.key === "DISPOSABLE_INCOME" && opts.payCycle.isShort && opts.shortReason ? opts.shortReason(`$${Math.round(-opts.payCycle.leftAfterBills)}`) : null;
    const loans = f.key === "LOAN_AMOUNT_AND_TYPE" ? opts.loansOpen ?? null : null;
    const drawer = f.value === null ? null : factorDrivers(d, f.key)[0]?.text ?? null;
    return {
      key: f.key, name: f.name, value: f.value, previous,
      change: f.value !== null && previous !== null ? round1(f.value - previous) : null,
      pointsAvailable: f.value === null ? 0 : Math.round((SAMPLE_FACTOR_WEIGHTS[f.key as keyof typeof SAMPLE_FACTOR_WEIGHTS] ?? 0) * (10 - f.value)),
      reason: part?.reason ?? short ?? loans ?? drawer,
      actionable: (ACTIONABLE_FACTORS as readonly string[]).includes(f.key),
    };
  });
}

/** "Most room to move": the three actionable factors with the most points available; the rest are "Other". */
export function groupFactors(lines: FactorLine[], n = 3): { room: FactorLine[]; other: FactorLine[]; strongest: FactorLine | null } {
  const room = lines.filter((l) => l.actionable && l.value !== null).sort((a, b) => b.pointsAvailable - a.pointsAvailable || a.value! - b.value!).slice(0, n);
  const other = lines.filter((l) => !room.includes(l)).sort((a, b) => (a.value ?? 99) - (b.value ?? 99));
  const strongest = lines.filter((l) => l.value !== null).sort((a, b) => b.value! - a.value!)[0] ?? null;
  return { room, other, strongest };
}

/** The shortfall guard: Today's before-payday shortfall, as Today shows it. null when Today shows none. */
export function shortfallGuard(pc: PayCycleSummary): { amount: number; payday: ISODate } | null {
  return pc.isShort ? { amount: Math.round(-pc.leftAfterBills), payday: pc.nextPayday } : null;
}

/** Sections 1 and 2 in the configured order, numbered to match. */
export function scoreSections(order: "changeFirst" | "actionFirst"): { id: "stand" | "next"; n: number }[] {
  const ids = order === "actionFirst" ? (["next", "stand"] as const) : (["stand", "next"] as const);
  return ids.map((id, i) => ({ id, n: i + 1 }));
}

export const sinceLabel = (date: ISODate | null) => (date ? formatDayMonth(date) : null);
