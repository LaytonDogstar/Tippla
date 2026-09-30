import type { PersonaData } from "@/lib/api/types";
import { cents, sumMoney } from "@/lib/format/money";

/** Monthly subscriptions with per-pay-cycle (×12/26) and per-year cost. */
export function subscriptions(d: PersonaData) {
  const rows = d.derived.subscriptions.map((s) => ({
    ...s,
    perPayCycle: cents((s.amount * 12) / 26),
    perYear: cents(s.amount * 12),
  }));
  return { rows, totalPerPayCycle: sumMoney(rows.map((r) => r.perPayCycle)), totalPerYear: sumMoney(rows.map((r) => r.perYear)) };
}
