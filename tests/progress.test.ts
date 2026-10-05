// Phase 3 (loop): progress (cycle history, positive streaks, action marks) and the buffer goal.
import { describe, expect, it } from "vitest";
import { parseAccount, serialiseAccount } from "@/lib/account/state";
import { progressCopy } from "@/content/progress";
import { cycleHistory, cycleRecap, goalPlan, positiveStreaks, progress, safeToSpend } from "@/lib/selectors";
import { load, loadPayday } from "./helpers";

describe("progress", async () => {
  const [jess, jessP, marcus, priya] = await Promise.all([load("jess"), loadPayday("jess"), load("marcus"), load("priya")]);

  it("the last completed cycle on the progress page is exactly the recap's cycle", () => {
    for (const d of [jessP, marcus, priya]) {
      const last = cycleHistory(d).at(-1)!;
      const r = cycleRecap(d)!;
      expect(last.cycle).toEqual(r.cycle);
      expect([last.spent, last.paidIn, last.endBalance, last.advances, last.fees]).toEqual([r.spent, r.paidIn, r.endBalance, r.advances, r.fees]);
    }
  });

  it("six completed pay cycles, oldest first, only inside the data", () => {
    const c = cycleHistory(jess);
    expect(c.map((x) => x.cycle.start)).toEqual(["2026-06-25", "2026-07-09", "2026-07-23", "2026-08-06", "2026-08-20", "2026-09-03"]);
    expect(cycleHistory(priya)).toHaveLength(3); // 45 days of data
    for (const d of [jess, marcus, priya]) for (const x of cycleHistory(d)) expect(x.cycle.start >= d.profile.data_from).toBe(true);
  });

  it("streaks only celebrate: 2+ in a row, never an ended streak (Jess has none)", () => {
    expect(positiveStreaks(jess)).toEqual([]);
    expect(positiveStreaks(marcus)).toEqual([
      { kind: "no_advance", cycles: 12 }, { kind: "no_failed_payment", cycles: 12 }, { kind: "money_left", cycles: 10 },
    ]);
    expect(positiveStreaks(priya).every((s) => s.cycles >= 2)).toBe(true);
    const words = JSON.stringify([progressCopy.streaks, progressCopy.goal, progressCopy.cycles].map((g) => Object.values(g).map((v) => (typeof v === "function" ? (v as (...a: unknown[]) => string)(3, "$0", "01/01") : v))));
    expect(words).not.toMatch(/broke|lost|failed to|missed|behind|streak ended|reset/i);
  });

  it("marks what the customer did in the app on the timeline", () => {
    const p = progress(jess, {
      actions: [{ type: "skip_advance", at: "2026-09-25T09:30:00+10:00" }, { type: "cancelled_subscription", key: "Binge", at: "2026-09-24T09:30:00+10:00" }],
      feed: { "bill_over_balance:Beforepay:2026-09-30": { status: "done", at: "2026-09-25" }, "shortfall:2026-09-17": { status: "done", at: "2026-09-25" } },
    });
    expect(p.marks).toEqual([
      { date: "2026-09-24", kind: "cancelled_subscription", label: "Binge" },
      { date: "2026-09-25", kind: "skip_advance", label: undefined },
      { date: "2026-09-25", kind: "acted_on_bill", label: "Beforepay" },
    ]);
  });
});

describe("goal", async () => {
  const [jess, jessP, marcus] = await Promise.all([load("jess"), loadPayday("jess"), load("marcus")]);
  const goal = (setAt: string) => ({ amount: 200, by: "2026-12-15", setAt });

  it("builds up evenly, pay cycle by pay cycle (Q22)", () => {
    const g = goalPlan(jessP, goal("2026-10-01"))!;
    expect([g.cyclesTotal, g.cycleNumber, g.thisCycle]).toEqual([6, 1, 33]);
    // Set two pay cycles earlier: this is cycle 3 of 8.
    const earlier = goalPlan(jessP, goal("2026-09-03"))!;
    expect([earlier.cyclesTotal, earlier.cycleNumber, earlier.thisCycle]).toEqual([8, 3, 75]);
    expect(goalPlan(jess, undefined)).toBeNull();
  });

  it("is never shorter than two pay cycles", () => {
    expect(goalPlan(jessP, { amount: 200, by: "2026-10-02", setAt: "2026-10-01" })!.cyclesTotal).toBe(2);
  });

  it("progress is the money left the day before the most recent payday since it was set", () => {
    expect(goalPlan(jessP, goal("2026-10-01"))!.latest).toBeNull();
    const g = goalPlan(jessP, goal("2026-09-25"))!;
    expect(g.latest).toEqual({ date: "2026-09-30", amount: -679.94 });
    expect([g.percent, g.reached]).toEqual([0, false]);
    const m = goalPlan(marcus, { amount: 500, by: "2026-12-15", setAt: "2026-09-01" })!;
    expect(m.latest!.amount).toBeCloseTo(917.28, 2);
    expect([m.percent, m.reached]).toEqual([100, true]);
  });

  it("safe to spend sets this cycle's goal aside, and puts it on hold rather than reach $0", () => {
    const g = goalPlan(jessP, goal("2026-10-01"))!;
    const s = safeToSpend(jessP, { goal: g.thisCycle });
    expect(s.goal).toBe(33);
    expect(s.perDay).toBe(Math.floor((399.56 - 50 - 33) / 14));
    expect(s.perDay).toBe(22);
    // Jess on 25/09: nothing spare, so the goal waits (and the figure is still $0, not negative).
    expect(safeToSpend(jess, { goal: 33 })).toMatchObject({ goal: 0, goalOnHold: true, perDay: 0 });
    // A goal bigger than what's spare also waits instead of taking the daily figure to $0.
    expect(safeToSpend(jessP, { goal: 10_000 })).toMatchObject({ goal: 0, goalOnHold: true, perDay: 24 });
  });

  it("goal survives the cookie round trip; bad goals are dropped", () => {
    const raw = serialiseAccount(undefined, "jess", { goal: goal("2026-10-01") });
    expect(parseAccount(raw, "jess").goal).toEqual(goal("2026-10-01"));
    for (const bad of [{ amount: 5, by: "2026-12-15", setAt: "2026-10-01" }, { amount: 99999, by: "2026-12-15", setAt: "2026-10-01" }, { amount: 200, by: "soon", setAt: "2026-10-01" }]) {
      expect(parseAccount(encodeURIComponent(JSON.stringify({ jess: { goal: bad } })), "jess").goal).toBeUndefined();
    }
  });
});
