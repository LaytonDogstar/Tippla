// Spec 08: suggested questions, from what's in the member's feed first, then common questions.
import { assistantCopy as t } from "@/content/assistant";
import type { FeedItem } from "@/lib/feed/types";

const BY_TYPE: Partial<Record<FeedItem["type"], string>> = {
  shortfall: t.suggestions.afford, score_change: t.suggestions.score, new_subscription: t.suggestions.subscriptions,
  price_rise: t.suggestions.subscriptions, bill_over_balance: t.suggestions.bills, repayment_due: t.suggestions.bills,
};

export function suggestedQuestions(feed: FeedItem[], max = 4): string[] {
  const out = feed.map((i) => BY_TYPE[i.type]).filter((q): q is string => !!q);
  for (const q of [t.suggestions.safe, t.suggestions.bills, t.suggestions.takeaway, t.suggestions.plan, t.suggestions.score]) out.push(q);
  return [...new Set(out)].slice(0, max);
}
