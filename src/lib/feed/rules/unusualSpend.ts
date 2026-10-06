// A category well above its usual: this pay cycle so far (including pending charges, as an early
// warning) vs the median of the last 3 full cycles (spec 01). Gambling, alcohol, fixed costs (rent, loans, pay
// advances, fees) and monthly bills (which land unevenly across fortnights) are never flagged here.
import { categoryNames } from "@/content/en-AU";
import { feedCopy } from "@/content/feed";
import { formatWhole } from "@/lib/format";
import { sumMoney } from "@/lib/format/money";
import { compareWithHistory } from "@/lib/selectors/cohort";
import { currentCycle } from "@/lib/selectors/periods";
import { applyOverrides, inPeriod, pending } from "@/lib/selectors/transactions";
import type { SpendCategory } from "@/lib/selectors/spending";
import type { Rule } from "../types";

const t = feedCopy.rules.unusualSpend;
/** SAMPLE LOGIC: at least 1.5× the usual and $50 more, with a usual of $20 or more. */
export const UNUSUAL = { ratio: 1.5, minExtra: 50, minUsual: 20 } as const;
const NEVER: SpendCategory[] = ["gambling", "alcohol", "housing", "loan_repayment", "bnpl", "wage_advance", "fees", "bills", "subscriptions"];

export const unusualSpend: Rule = ({ d, edits }) => {
  const h = compareWithHistory(d, edits);
  if (!h.hasHistory) return [];
  const cycle = currentCycle(d);
  const pendingBy = new Map<string, number>();
  for (const x of pending(inPeriod(applyOverrides(d.transactions, edits), cycle))) {
    if (x.amount < 0) pendingBy.set(x.category, sumMoney([pendingBy.get(x.category) ?? 0, -x.amount]));
  }
  const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
  return h.rows
    .map((r) => ({ ...r, average: median(r.cycles.map((c) => c.total)) }))
    .map((r) => ({ ...r, pending: pendingBy.get(r.category) ?? 0, now: sumMoney([r.thisCycle, pendingBy.get(r.category) ?? 0]) }))
    .filter((r) => !NEVER.includes(r.category) && r.average >= UNUSUAL.minUsual && r.now >= r.average * UNUSUAL.ratio && r.now - r.average >= UNUSUAL.minExtra)
    .map((r) => ({
      id: `unusual_spend:${r.category}:${d.derived.pay_cycle.start}`, type: "unusual_spend" as const, section: "money" as const,
      title: t.title(categoryNames[r.category], formatWhole(r.now - r.average)),
      body: t.body(formatWhole(r.now), formatWhole(r.average)) + (r.pending ? ` ${t.pending(formatWhole(r.pending))}` : ""),
      action: { label: t.action, href: `/spending?category=${r.category}` },
      urgency: 2 as const, amountAtStake: r.now - r.average, expiresAt: d.derived.pay_cycle.next_payday,
    }));
};
