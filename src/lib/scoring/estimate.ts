// Q3 SAMPLE LOGIC (docs/05: "a clearly isolated placeholder heuristic"): project the SmartScore if the
// customer acts on their top recommendation, using assumed factor lifts and sample weights. Always shown
// as an estimate; switched off with SHOW_SCORE_PROJECTIONS.
import type { PersonaData } from "@/lib/api/types";
import { PROJECTION_LIFTS, PROJECTION_REFRESHES, SAMPLE_FACTOR_WEIGHTS, SHOW_SCORE_PROJECTIONS_DEFAULT } from "@/config/flags";
import { addDays, type ISODate } from "@/lib/format/dates";
import { recommendations } from "@/lib/selectors/recommendations";

export interface ScoreProjection { recommendationId: string; liftKey: string; from: number; to: number; by: ISODate; factor: string; estimated: true }

const liftKeyFor = (id: string) => (id.startsWith("pay-off-") ? "payoff" : id);

export function projectScore(d: PersonaData, enabled = SHOW_SCORE_PROJECTIONS_DEFAULT): ScoreProjection | null {
  if (!enabled || !d.score || d.score.override || d.score.score === null) return null;
  const top = recommendations(d)[0];
  if (!top) return null;
  const key = liftKeyFor(top.id);
  const lift = PROJECTION_LIFTS[key];
  if (!lift) return null;
  const current = d.score.breakdown[lift.factor];
  if (current === null || current === undefined) return null;
  const gain = Math.max(0, Math.min(10, current + lift.lift) - current);
  const points = Math.round(SAMPLE_FACTOR_WEIGHTS[lift.factor] * gain);
  const last = d.scoreHistory.at(-1)?.scored_date ?? d.asOf;
  return {
    recommendationId: top.id, liftKey: key, from: d.score.score, to: Math.min(1000, d.score.score + points),
    by: addDays(last, 14 * PROJECTION_REFRESHES), factor: lift.factor, estimated: true,
  };
}
