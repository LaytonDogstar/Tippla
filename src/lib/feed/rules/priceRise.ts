// A subscription whose latest charge (in the last 35 days) is higher than the charge before it.
import { feedCopy } from "@/content/feed";
import { addDays, formatCents, formatWhole } from "@/lib/format";
import { detectSubscriptions } from "@/lib/selectors/subscriptions";
import type { Rule } from "../types";

const t = feedCopy.rules.priceRise;
export const PRICE_RISE_DAYS = 35;
/** Spec 01: up at least 5% or at least $1 on the charge before. */
export const isRise = (now: number, before: number) => now > before && (now - before >= 1 || (now - before) / before >= 0.05);

export const priceRise: Rule = ({ d, edits }) =>
  detectSubscriptions(d, edits)
    // Only the first charge at the new price: the one before it must be the old price. Later charges at
    // the same new price are the new normal, not another rise.
    .filter((s) => s.previousAmount !== null && s.charges.at(-2)?.amount === s.previousAmount && isRise(s.amount, s.previousAmount)
      && s.last_charged >= addDays(d.asOf, -PRICE_RISE_DAYS))
    .map((s) => {
      const diff = s.amount - s.previousAmount!;
      return {
        id: `price_rise:${s.merchant}:${s.last_charged}`, type: "price_rise" as const, section: "money" as const,
        title: t.title(s.merchant, formatCents(s.amount), formatCents(s.previousAmount!)),
        body: t.body(formatWhole(diff * 12)),
        action: { label: t.action, href: "/subscriptions" },
        urgency: 3 as const, amountAtStake: (diff * 12) / 26, expiresAt: addDays(s.last_charged, PRICE_RISE_DAYS),
        transactionIds: [s.charges.at(-1)!.id],
      };
    });
