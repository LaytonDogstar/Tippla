// Spec 06 feed rules: hardship letter follow-up, a cancelled subscription charged again, and the one-off
// entitlements check. Each only while its feature flag is on.
import { cancelExtraCopy, entitlementsCopy, letterCopy } from "@/content/actions";
import { isOn } from "@/config/featureFlags";
import { formatCents, formatDayMonth } from "@/lib/format";
import { currentCycle } from "@/lib/selectors/periods";
import { payCycleSummary } from "@/lib/selectors/payCycle";
import { scoreState } from "@/lib/selectors/score";
import { valueTally } from "@/lib/selectors/tally";
import type { Rule } from "../types";

/** "Did you hear back from Beforepay?" from the pay cycle after the letter, until answered (not yet asks again). */
export const hardshipFollowup: Rule = ({ d, account = {} }) => {
  if (!isOn("hardship_autofill_v1", d.id)) return [];
  const start = currentCycle(d).start;
  return (account.hardshipLetters ?? [])
    .filter((l) => l.at < start && (!l.outcome || (l.outcome === "not_yet" && (l.answeredAt ?? "") < start)))
    .map((l) => ({
      id: `hardship_followup:${l.lender}:${start}`, type: "hardship_followup" as const, section: "help" as const,
      title: letterCopy.followup.title(l.lender), body: letterCopy.followup.body,
      action: { label: letterCopy.followup.action, href: `/hardship?followup=${encodeURIComponent(l.lender)}` },
      urgency: 3 as const, amountAtStake: 0, expiresAt: null,
    }));
};

/** After "I've cancelled", the subscription was charged again: the cancellation may not have gone through. */
export const cancelFailed: Rule = ({ d, account = {} }) => {
  if (!isOn("cancel_helper_v1", d.id)) return [];
  return (valueTally(d, account).chargedAgain ?? []).map((c) => ({
    id: `cancel_failed:${c.merchant}:${c.date}`, type: "cancel_failed" as const, section: "money" as const,
    title: cancelExtraCopy.failedTitle(c.merchant), body: cancelExtraCopy.failedBody(formatCents(c.amount), formatDayMonth(c.date)),
    action: { label: cancelExtraCopy.failedAction, href: "/subscriptions" },
    urgency: 3 as const, amountAtStake: c.amount, expiresAt: null,
  }));
};

/** Once, for members in Building or Steadying or short before payday, until they've done the check. */
export const entitlementsCheck: Rule = ({ d, edits, account = {} }) => {
  if (!isOn("entitlements_v1", d.id) || account.entitlements) return [];
  const s = scoreState(d);
  const low = s.kind === "scored" && (s.stage.stage.id === "building" || s.stage.stage.id === "steadying");
  if (!low && !payCycleSummary(d, edits).isShort) return [];
  return [{
    id: "entitlements_check", type: "entitlements_check", section: "help",
    title: entitlementsCopy.feedTitle, body: entitlementsCopy.feedBody,
    action: { label: entitlementsCopy.feedAction, href: "/help/entitlements" },
    urgency: 2, amountAtStake: 0, expiresAt: null,
  }];
};
