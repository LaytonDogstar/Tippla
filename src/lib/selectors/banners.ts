import type { ArrayMetricValue, PersonaData } from "@/lib/api/types";
import { HARDSHIP_DISHONOUR_WITHIN_DAYS, HARDSHIP_OVERDRAWN_DAYS_90 } from "@/config/flags";
import { metric } from "@/lib/dataUse";
import { daysOverdrawn90 } from "./balance";
import { scoreDroppedForBanner } from "./score";
import { payCycleSummary } from "./payCycle";
import { currentCycle } from "./periods";
import type { AccountState } from "@/lib/account/state";
import { STAGES } from "@/config/stages";

const STAGE_MIN_STEADYING = STAGES.find((s) => s.id === "steadying")!.min;

/** docs/09: overdrawn on ≥ 15 of the last 90 days AND a dishonour in the last 30 days (or self-selected). */
export function hardshipTriggered(d: PersonaData, selfSelected = false): boolean {
  if (selfSelected) return true;
  const since = metric<ArrayMetricValue>(d.bankStatement, "AM2011")["90"]?.days_since_last;
  return daysOverdrawn90(d) >= HARDSHIP_OVERDRAWN_DAYS_90 && since !== null && since !== undefined && since <= HARDSHIP_DISHONOUR_WITHIN_DAYS;
}

export const lenderMatchingOn = (d: PersonaData) => d.consents.find((c) => c.id === "lender_matching")?.granted ?? false;

export type Banner =
  | { kind: "bank_expired"; since: string }
  | { kind: "hardship" }
  | { kind: "score_drop"; points: number };

/** One dashboard banner at a time, in priority order (docs/04 P1). Never an offer (05/10 guardrail). */
export function dashboardBanner(d: PersonaData, state: { bankExpiredSince?: string | null; hardshipSelfSelected?: boolean } = {}): Banner | null {
  if (state.bankExpiredSince) return { kind: "bank_expired", since: state.bankExpiredSince };
  if (hardshipTriggered(d, state.hardshipSelfSelected)) return { kind: "hardship" };
  const drop = scoreDroppedForBanner(d);
  if (drop !== null) return { kind: "score_drop", points: drop };
  return null;
}

export type OfferPause = "short" | "hardship" | "building";

/**
 * Spec 11 always-on rule 2: never show offers to a member who is short before payday, has engaged with
 * hardship support this pay cycle (opened it, self-selected, or made a hardship letter), or is in the Building
 * stage. Threshold to confirm with counsel (Q43).
 */
export function offerPause(d: PersonaData, a: Pick<AccountState, "hardshipSelfSelected" | "hardshipVisitedAt" | "hardshipLetters"> = {}): OfferPause | null {
  if (payCycleSummary(d).isShort) return "short";
  const start = currentCycle(d).start;
  if (a.hardshipSelfSelected || (a.hardshipVisitedAt && a.hardshipVisitedAt >= start) || (a.hardshipLetters ?? []).some((l) => l.at >= start)) return "hardship";
  const s = d.score?.score;
  if (s !== null && s !== undefined && !d.score?.override && s < STAGE_MIN_STEADYING) return "building";
  return null;
}

/** Offers are only visible with lender-matching consent, and never while paused (rule 2). */
export const visibleOffers = (d: PersonaData, a: Parameters<typeof offerPause>[1] = {}) => (lenderMatchingOn(d) && !offerPause(d, a) ? d.offers.offers : []);
