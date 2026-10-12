// SmartScore one-column page (12/10/2026): the shortfall guard (shown when Today shows a shortfall, hidden
// otherwise), the section-order flag and numbering, the direction label, the next update, every factor's change
// since the last update, reason lines and the "Most room to move" ranking.
import { describe, expect, it } from "vitest";
import {
  factorLines, groupFactors, nextUpdate, payCycleSummary, scoreAttribution, scoreDirection, scoreSections, shortfallGuard, updateCadence,
  type PayCycleSummary,
} from "@/lib/selectors";
import { scorePage as t } from "@/content/factors";
import { load } from "./helpers";

describe("shortfall guard", () => {
  it("Jess: Today shows $53 short before payday Thu 01/10, so the note shows the same", async () => {
    const pc = payCycleSummary(await load("jess"));
    expect(pc.isShort).toBe(true);
    expect(shortfallGuard(pc)).toEqual({ amount: 53, payday: "2026-10-01" });
  });
  it("Marcus: no shortfall on Today, so no note", async () => {
    const pc = payCycleSummary(await load("marcus"));
    expect(pc.isShort).toBe(false);
    expect(shortfallGuard(pc)).toBeNull();
  });
  it("follows Today's summary, whatever the amount", () => {
    const pc = (left: number) => ({ isShort: left < 0, leftAfterBills: left, nextPayday: "2026-10-01" }) as PayCycleSummary;
    expect(shortfallGuard(pc(-0.4))).toEqual({ amount: 0, payday: "2026-10-01" });
    expect(shortfallGuard(pc(12))).toBeNull();
  });
});

describe("section order", () => {
  it("change first by default: Where you stand 1, Next step 2", () => {
    expect(scoreSections("changeFirst")).toEqual([{ id: "stand", n: 1 }, { id: "next", n: 2 }]);
  });
  it("action first swaps them and renumbers", () => {
    expect(scoreSections("actionFirst")).toEqual([{ id: "next", n: 1 }, { id: "stand", n: 2 }]);
  });
});

describe("history", () => {
  const h = (scores: number[]) => scores.map((score, i) => ({ score, scored_date: new Date(Date.UTC(2026, 6, 17 + i * 14)).toISOString().slice(0, 10) }));
  it("Jess: falling for 10 weeks; updates every 14 days, next Fri 09/10", async () => {
    const d = await load("jess");
    expect(scoreDirection(d.scoreHistory)).toEqual({ dir: "down", weeks: 10 });
    expect(updateCadence(d.scoreHistory)).toBe(14);
    expect(nextUpdate(d.scoreHistory)).toBe("2026-10-09");
  });
  it("counts only the latest run of same-direction moves", () => {
    expect(scoreDirection(h([500, 490, 495, 501]))).toEqual({ dir: "up", weeks: 4 });
    expect(scoreDirection(h([500, 500]))).toEqual({ dir: "steady", weeks: 2 });
    expect(scoreDirection(h([500]))).toBeNull();
    expect(nextUpdate(h([500]))).toBeNull();
  });
});

describe("factors", async () => {
  const d = await load("jess");
  const pc = payCycleSummary(d);
  const lines = factorLines(d, { attribution: scoreAttribution(d), payCycle: pc, loansOpen: "3 loans open", shortReason: t.shortReason });
  it("all 8 factors, each with its change since the last update", () => {
    expect(lines).toHaveLength(8);
    for (const l of lines) expect(l.change, l.name).not.toBeNull();
    expect(lines.find((l) => l.key === "LOAN_AMOUNT_AND_TYPE")).toMatchObject({ previous: 3.4, value: 2.9, change: -0.5 });
  });
  it("reasons: what moved it, then the shortfall, then open loans, then the drawer", () => {
    const by = (k: string) => lines.find((l) => l.key === k)!.reason;
    expect(by("ADVERSE_SPEND")).toMatch(/gambling/i);
    expect(by("DISPOSABLE_INCOME")).toBeTruthy();
    for (const l of lines) expect(l.reason, l.name).toBeTruthy();
  });
  it("Most room to move: three actionable factors, by points available; the rest are Other", () => {
    const { room, other, strongest } = groupFactors(lines);
    expect(room).toHaveLength(3);
    expect(room.every((r) => r.actionable)).toBe(true);
    for (let i = 1; i < room.length; i++) expect(room[i - 1]!.pointsAvailable).toBeGreaterThanOrEqual(room[i]!.pointsAvailable);
    expect(room.map((r) => r.key).sort()).toEqual(["ADVERSE_SPEND", "DISPOSABLE_INCOME", "LOAN_AMOUNT_AND_TYPE"]);
    expect(other).toHaveLength(5);
    expect(strongest?.name).toBe("Income stability");
  });
  it("Priya (no score yet): no room group, every factor listed, no changes", async () => {
    const p = await load("priya");
    const l = factorLines(p, { attribution: null, payCycle: payCycleSummary(p) });
    const g = groupFactors(l);
    expect(g.room).toEqual([]);
    expect(g.other).toHaveLength(8);
    expect(l.every((x) => x.value === null && x.change === null)).toBe(true);
  });
});
