import { describe, expect, it } from "vitest";
import { annulusPath, coverage, donutSectors, ringGeometry, stageMarkerX } from "@/lib/ui/geometry";

describe("component geometry (components.md)", () => {
  it("ScoreRing: Jess's arc is exactly 22/150 with no minimum fill", () => {
    const g = ringGeometry(200, 12, 22 / 150);
    expect(g.r).toBe(94);
    expect(g.dash / g.circumference).toBeCloseTo(0.146666, 5);
    expect(ringGeometry(200, 12, 0).hideArc).toBe(true);
    expect(ringGeometry(200, 12, 1.4).dash).toBeCloseTo(ringGeometry(200, 12, 1).circumference, 6);
  });
  it("StageScale: Jess's marker sits 89.4267 px from the inner left edge", () => {
    expect(stageMarkerX(310, 1, 22 / 150)).toBeCloseTo(89.4267, 4);
    expect(stageMarkerX(310, 2, 12 / 150)).toBeCloseTo(2 * 78.5 + 74.5 * 0.08, 4); // Marcus, Healthy
  });
  it("Donut: angles are proportional, zero amounts dropped, no minimum angle", () => {
    const s = donutSectors([{ key: "a", value: 75 }, { key: "b", value: 0 }, { key: "c", value: 25 }]);
    expect(s.map((x) => x.key)).toEqual(["a", "c"]);
    expect(s[0]!.end).toBeCloseTo(Math.PI * 1.5, 9);
    expect(s[1]!.end).toBeCloseTo(Math.PI * 2, 9);
    expect(annulusPath(125, 125, 120, 80, 0, Math.PI / 2)).toMatch(/^M125\.000 5\.000A120 120 0 0 1 245\.000 125\.000/);
  });
  it("PayCycleHero coverage: Jess 314/367 covered, 53/367 short", () => {
    const c = coverage(31431, 36700);
    expect(c.short).toBe(true);
    expect(c.covered).toBeCloseTo(31431 / 36700, 9);
    expect(c.remainder).toBeCloseTo(5269 / 36700, 9);
    expect(coverage(-500, 1000)).toEqual({ covered: 0, remainder: 1, short: true }); // negative balance: no negative width
    expect(coverage(0, 0)).toEqual({ covered: 0, remainder: 0, short: false });
  });
});
