import type { ISODate } from "@/lib/format/dates";
import type { FeedItem, FeedState } from "./types";

/**
 * Spec 01 ranking: urgency × 10 + log10(max(amount at stake, $1)) × 5; ties go to whatever expires soonest.
 * Weights are config (SAMPLE LOGIC).
 */
export const RANK_WEIGHTS = { urgency: 10, amount: 5 } as const;
/** At most this many cards on Home at once. */
export const FEED_MAX = 3;
/** A done or "not relevant" card comes back if the amount at stake changes by more than this. */
export const RESURFACE_CHANGE = 0.2;

export const rankScore = (i: FeedItem) => i.urgency * RANK_WEIGHTS.urgency + Math.log10(Math.max(i.amountAtStake, 1)) * RANK_WEIGHTS.amount;

export function rank(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => rankScore(b) - rankScore(a) || (a.expiresAt ?? "9999").localeCompare(b.expiresAt ?? "9999") || a.id.localeCompare(b.id));
}

/** The facts changed materially since the customer dealt with it (spec 01: amount moved more than 20%). */
export const changedMaterially = (item: FeedItem, was: number | undefined) =>
  was !== undefined && Math.abs(item.amountAtStake - was) > Math.max(Math.abs(was), 1) * RESURFACE_CHANGE;

/** Open = not done or dismissed (unless the facts changed), not snoozed past today, not expired. */
export function isOpen(item: FeedItem, state: FeedState, today: ISODate): boolean {
  if (item.expiresAt && item.expiresAt < today) return false;
  const s = state[item.id];
  if (!s) return true;
  if (s.status === "snoozed") return !!s.until && s.until <= today;
  return changedMaterially(item, s.amount);
}
