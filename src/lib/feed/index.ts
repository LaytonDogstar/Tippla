// "Needs a look": run every rule, drop what the customer has dealt with, rank, and group for badges.
// Offers are never a rule: the feed is about the customer's own money (guardrail).
import { RULES } from "./registry";
import { FEED_MAX, isOpen, rank } from "./rank";
import type { FeedContext, FeedItem, FeedSection, FeedState } from "./types";

export * from "./types";
export { rank, rankScore, isOpen, RANK_WEIGHTS, FEED_MAX, changedMaterially } from "./rank";
export { RULES } from "./registry";

/** Every item the rules produce, ranked (before the customer's done / snooze / dismiss). */
export function allFeedItems(ctx: FeedContext): FeedItem[] {
  return rank(Object.values(RULES).flatMap((r) => r(ctx)));
}

/** Items Today's hero already shows (09/10/2026): kept for notifications, left out of Needs a look and its counts. */
export const IN_HERO: FeedItem["type"][] = ["shortfall"];

export function feed(ctx: FeedContext, state: FeedState = {}) {
  const open = allFeedItems(ctx).filter((i) => isOpen(i, state, ctx.d.asOf));
  // What Needs a look lists: everything open except what the hero already says.
  const shown = open.filter((i) => !IN_HERO.includes(i.type));
  const bySection: Record<FeedSection, number> = { today: 0, money: 0, score: 0, borrowing: 0, help: 0 };
  for (const i of shown) bySection[i.section] += 1;
  return { top: shown.slice(0, FEED_MAX), open, shown, bySection };
}
