import { describe, expect, it } from "vitest";
import { loadPersona } from "@/lib/api/client";
import { STAGES } from "@/config/stages";
import { scoreState, stageFor, topThreeFactors } from "@/lib/selectors";
import { load } from "./helpers";

describe("stages", () => {
  it("covers 0–1,000 without gaps", () => {
    for (let i = 1; i < STAGES.length; i++) expect(STAGES[i]!.min).toBe(STAGES[i - 1]!.max + 1);
    expect(STAGES[0]!.min).toBe(0);
    expect(STAGES.at(-1)!.max).toBe(1000);
  });
  it("computes the next stage and ring progress live", () => {
    expect(stageFor(449)).toMatchObject({ name: "Building", next: { name: "Steadying", pointsToGo: 1 } });
    expect(stageFor(450)).toMatchObject({ name: "Steadying", progress: 0 });
    expect(stageFor(1000)).toMatchObject({ name: "Thriving", next: null, progress: 1 });
  });
});

describe("score states", () => {
  it("an API failure gives the unavailable state, not a zero", async () => {
    const { data, scoreError } = await loadPersona("jess", { latencyMs: 0, fail: "score" });
    expect(scoreError?.endpoint).toBe("score");
    expect(scoreState(data)).toEqual({ kind: "unavailable" });
    expect(topThreeFactors(data)).toEqual([]);
  });
  it("a null factor is excluded from the top three, never treated as 0", async () => {
    const d = await load("jess");
    const withNull = { ...d, score: { ...d.score!, breakdown: { ...d.score!.breakdown, LOAN_AMOUNT_AND_TYPE: null } } };
    expect(topThreeFactors(withNull).map((f) => f.key)).not.toContain("LOAN_AMOUNT_AND_TYPE");
  });
  it("bank failure rejects the whole load", async () => {
    await expect(loadPersona("jess", { latencyMs: 0, fail: "bank" })).rejects.toThrow("Mock bank request failed");
  });
});
