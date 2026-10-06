import { addDays, daysBetween, type ISODate } from "@/lib/format/dates";
import { applyOverrides, type CategoryOverrides } from "./transactions";
import { cents, sumMoney } from "@/lib/format/money";
import type { SpendData } from "./periods";
import type { PersonaData } from "@/lib/api/types";

/** Same day next month, clamped to the month's last day (31/01 → 28/02). */
export function addMonth(date: ISODate): ISODate {
  const [y, m, day] = date.split("-").map(Number) as [number, number, number];
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

export interface SubscriptionHistory {
  merchant: string;
  /** Posted charges, oldest first. */
  charges: { id: string; date: ISODate; amount: number }[];
  amount: number;
  last_charged: ISODate;
  /** The amount before the latest change, if the price moved. */
  previousAmount: number | null;
  cadence: "monthly";
}

/** Days between charges that count as monthly. */
const MONTHLY_GAP = { min: 25, max: 35 };
/** A single charge counts (as a new subscription) only if it was this recent. */
const SINGLE_CHARGE_DAYS = 35;

/**
 * Subscriptions detected from the transactions (single source of truth): merchants in the Subscriptions
 * category (after the customer's recategorisations) that charge monthly, with their charge history. A lone
 * charge counts only if it's recent (a new subscription); an old one-off, weekly or yearly charge doesn't.
 * The feed uses the history for "new" and "price rise".
 */
export function detectSubscriptions(d: Pick<SpendData, "transactions" | "asOf"> & { memberRules?: PersonaData["memberRules"] }, edits: CategoryOverrides = {}): SubscriptionHistory[] {
  const m = new Map<string, SubscriptionHistory["charges"]>();
  // Spec 05: "Not a subscription" / "This has ended" take the merchant out.
  const ended = new Set(d.memberRules?.endedSubscriptions ?? []);
  for (const t of applyOverrides(d.transactions, edits)) {
    if (t.status !== "posted" || t.amount >= 0 || t.category !== "subscriptions" || ended.has(t.merchant)) continue;
    m.set(t.merchant, [...(m.get(t.merchant) ?? []), { id: t.id, date: t.date, amount: -t.amount }]);
  }
  return [...m.entries()].flatMap(([merchant, charges]) => {
    const c = [...charges].sort((a, b) => a.date.localeCompare(b.date));
    if (c.length === 1 ? daysBetween(c[0]!.date, d.asOf) > SINGLE_CHARGE_DAYS : !isMonthly(c)) return [];
    const last = c.at(-1)!;
    const prev = [...c].reverse().find((x) => x.amount !== last.amount) ?? null;
    return [{ merchant, charges: c, amount: last.amount, last_charged: last.date, previousAmount: prev ? prev.amount : null, cadence: "monthly" as const }];
  });
}

/** Median gap between charges is about a month. */
function isMonthly(c: { date: ISODate }[]): boolean {
  const gaps = c.slice(1).map((x, i) => daysBetween(c[i]!.date, x.date)).sort((a, b) => a - b);
  const mid = gaps[Math.floor(gaps.length / 2)]!;
  return mid >= MONTHLY_GAP.min && mid <= MONTHLY_GAP.max;
}

/** Monthly subscriptions with per-pay-cycle (×12/26) and per-year cost, and the next expected charge. */
export function subscriptions(d: SpendData, edits: CategoryOverrides = {}) {
  const rows = detectSubscriptions(d, edits).map((s) => {
    let next = addMonth(s.last_charged);
    while (next <= d.asOf) next = addMonth(next);
    return {
      merchant: s.merchant, amount: s.amount, last_charged: s.last_charged, cadence: s.cadence,
      perPayCycle: cents((s.amount * 12) / 26),
      perYear: cents(s.amount * 12),
      nextCharge: next,
      /** Reminder two days before the next charge, never before tomorrow. */
      remindOn: addDays(next, -2) > d.asOf ? addDays(next, -2) : addDays(d.asOf, 1),
    };
  }).sort((a, b) => b.amount - a.amount || a.merchant.localeCompare(b.merchant));
  return { rows, totalPerPayCycle: sumMoney(rows.map((r) => r.perPayCycle)), totalPerYear: sumMoney(rows.map((r) => r.perYear)) };
}
