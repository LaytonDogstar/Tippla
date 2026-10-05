// A subscription whose latest charge (in the last 35 days) is higher than before.
import { feedCopy } from "@/content/feed";
import { addDays, formatCents, formatWhole } from "@/lib/format";
import { detectSubscriptions } from "@/lib/selectors/subscriptions";
import type { Rule } from "../types";

const t = feedCopy.rules.priceRise;
export const PRICE_RISE_DAYS = 35;

export const priceRise: Rule = ({ d }) =>
  detectSubscriptions(d)
    .filter((s) => s.previousAmount !== null && s.amount > s.previousAmount && s.last_charged >= addDays(d.asOf, -PRICE_RISE_DAYS))
    .map((s) => {
      const diff = s.amount - s.previousAmount!;
      return {
        id: `price_rise:${s.merchant}:${s.last_charged}`, type: "price_rise" as const, section: "money" as const,
        title: t.title(s.merchant, formatCents(s.amount), formatCents(s.previousAmount!)),
        body: t.body(formatWhole(diff * 12)),
        action: { label: t.action, href: "/subscriptions" },
        urgency: 2 as const, amountAtStake: (diff * 12) / 26, expiresAt: addDays(s.last_charged, PRICE_RISE_DAYS),
        transactionIds: [s.charges.at(-1)!.id],
      };
    });
