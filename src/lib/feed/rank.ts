import type { ISODate } from "@/lib/format/dates";
import type { FeedItem, FeedState, Urgency } from "./types";

/**
 * Rank by urgency × amount at stake. Urgency is weighted geometrically so a $50 shortfall today outranks
 * a $200 yearly subscription cost; amounts below $10 count as $10 so information-only items (a score
 * change) still order sensibly.
 */
export const URGENCY_WEIGHT: Record<Urgency, number> = { 5: 81, 4: 27, 3: 9, 2: 3, 1: 1 };
export const MIN_STAKE = 10;
/** At most this many cards on Home at once. */
export const FEED_MAX = 3;
export const rankScore = (i: FeedItem) => URGENCY_WEIGHT[i.urgency] * Math.max(MIN_STAKE, i.amountAtStake);

export function rank(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => rankScore(b) - rankScore(a) || b.urgency - a.urgency || a.id.localeCompare(b.id));
}

/** Open = not done or dismissed, not snoozed past today, not expired. */
export function isOpen(item: FeedItem, state: FeedState, today: ISODate): boolean {
  if (item.expiresAt && item.expiresAt < today) return false;
  const s = state[item.id];
  if (!s) return true;
  if (s.status === "snoozed") return !!s.until && s.until <= today;
  return false;
}
