// Today redesign (07/10/2026): the presentation selectors pick the right hero state and every figure on the page
// still reconciles with the selectors it comes from.
import { categoryNames } from "@/content/en-AU";
import { describe, expect, it } from "vitest";
import { applyDevStates } from "@/lib/dev/states";
import {
  categoryTotals, comingUp, cycleDays, dueCoverage, feedAmount, feedTone, heroState, initials, 
  payCycleSummary, safeToSpendFor, cycleSpending, cycleAverage, topCategories, currentCycle, totalSpent,
} from "@/lib/selectors";
import { load } from "./helpers";

describe("hero state", () => {
  it("short (Jess), on track (Marcus, Priya), tight (Marcus with the tight dev state)", async () => {
    const [jess, marcus, priya] = await Promise.all([load("jess"), load("marcus"), load("priya")]);
    const state = (d: typeof jess) => heroState(payCycleSummary(d), safeToSpendFor(d, {}));
    expect(state(jess)).toBe("short");
    expect(state(marcus)).toBe("onTrack");
    expect(state(priya)).toBe("onTrack");
    const tight = applyDevStates(marcus, ["tight"]);
    expect(payCycleSummary(tight).isShort).toBe(false);
    expect(state(tight)).toBe("tight");
  });

  it("balance against what's due reconciles: covered + short = due, covered + left = balance", async () => {
    for (const p of ["jess", "marcus", "priya"] as const) {
      const pc = payCycleSummary(await load(p));
      const c = dueCoverage(pc);
      if (pc.isShort) expect(Math.round((c.covered + c.short) * 100)).toBe(Math.round(pc.dueTotal * 100));
      else expect(Math.round((c.covered + c.left) * 100)).toBe(Math.round(pc.balance * 100));
      expect(c.coveredShare).toBeGreaterThanOrEqual(0);
      expect(c.coveredShare).toBeLessThanOrEqual(1);
    }
    // Jess: $314 covers $314 of $367; $53 short (the hero's headline).
    const j = dueCoverage(payCycleSummary(await load("jess")));
    expect(Math.round(j.short)).toBe(53);
  });

  it("one segment per day of the cycle, today marked once", async () => {
    const d = await load("jess");
    const days = cycleDays(payCycleSummary(d), d.asOf);
    expect(days).toHaveLength(14);
    expect(days.filter((x) => x === "today")).toHaveLength(1);
    expect(days.indexOf("today")).toBe(8); // 17/09 → 25/09
  });
});

describe("needs a look", () => {
  it("tone comes from urgency; amounts only where something specific is at stake", () => {
    expect(feedTone({ urgency: 5 })).toBe("negative");
    expect(feedTone({ urgency: 4 })).toBe("negative");
    expect(feedTone({ urgency: 3 })).toBe("caution");
    expect(feedTone({ urgency: 1 })).toBe("info");
    expect(feedAmount({ type: "shortfall", amountAtStake: 52.69 })).toEqual({ amount: 52.69, negative: true });
    expect(feedAmount({ type: "duplicate_charge", amountAtStake: 10.73 })).toEqual({ amount: 10.73, negative: false });
    expect(feedAmount({ type: "score_change", amountAtStake: 12 })).toBeNull();
    expect(feedAmount({ type: "price_rise", amountAtStake: 0.92 })).toBeNull();
  });
});

describe("coming up", () => {
  it("the next 14 days in date order: bills, pay advance repayments, expected pay and Tippla's charge", async () => {
    const d = await load("jess");
    const items = comingUp(d);
    expect(items.map((i) => i.date)).toEqual([...items.map((i) => i.date)].sort());
    expect(items.every((i) => i.date > d.asOf && i.date <= "2026-10-09")).toBe(true);
    expect(items.find((i) => i.kind === "payAdvance")).toMatchObject({ name: "Beforepay", amount: 315, date: "2026-09-30" });
    expect(items.find((i) => i.kind === "income")).toMatchObject({ date: "2026-10-01", amount: 2340 });
    expect(items.find((i) => i.kind === "tippla")).toMatchObject({ date: "2026-10-02", amount: 9.99, qualifier: "pausable" });
  });

  it("no bills state: only money in and Tippla's own charge remain", async () => {
    const d = applyDevStates(await load("jess"), ["no_bills"]);
    expect(comingUp(d).some((i) => i.kind === "bill" || i.kind === "payAdvance")).toBe(false);
    expect(payCycleSummary(d).dueBeforePayday).toEqual([]);
  });

  it("initials for merchant avatars", () => {
    expect(initials("Telstra")).toBe("TE");
    expect(initials("Qld Housing Rent")).toBe("QH");
    expect(initials("7-Eleven")).toBe("7E");
  });
});

describe("spending summary (pay cycles, one category list: UX round 2, 1.1)", () => {
  it("the current bar is this pay cycle's spend, the same figure as the Spending page and the Today hero", async () => {
    for (const p of ["jess", "marcus", "priya"] as const) {
      const d = await load(p);
      const bars = cycleSpending(d);
      expect(bars).toHaveLength(6);
      expect(bars.at(-1)!.current).toBe(true);
      expect(bars.at(-1)!.total, p).toBeCloseTo(totalSpent(d, currentCycle(d)), 2);
      expect(Math.round(bars.at(-1)!.total!), p).toBe(Math.round(payCycleSummary(d).spent));
    }
  });

  it("top categories and Other add up to the pay cycle's category total; names come from the one list", async () => {
    for (const p of ["jess", "marcus", "priya"] as const) {
      const d = await load(p);
      const rows = categoryTotals(d, currentCycle(d));
      const top = topCategories(rows);
      expect(top.items.length).toBeLessThanOrEqual(5);
      const sum = top.items.reduce((s, g) => s + Math.round(g.total * 100), 0) + Math.round((top.other?.total ?? 0) * 100);
      expect(sum, p).toBe(rows.reduce((s, r) => s + Math.round(r.total * 100), 0));
      for (const g of top.items) expect(categoryNames[g.category]).toBeTruthy();
    }
  });

  it("Jess: Other is the remainder after the five biggest, not a catch-all for unmapped categories", async () => {
    const d = await load("jess");
    const top = topCategories(categoryTotals(d, currentCycle(d)));
    const named = new Set(top.items.map((g) => g.category));
    for (const c of top.other?.categories ?? []) expect(named.has(c)).toBe(false);
    expect(top.items.map((g) => g.category)).toEqual(["housing", "loan_repayment", "gambling", "transport", "food"]);
  });

  it("with gambling insights turned off, gambling is never named: it counts in Other", async () => {
    const d = await load("jess");
    const rows = categoryTotals(d, currentCycle(d));
    const hidden = topCategories(rows, { hideGambling: true });
    expect(hidden.items.some((g) => g.category === "gambling")).toBe(false);
    expect(hidden.other!.categories).toContain("gambling");
  });

  it("the average uses complete pay cycles only", async () => {
    const d = await load("jess");
    const bars = cycleSpending(d);
    const avg = cycleAverage(bars)!;
    expect(avg.cycles).toBe(5);
    const done = bars.slice(0, 5).map((b) => b.total!);
    expect(avg.average).toBe(Math.round(done.reduce((s, v) => s + v, 0) / 5));
    // Priya: 45 days of data, so only the full cycles inside it count.
    const pb = cycleSpending(await load("priya"));
    expect(cycleAverage(pb)!.cycles).toBe(pb.filter((b) => !b.current && !b.partialHistory && b.total !== null).length);
  });
});
