// Forecast shortfall before payday (balance − bills due before payday < 0).
import { feedCopy } from "@/content/feed";
import { formatShortDay, formatWhole } from "@/lib/format";
import { payCycleSummary } from "@/lib/selectors/payCycle";
import type { Rule } from "../types";

const t = feedCopy.rules.shortfall;

export const shortfall: Rule = ({ d, edits }) => {
  const s = payCycleSummary(d, edits);
  if (!s.isShort) return [];
  return [{
    id: `shortfall:${s.cycle.start}`, type: "shortfall", section: "today",
    title: t.title(formatWhole(-s.leftAfterBills)),
    body: t.body(formatWhole(s.balance), formatWhole(s.dueTotal), formatShortDay(s.nextPayday)),
    action: { label: t.action, href: "/calendar" },
    hardship: { label: feedCopy.hardship, href: "/hardship" },
    urgency: 4, amountAtStake: -s.leftAfterBills, expiresAt: s.nextPayday,
  }];
};
