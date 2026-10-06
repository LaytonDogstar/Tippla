// Spec 03 §8: when the member is short before payday or has been using hardship support this pay cycle,
// offer to pause or downgrade Tippla itself, out in the open (never behind a cancellation flow).
import { feedCopy } from "@/content/feed";
import { isOn } from "@/config/featureFlags";
import { formatCents, formatShortDay } from "@/lib/format";
import { billing } from "@/lib/selectors/account";
import { payCycleSummary } from "@/lib/selectors/payCycle";
import { currentCycle } from "@/lib/selectors/periods";
import type { Rule } from "../types";

const t = feedCopy.rules.billingRelief;

export const tipplaBillingRelief: Rule = ({ d, edits, account = {} }) => {
  if (!isOn("payday_billing_v1", d.profile.id)) return [];
  const b = billing(d, account);
  if (b.status !== "active" || !b.nextCharge) return [];
  const cycle = currentCycle(d);
  const inHardship = account.hardshipSelfSelected || (account.hardshipVisitedAt ?? "") >= cycle.start;
  if (!payCycleSummary(d, edits).isShort && !inHardship) return [];
  const amount = b.alignment?.amount ?? b.price;
  return [{
    id: `tippla_billing_relief:${cycle.start}`, type: "tippla_billing_relief", section: "help",
    title: t.title(formatCents(amount)),
    body: t.body(formatShortDay(b.nextCharge), b.plan === "pro"),
    action: { label: t.action, href: "/account/subscription" },
    urgency: 3, amountAtStake: amount, expiresAt: d.derived.pay_cycle.next_payday,
  }];
};
