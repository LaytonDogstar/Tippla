// SmartScore stage bands. PLACEHOLDER until product confirms (docs/10_open_questions.md Q4).
export const STAGES_ARE_SAMPLE = true;

export type StageId = "building" | "steadying" | "healthy" | "thriving";
export interface Stage { id: StageId; min: number; max: number }

export const SCORE_MAX = 1000;
export const STAGES: readonly Stage[] = [
  { id: "building", min: 0, max: 449 },
  { id: "steadying", min: 450, max: 599 },
  { id: "healthy", min: 600, max: 749 },
  { id: "thriving", min: 750, max: 1000 },
];
