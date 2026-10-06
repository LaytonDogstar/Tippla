// The SmartScore moved at the last refresh: say by how much and why (attribution, estimated points).
import { feedCopy } from "@/content/feed";
import { addDays } from "@/lib/format";
import { scoreAttribution } from "@/lib/selectors/scoreAttribution";
import type { Rule } from "../types";

const t = feedCopy.rules.scoreChange;

export const scoreChange: Rule = ({ d }) => {
  const a = scoreAttribution(d);
  if (!a || a.delta === 0) return [];
  return [{
    id: `score_change:${a.to.date}`, type: "score_change", section: "score",
    title: a.delta < 0 ? t.titleDown(-a.delta) : t.titleUp(a.delta),
    // No factor moved enough to name: say so rather than show an empty explanation.
    body: a.summary ? a.summary.charAt(0).toUpperCase() + a.summary.slice(1) + "." : t.noDetail,
    action: { label: t.action, href: "/score" },
    urgency: a.delta < 0 ? 2 : 1, amountAtStake: 0, expiresAt: addDays(a.to.date, 14),
  }];
};
