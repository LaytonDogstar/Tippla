// Pay cycles, "Money left the day before payday" (13/10/2026): the generated headline and context line, one scale
// for the chart in both directions (forecast included), the stats, and each cycle's money in / money out.
import { describe, expect, it } from "vitest";
import { cycleBefore, partOfMonth, progress, trendBars, trendContext, trendHeadline, cycleBreakdown, resolvePeriod } from "@/lib/selectors";
import { load } from "./helpers";

describe("headline", () => {
  it("all below: the run of cycles ending most recently, and whether this one is heading the same way", () => {
    expect(trendHeadline([83, 12, -241, -49, -698, -636], -483)).toEqual({ kind: "allBelow", n: 4, forecastBelow: true });
    expect(trendHeadline([-10, -20], 50)).toEqual({ kind: "allBelow", n: 2, forecastBelow: false });
  });
  it("all above: money left N cycles in a row", () => {
    expect(trendHeadline([726, 311, 469, 247, 553, 917], 974)).toEqual({ kind: "allAbove", n: 6 });
    expect(trendHeadline([-50, 20, 30, 40], 10)).toEqual({ kind: "allAbove", n: 3 });
  });
  it("mixed: the last cycle breaks the pattern (or there's only one)", () => {
    expect(trendHeadline([-10, -20, -30, 5], -1)).toEqual({ kind: "mixed", below: 3, of: 4 });
    expect(trendHeadline([40, -5], null)).toEqual({ kind: "mixed", below: 1, of: 2 });
    expect(trendHeadline([-5], -1)).toEqual({ kind: "mixed", below: 1, of: 1 });
  });
});

describe("context line", () => {
  const c = (bal: number[]) => bal.map((balance, i) => ({ end: `2026-0${6 + Math.floor(i / 2)}-${i % 2 ? "22" : "08"}`, balance }));
  it("Jess: a little left until late July, below $0 since, advances from late August", () => {
    const t = trendContext([{ end: "2026-07-08", balance: 83 }, { end: "2026-07-22", balance: 12 }, { end: "2026-08-05", balance: -241 }, { end: "2026-08-19", balance: -49 }], "2026-08-27");
    expect(t).toEqual({ kind: "turnedBelow", until: "2026-07-22", little: true, advancesFrom: "2026-08-27" });
    expect([partOfMonth("2026-07-22"), partOfMonth("2026-08-27"), partOfMonth("2026-08-05"), partOfMonth("2026-08-15")].map((p) => p.part)).toEqual(["late", "late", "early", "mid"]);
  });
  it("always below, turned above, always above, and mixed", () => {
    expect(trendContext(c([-1, -2, -3]), null)).toEqual({ kind: "alwaysBelow", advancesFrom: null });
    expect(trendContext(c([-1, 20, 30]), null)!.kind).toBe("turnedAbove");
    expect(trendContext(c([10, 20]), null)).toEqual({ kind: "alwaysAbove", advancesFrom: null });
    expect(trendContext(c([10, -20]), "2026-08-01")).toEqual({ kind: "mixed", advancesFrom: "2026-08-01" });
    expect(trendContext([], null)).toBeNull();
  });
});

describe("chart scale", () => {
  const col = (value: number, forecast = false) => ({ start: "2026-01-01", end: "2026-01-14", value, forecast, advance: false, fee: false });
  it("one scale both ways: heights are |value| over (tallest up + deepest down); the forecast bar is on the same scale", () => {
    const { bars, above } = trendBars([col(83), col(12), col(-241), col(-698), col(-483, true)]);
    expect(above).toBeCloseTo(83 / (83 + 698), 5);
    expect(bars[0]!.height / bars[3]!.height).toBeCloseTo(83 / 698, 5);
    expect(bars[4]!.height).toBeCloseTo(483 / (83 + 698), 5);
    expect(bars[4]!.forecast).toBe(true);
  });
  it("all positive: the area above $0 is the whole chart", () => {
    const { bars, above } = trendBars([col(100), col(400, true)]);
    expect(above).toBe(1);
    expect(bars.map((b) => b.height)).toEqual([0.25, 1]);
  });
});

describe("Jess, from the persona data", () => {
  it("bars, tags and stats match the brief", async () => {
    const t = progress(await load("jess")).trend;
    expect(t.bars.map((b) => [Math.round(b.value), b.advance, b.fee, b.forecast])).toEqual([
      [83, false, false, false], [12, false, false, false], [-241, false, true, false], [-49, false, false, false],
      [-698, true, false, false], [-636, true, true, false], [-483, true, false, true],
    ]);
    expect(t.stats).toEqual({
      below: { count: 4, of: 6, plusForecast: true },
      advances: { total: 900, count: 3, fees: 45, since: "2026-08-27", toRepay: 1 },
      fees: { count: 2, cycles: [{ start: "2026-07-23", end: "2026-08-05" }, { start: "2026-09-03", end: "2026-09-16" }] },
    });
    expect(t.rows.map((r) => [r.start, r.ago])).toEqual([["2026-09-03", 1], ["2026-08-20", 2], ["2026-08-06", 3], ["2026-07-23", 4], ["2026-07-09", 5], ["2026-06-25", 6]]);
    expect(t.current).toEqual({ start: "2026-09-17", end: "2026-09-30", advances: [{ date: "2026-09-24", amount: 300 }], fees: 0 });
  });
  it("03/09–16/09 breakdown: money in $2,466.66 with the advance, money out by group, over by $238.28", async () => {
    const d = await load("jess");
    const b = cycleBreakdown(d, cycleBefore(d, 1));
    expect(b.moneyIn).toEqual([{ label: "Harbourside Hospitality Pty", amount: 2166.66, kind: "pay" }, { label: "Beforepay", amount: 300, kind: "advance" }]);
    expect(b.moneyOut.map((m) => [m.group, m.amount])).toEqual([["rent", 820], ["everyday", 431.96], ["gambling", 385], ["loans", 375], ["advance", 315], ["bills", 77.98]]);
    expect([b.paid, b.inTotal, b.spent, b.scale, b.over]).toEqual([2166.66, 2466.66, 2404.94, 2466.66, 238.28]);
  });
  it("Marcus: money left 6 in a row, no advances or fees; Centrelink is its own source", async () => {
    const d = await load("marcus");
    const t = progress(d).trend;
    expect(t.headline).toEqual({ kind: "allAbove", n: 6 });
    expect([t.stats.below.count, t.stats.advances, t.stats.fees.count]).toEqual([0, null, 0]);
    expect(cycleBreakdown(d, cycleBefore(d, 1)).moneyIn.map((m) => m.kind)).toEqual(expect.arrayContaining(["pay", "centrelink"]));
  });
});

describe("Spending ?cycle=", () => {
  it("opens an older pay cycle; out of range falls back to this one", async () => {
    const d = await load("jess");
    expect(resolvePeriod(d, { cycle: "4" })).toMatchObject({ start: "2026-07-23", end: "2026-08-05" });
    expect(resolvePeriod(d, { cycle: "1" }).id).toBe("last_cycle");
    expect(resolvePeriod(d, { cycle: "40" }).id).toBe("this_cycle");
    expect(resolvePeriod(d, { cycle: "x" }).id).toBe("this_cycle");
  });
});
