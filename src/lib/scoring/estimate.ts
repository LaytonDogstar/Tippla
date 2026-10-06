// Q3 SAMPLE LOGIC (docs/05: "a clearly isolated placeholder heuristic"): project the SmartScore if the
// customer acts on their top recommendation, using assumed factor lifts and sample weights. Always shown
// as an estimate; switched off with SHOW_SCORE_PROJECTIONS.
import type { PersonaData } from "@/lib/api/types";
import { PROJECTION_LIFTS, PROJECTION_REFRESHES, SAMPLE_FACTOR_WEIGHTS, SHOW_SCORE_PROJECTIONS_DEFAULT } from "@/config/flags";
import { addDays, type ISODate } from "@/lib/format/dates";
import { recommendations } from "@/lib/selectors/recommendations";
import type { FocusGoal } from "@/lib/account/state";

export interface ScoreProjection { recommendationId: string; liftKey: string; from: number; to: number; by: ISODate; factor: string; estimated: true }

const liftKeyFor = (id: string) => (id.startsWith("pay-off-") ? "payoff" : id);

/** The sample projection for one action (spec 08 simulate_score uses this too). */
export function projectFor(d: PersonaData, recommendationId: string): ScoreProjection | null {
  if (!d.score || d.score.override || d.score.score === null) return null;
  const key = liftKeyFor(recommendationId);
  const lift = PROJECTION_LIFTS[key];
  if (!lift) return null;
  const current = d.score.breakdown[lift.factor];
  if (current === null || current === undefined) return null;
  const gain = Math.max(0, Math.min(10, current + lift.lift) - current);
  const points = Math.round(SAMPLE_FACTOR_WEIGHTS[lift.factor] * gain);
  const last = d.scoreHistory.at(-1)?.scored_date ?? d.asOf;
  return {
    // Spec 02: rounded to the nearest 5, never false precision.
    recommendationId, liftKey: key, from: d.score.score, to: Math.min(1000, Math.round((d.score.score + points) / 5) * 5),
    by: addDays(last, 14 * PROJECTION_REFRESHES), factor: lift.factor, estimated: true,
  };
}

export function projectScore(d: PersonaData, enabled = SHOW_SCORE_PROJECTIONS_DEFAULT, goal?: FocusGoal): ScoreProjection | null {
  if (!enabled || !d.score || d.score.override || d.score.score === null) return null;
  const top = recommendations(d, goal)[0];
  return top ? projectFor(d, top.id) : null;
}
