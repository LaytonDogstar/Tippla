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

/** Monthly subscriptions with per-pay-cycle (×12/26) and per-year cost, and the next expected charge. */
export function subscriptions(d: SpendData) {
  const rows = d.derived.subscriptions.map((s) => {
    let next = addMonth(s.last_charged);
    while (next <= d.asOf) next = addMonth(next);
    return {
      ...s,
      perPayCycle: cents((s.amount * 12) / 26),
      perYear: cents(s.amount * 12),
      nextCharge: next,
      /** Reminder two days before the next charge, never before tomorrow. */
      remindOn: addDays(next, -2) > d.asOf ? addDays(next, -2) : addDays(d.asOf, 1),
    };
  }).sort((a, b) => b.amount - a.amount || a.merchant.localeCompare(b.merchant));
  return { rows, totalPerPayCycle: sumMoney(rows.map((r) => r.perPayCycle)), totalPerYear: sumMoney(rows.map((r) => r.perYear)) };
}
