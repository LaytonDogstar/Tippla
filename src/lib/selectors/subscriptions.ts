import { addDays, type ISODate } from "@/lib/format/dates";
import { cents, sumMoney } from "@/lib/format/money";
import type { SpendData } from "./periods";

/** Same day next month, clamped to the month's last day (31/01 → 28/02). */
function addMonth(date: ISODate): ISODate {
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

/**
 * Subscriptions detected from the transactions (single source of truth): every merchant in the
 * Subscriptions category, with its charge history. The feed uses the history for "new" and "price rise".
 */
export function detectSubscriptions(d: Pick<SpendData, "transactions">): SubscriptionHistory[] {
  const m = new Map<string, SubscriptionHistory["charges"]>();
  for (const t of d.transactions) {
    if (t.status !== "posted" || t.amount >= 0 || t.category !== "subscriptions") continue;
    m.set(t.merchant, [...(m.get(t.merchant) ?? []), { id: t.id, date: t.date, amount: -t.amount }]);
  }
  return [...m.entries()].map(([merchant, charges]) => {
    const c = [...charges].sort((a, b) => a.date.localeCompare(b.date));
    const last = c.at(-1)!;
    const prev = [...c].reverse().find((x) => x.amount !== last.amount) ?? null;
    return { merchant, charges: c, amount: last.amount, last_charged: last.date, previousAmount: prev ? prev.amount : null, cadence: "monthly" as const };
  });
}

/** Monthly subscriptions with per-pay-cycle (×12/26) and per-year cost, and the next expected charge. */
export function subscriptions(d: SpendData) {
  const rows = detectSubscriptions(d).map((s) => {
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
