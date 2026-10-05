// The same merchant charging the same amount twice on the same day, in the last 14 days. Recurring
// payments, transfers, income and quiet categories are left out.
import { feedCopy } from "@/content/feed";
import { addDays, formatCents, formatDayMonth } from "@/lib/format";
import { applyOverrides, posted } from "@/lib/selectors/transactions";
import type { Rule } from "../types";
import { QUIET_CATEGORIES } from "./_helpers";

const t = feedCopy.rules.duplicate;
export const DUPLICATE_LOOKBACK_DAYS = 14;

export const duplicateCharge: Rule = ({ d, edits }) => {
  const since = addDays(d.asOf, -DUPLICATE_LOOKBACK_DAYS);
  const groups = new Map<string, { ids: string[]; merchant: string; amount: number; date: string }>();
  for (const x of posted(applyOverrides(d.transactions, edits))) {
    if (x.amount >= 0 || x.date < since || x.is_recurring || x.category === "transfer" || QUIET_CATEGORIES.includes(x.category)) continue;
    const key = `${x.merchant}|${x.amount}|${x.date}`;
    const g = groups.get(key) ?? { ids: [], merchant: x.merchant, amount: -x.amount, date: x.date };
    g.ids.push(x.id);
    groups.set(key, g);
  }
  return [...groups.values()].filter((g) => g.ids.length > 1).map((g) => ({
    id: `duplicate_charge:${g.merchant}:${g.amount}:${g.date}`, type: "duplicate_charge" as const, section: "money" as const,
    title: t.title(g.merchant, formatCents(g.amount), formatDayMonth(g.date)),
    body: t.body,
    action: { label: t.action, href: `/spending?q=${encodeURIComponent(g.merchant)}` },
    urgency: 3 as const, amountAtStake: g.amount * (g.ids.length - 1), expiresAt: addDays(g.date, 60),
    transactionIds: g.ids,
  }));
};
