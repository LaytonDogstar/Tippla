// The SmartScore moved at the last refresh: say by how much and why (attribution, estimated points).
import { feedCopy } from "@/content/feed";
import { addDays } from "@/lib/format";
import { scoreAttribution } from "@/lib/selectors/scoreAttribution";
import type { Rule } from "../types";

const t = feedCopy.rules.scoreChange;
/** Spec 01: only a move of 5 points or more is worth a card. */
export const SCORE_CHANGE_MIN = 5;

export const scoreChange: Rule = ({ d, account = {} }) => {
  const a = scoreAttribution(d, { hideGambling: account.hideGambling });
  if (!a || Math.abs(a.delta) < SCORE_CHANGE_MIN) return [];
  return [{
    id: `score_change:${a.to.date}`, type: "score_change", section: "score",
    title: a.delta < 0 ? t.titleDown(-a.delta) : t.titleUp(a.delta),
    // No factor moved enough to name: say so rather than show an empty explanation.
    body: a.summary ? a.summary.charAt(0).toUpperCase() + a.summary.slice(1) + "." : t.noDetail,
    action: { label: t.action, href: "/score" },
    urgency: 3, amountAtStake: 0, expiresAt: addDays(a.to.date, 14),
    // Names gambling or alcohol spending: never pushed or put on a lock screen (spec 11 rule 4).
    ...(a.parts.some((p) => p.factor === "ADVERSE_SPEND" && p.points !== 0) ? { sensitive: true } : {}),
  }];
};
