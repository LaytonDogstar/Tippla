// A subscription charged for the first time in the last 35 days.
import { feedCopy } from "@/content/feed";
import { addDays, formatCents, formatShortDay, formatWhole } from "@/lib/format";
import { detectSubscriptions } from "@/lib/selectors/subscriptions";
import type { Rule } from "../types";

const t = feedCopy.rules.newSubscription;
export const NEW_SUBSCRIPTION_DAYS = 35;

export const newSubscription: Rule = ({ d }) =>
  detectSubscriptions(d)
    // New only if we had a month of history before it (otherwise we just can't see the earlier charges).
    .filter((s) => s.charges.length === 1 && s.charges[0]!.date >= addDays(d.asOf, -NEW_SUBSCRIPTION_DAYS) && s.charges[0]!.date >= addDays(d.profile.data_from, 31))
    .map((s) => ({
      id: `new_subscription:${s.merchant}:${s.charges[0]!.date}`, type: "new_subscription" as const, section: "money" as const,
      title: t.title(s.merchant, formatCents(s.amount)),
      body: t.body(formatShortDay(s.charges[0]!.date), formatWhole(s.amount * 12)),
      action: { label: t.action, href: "/subscriptions" },
      urgency: 2 as const, amountAtStake: (s.amount * 12) / 26, expiresAt: addDays(s.charges[0]!.date, NEW_SUBSCRIPTION_DAYS),
      transactionIds: s.charges.map((c) => c.id),
    }));
