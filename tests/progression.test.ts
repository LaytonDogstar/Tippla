// Spec 07: plans (steps checked from the data, carry over, switch), streak milestones, buffer growth,
// savings goals, the Healthy moment (5 improving cycles) and "What's next", and the cheaper-credit gate.
import { describe, expect, it } from "vitest";
import { applyDevStates } from "@/lib/dev/states";
import { activePlan, availablePlans, cycleOfBills, nextBufferStep, planProgress, publicPlanTitle, refinanceEligible, savingsGoalLimit, savingsGoalStatus, stageMoment, streakMilestones, suggestedPlan, surplusSuggestion, whatsNext } from "@/lib/selectors";
import { load, loadPayday } from "./helpers";

describe("plans", async () => {
  const [jess, jessP, marcus, priya] = await Promise.all([load("jess"), loadPayday("jess"), load("marcus"), load("priya")]);
  const goal = { type: "off_advances" as const, startedAt: "2026-09-25" };

  it("acceptance: Jess (goal: stop relying on pay advances) sees Get off pay advances at step 1 with this cycle's target", () => {
    const p = activePlan(jess, {}, goal)!;
    expect([p.type, p.title, p.current, p.explicit]).toEqual(["off_advances", "Get off pay advances", 0, false]);
    expect(p.steps.map((s) => s.label)).toEqual(["A pay cycle with pay advances of $150 or less", "A pay cycle with pay advances of $75 or less", "A pay cycle with no new pay advance"]);
    expect(p.steps[0]!.soFar).toBe("$0 of pay advances so far, against $150.");
  });

  it("only what happens after the start counts; the step ticks itself at payday", () => {
    const p = activePlan(jessP, {}, goal)!;
    expect(p.steps.map((s) => [s.status, s.doneOn])).toEqual([["done", "2026-09-30"], ["current", null], ["upcoming", null]]);
    // Started earlier, her $300 advances don't meet the first step: it carries over, no penalty.
    expect(planProgress(jessP, {}, "off_advances", "2026-09-03").current).toBe(0);
  });

  it("checked from data where possible, Mark as done otherwise", () => {
    const r = planProgress(marcus, { buffer: 50 }, "reach_payday", "2026-08-01");
    expect(r.steps.map((s) => s.status)).toEqual(["done", "current", "upcoming"]);
    expect(r.steps[1]!.kind).toBe("manual");
    const marked = planProgress(marcus, { buffer: 50, plan: { type: "reach_payday", startedAt: "2026-08-01", manual: { 1: "2026-08-05" } } }, "reach_payday", "2026-08-01");
    expect(marked.steps.map((s) => s.status)).toEqual(["done", "done", "done"]);
    expect(marked.completed).toBe(true);
  });

  it("suggested by goal, then by band; the gambling plan is opt-in and never named outside its page", () => {
    expect([suggestedPlan(jess), suggestedPlan(marcus), suggestedPlan(priya), suggestedPlan(jess, "cut_bills")]).toEqual(["off_advances", null, "reach_payday", "cut_bills"]);
    expect(availablePlans(jess)).toEqual(["off_advances", "reach_payday", "cut_bills", "pay_on_time", "gambling_less"]);
    expect(availablePlans(marcus)).not.toContain("gambling_less");
    const g = planProgress(jess, { plan: { type: "gambling_less", startedAt: "2026-09-25" } }, "gambling_less", "2026-09-25");
    expect(publicPlanTitle(g)).toBe("Your personal plan");
    expect(g.steps[0]!.status).toBe("current");
    expect(planProgress(jess, { plan: { type: "gambling_less", startedAt: "2026-09-25", limit: 50 } }, "gambling_less", "2026-09-25").steps[0]!.status).toBe("done");
  });
});

describe("progression", async () => {
  const [jess, marcus, marcusP] = await Promise.all([load("jess"), load("marcus"), loadPayday("marcus")]);

  it("acceptance: 5 improving cycles take Jess to Healthy with the moment, then What's next", () => {
    expect(stageMoment(jess)).toBeNull();
    const improved = applyDevStates(jess, ["improved"]);
    expect(improved.scoreHistory.map((h) => h.score)).toEqual([472, 498, 525, 551, 578, 604]);
    expect(stageMoment(improved)).toEqual({ stage: "healthy", from: 472, to: 604, cycles: 5, feesAvoided: 0 });
    expect(stageMoment(improved, { bandsSeen: ["healthy"] })).toBeNull(); // once
    expect(whatsNext("healthy")).toEqual(["emergency", "goals", "creditFile"]);
    // Marcus crossed at the previous refresh (589 → 601), so his moment shows too.
    expect(stageMoment(marcus)).toMatchObject({ from: 548, to: 612, cycles: 5 });
  });

  it("streak milestones only at exactly 2, 4 and 6 pay cycles", () => {
    expect(streakMilestones(marcusP)).toEqual([]); // 13 in a row: past the milestones
  });

  it("buffer grows $50 → $100 → $250 → one pay cycle of bills; surplus suggests the next step", () => {
    expect(cycleOfBills(marcus)).toBe(663);
    expect([nextBufferStep(marcus, 0), nextBufferStep(marcus, 50), nextBufferStep(marcus, 250), nextBufferStep(marcus, 663)]).toEqual([50, 100, 663, null]);
    expect(surplusSuggestion(marcus, 1114.57, 0)).toBe(50);
    expect(surplusSuggestion(marcus, 1114.57, 250)).toBe(413);
    expect(surplusSuggestion(marcus, 35, 663)).toBe(30);
    expect(surplusSuggestion(marcus, -10, 0)).toBeNull();
  });

  it("savings goals: one at Healthy, none before; progress from a linked savings account", () => {
    expect([savingsGoalLimit(jess), savingsGoalLimit(marcus)]).toEqual([0, 1]);
    const withSavings = applyDevStates(marcus, ["two_accounts"]);
    const g = savingsGoalStatus(withSavings, { id: "x", name: "Christmas", target: 300, by: "2026-12-15", createdAt: "2026-09-25", accountId: 2 });
    expect(g).toMatchObject({ saved: 300, percent: 100, reached: true });
    const h = savingsGoalStatus(withSavings, { id: "y", name: "Car", target: 1000, by: "2026-12-15", createdAt: "2026-09-25", accountId: 2 });
    expect([h.saved, h.percent, h.cyclesLeft, h.perCycle]).toEqual([412.6, 41, 6, 98]);
    expect(savingsGoalStatus(marcus, { id: "z", name: "Car", target: 1000, by: "2026-12-15", createdAt: "2026-09-25" }).saved).toBeNull();
  });

  it("cheaper-credit check (gate G1): only Healthy+, nothing short, no hardship tools in 3 pay cycles", () => {
    expect([refinanceEligible(marcus), refinanceEligible(jess)]).toEqual([true, false]);
    expect(refinanceEligible(marcus, { hardshipVisitedAt: "2026-09-01" })).toBe(false);
    expect(refinanceEligible(marcus, { hardshipVisitedAt: "2026-08-01" })).toBe(true);
    expect(refinanceEligible(marcus, { hardshipSelfSelected: true })).toBe(false);
  });
});
