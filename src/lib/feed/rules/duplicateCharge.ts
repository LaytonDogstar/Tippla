// The same merchant charging the same amount twice within 48 hours (spec 01), in the last 14 days.
// Recurring payments, transfers, income and quiet categories are left out.
import { feedCopy } from "@/content/feed";
import { addDays, daysBetween, formatCents, formatDayMonth } from "@/lib/format";
import { applyOverrides, posted } from "@/lib/selectors/transactions";
import type { Rule } from "../types";
import { QUIET_CATEGORIES } from "./_helpers";

const t = feedCopy.rules.duplicate;
export const DUPLICATE_LOOKBACK_DAYS = 14;
export const DUPLICATE_WINDOW_DAYS = 2;

export const duplicateCharge: Rule = ({ d, edits }) => {
  const since = addDays(d.asOf, -DUPLICATE_LOOKBACK_DAYS);
  const byKey = new Map<string, { id: string; date: string; merchant: string; amount: number }[]>();
  for (const x of posted(applyOverrides(d.transactions, edits))) {
    if (x.amount >= 0 || x.date < since || x.is_recurring || x.category === "transfer" || QUIET_CATEGORIES.includes(x.category)) continue;
    const key = `${x.merchant}|${x.amount}`;
    byKey.set(key, [...(byKey.get(key) ?? []), { id: x.id, date: x.date, merchant: x.merchant, amount: -x.amount }]);
  }
  // Charges within 48 hours of the one before form one group.
  const groups = new Map<string, { ids: string[]; merchant: string; amount: number; date: string }>();
  for (const list of byKey.values()) {
    let g: { ids: string[]; merchant: string; amount: number; date: string; last: string } | null = null;
    for (const x of list.sort((a, b) => a.date.localeCompare(b.date))) {
      if (g && daysBetween(g.last, x.date) <= DUPLICATE_WINDOW_DAYS) { g.ids.push(x.id); g.last = x.date; continue; }
      g = { ids: [x.id], merchant: x.merchant, amount: x.amount, date: x.date, last: x.date };
      groups.set(`${x.merchant}|${x.amount}|${x.date}`, g);
    }
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
