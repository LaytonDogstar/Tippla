import type { FactorKey, PersonaData } from "@/lib/api/types";
import { ACTIONABLE_FACTORS, SCORE_DROP_BANNER_POINTS, THIN_FILE_DAYS_NEEDED } from "@/config/flags";
import { SCORE_MAX, STAGES, type Stage } from "@/config/stages";
import { factorCopy, stageNames } from "@/content/en-AU";
import { addDays } from "@/lib/format/dates";

export interface StageInfo {
  stage: Stage;
  name: string;
  next: { stage: Stage; name: string; at: number; pointsToGo: number } | null;
  /** 0–1 progress through the current stage toward the next boundary (the ring's dominant visual). */
  progress: number;
}

export function stageFor(score: number): StageInfo {
  const i = STAGES.findIndex((s) => score >= s.min && score <= s.max);
  const stage = STAGES[i === -1 ? 0 : i]!;
  const nextStage = STAGES[i + 1];
  const top = nextStage ? nextStage.min : SCORE_MAX;
  return {
    stage,
    name: stageNames[stage.id],
    next: nextStage ? { stage: nextStage, name: stageNames[nextStage.id], at: nextStage.min, pointsToGo: nextStage.min - score } : null,
    progress: Math.min(1, Math.max(0, (score - stage.min) / (top - stage.min))),
  };
}

export type OverrideKind = "thin_file" | "no_activity" | "no_income" | "bureau_overdue" | "other";
const OVERRIDES: Record<number, OverrideKind> = { [-998]: "thin_file", [-997]: "no_activity", [-996]: "no_activity", [-995]: "no_income", [-999]: "bureau_overdue" };

export type ScoreState =
  | { kind: "scored"; score: number; stage: StageInfo; scoredAt: string }
  | { kind: "override"; override: OverrideKind; code: number; estimatedReadyDate: string | null; scoredAt: string }
  | { kind: "unavailable" };

export function scoreState(d: PersonaData): ScoreState {
  const s = d.score;
  if (!s) return { kind: "unavailable" };
  if (s.override) {
    const kind = OVERRIDES[s.override.code] ?? "other";
    return {
      kind: "override", override: kind, code: s.override.code, scoredAt: s.scoredAt,
      // Estimated date = first transaction + 90 days (docs/05).
      estimatedReadyDate: kind === "thin_file" ? addDays(d.profile.data_from, THIN_FILE_DAYS_NEEDED) : null,
    };
  }
  if (s.score === null) return { kind: "unavailable" };
  return { kind: "scored", score: s.score, stage: stageFor(s.score), scoredAt: s.scoredAt };
}

export interface Factor { key: FactorKey; name: string; explains: string; lifts: string; value: number | null; actionable: boolean }

/** All factors except GOVERNMENT_RELIANCE, which is never a tile (explained inside Income stability). */
export function factors(d: PersonaData): Factor[] {
  const b = d.score?.breakdown;
  return (Object.keys(factorCopy) as FactorKey[])
    .filter((k) => k !== "GOVERNMENT_RELIANCE")
    .map((key) => ({ key, ...factorCopy[key], value: b?.[key] ?? null, actionable: (ACTIONABLE_FACTORS as readonly string[]).includes(key) }));
}

/** Q2 default: the three lowest-scoring actionable factors; nulls are excluded. */
export function topThreeFactors(d: PersonaData): Factor[] {
  return factors(d).filter((f) => f.actionable && f.value !== null).sort((a, b) => a.value! - b.value!).slice(0, 3);
}

/** The single strongest actionable factor, for a specific, earned fact. */
export function strongestFactor(d: PersonaData): Factor | null {
  const f = factors(d).filter((x) => x.actionable && x.value !== null).sort((a, b) => b.value! - a.value!);
  return f[0] ?? null;
}

/** Change since the previous refresh ("Down 17 since 11/09"). Neutral styling either way. */
export function scoreChange(d: PersonaData): { delta: number; since: string } | null {
  const h = d.scoreHistory;
  if (h.length < 2) return null;
  const last = h[h.length - 1]!, prev = h[h.length - 2]!;
  return { delta: last.score - prev.score, since: prev.scored_date };
}

export const scoreTrend = (d: PersonaData) => d.scoreHistory.map((p) => ({ date: p.scored_date, score: p.score }));

export function scoreDroppedForBanner(d: PersonaData): number | null {
  const c = scoreChange(d);
  return c && -c.delta >= SCORE_DROP_BANNER_POINTS ? -c.delta : null;
}
