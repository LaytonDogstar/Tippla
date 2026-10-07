// Today redesign (07/10/2026): the presentation selectors pick the right hero state and every figure on the page
// still reconciles with the selectors it comes from.
import { describe, expect, it } from "vitest";
import { applyDevStates } from "@/lib/dev/states";
import {
  categoryTotals, comingUp, cycleDays, dueCoverage, feedAmount, feedTone, heroState, initials, monthAverage, monthPeriod,
  payCycleSummary, safeToSpendFor, sixMonthSpending, spendGroups,
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

describe("spending summary", () => {
  it("groups add up to the month's category total, which matches the month's bar", async () => {
    for (const p of ["jess", "marcus", "priya"] as const) {
      const d = await load(p);
      const bars = sixMonthSpending(d);
      const last = bars.at(-1)!;
      const rows = categoryTotals(d, monthPeriod(d, last.month));
      const groups = spendGroups(rows);
      const sum = groups.reduce((s, g) => s + Math.round(g.total * 100), 0);
      expect(sum, p).toBe(rows.reduce((s, r) => s + Math.round(r.total * 100), 0));
      expect(Math.round(sum / 100), p).toBe(Math.round(last.total!));
      expect(groups.at(-1)?.group === "other" || !groups.some((g) => g.group === "other")).toBe(true);
    }
  });

  it("with gambling insights turned off, gambling counts in Other", async () => {
    const d = await load("jess");
    const rows = categoryTotals(d, monthPeriod(d, "2026-09"));
    expect(spendGroups(rows).some((g) => g.group === "gambling")).toBe(true);
    const hidden = spendGroups(rows, { hideGambling: true });
    expect(hidden.some((g) => g.group === "gambling")).toBe(false);
    expect(hidden.reduce((s, g) => s + g.total, 0)).toBeCloseTo(spendGroups(rows).reduce((s, g) => s + g.total, 0), 2);
  });

  it("the average uses complete months only", async () => {
    const bars = sixMonthSpending(await load("jess"));
    const avg = monthAverage(bars)!;
    expect(avg.months).toBe(5);
    expect(avg.average).toBe(Math.round((4529.46 + 6360.88 + 4988.57 + 5384.7 + 5256.6) / 5));
    expect(monthAverage(sixMonthSpending(await load("priya")))?.months).toBe(1);
  });
});
