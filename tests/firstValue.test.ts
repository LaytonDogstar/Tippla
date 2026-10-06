// Spec 04: the first insight (priority order and the positive fallback), goal options and labels, the goal
// shaping the plan and recap, the first payday, and the goal surviving the cookie round trip.
import { describe, expect, it } from "vitest";
import { parseAccount, serialiseAccount } from "@/lib/account/state";
import { ahaCopy } from "@/content/firstValue";
import { advanceFees, ahaCandidates, firstInsight, goalLabel, goalOptions, isFirstPayday, orderForGoal, recapLead, recommendations } from "@/lib/selectors";
import { load, loadPayday } from "./helpers";

describe("first insight", async () => {
  const [jess, marcus, priya] = await Promise.all([load("jess"), load("marcus"), load("priya")]);

  it("Jess: the shortfall comes first, from the same numbers as Today", () => {
    const a = firstInsight(jess);
    expect(a).toMatchObject({ type: "shortfall", short: 52.69, balance: 314.31, due: 367, payday: "2026-10-01" });
    expect(ahaCopy.shortfall.title("$53", "01/10")).toBe("Heads up: you could be about $53 short before your 01/10 payday");
  });

  it("keeps the spec's priority order: shortfall, subscriptions, pay advance fees, then the positive fallback", () => {
    expect(ahaCandidates(jess).map((a) => a.type)).toEqual(["shortfall", "subscriptions", "advance_fees", "positive"]);
    expect(ahaCandidates(jess)[1]).toMatchObject({ perYear: 809.64 });
    expect(advanceFees(jess)).toEqual({ provider: "Beforepay", fees: [{ date: "2026-09-02", amount: 15 }, { date: "2026-09-16", amount: 15 }], total: 30 });
  });

  it("a persona with no issues gets the positive fallback (never a sensitive factor)", () => {
    expect(firstInsight(marcus)).toMatchObject({ type: "positive", factor: { key: "MISSED_PAYMENT", value: 8.4 } });
    expect(ahaCopy.positive.factor.MISSED_PAYMENT).toBe("Your payments go through on time. That's your strongest factor.");
    // Marcus's highest factor is Gambling & alcohol spending (9.6): never praised.
    expect(marcus.score!.breakdown.ADVERSE_SPEND).toBeGreaterThan(8.4);
    // No score yet: the pay rhythm instead.
    expect(firstInsight(priya)).toEqual({ type: "positive", factor: null, pay: { weekday: "Thu", amount: 1960 } });
    expect(ahaCopy.positive.pay("Thu", "$1,960")).toMatch(/^Your pay comes in every second Thursday, about \$1,960\./);
  });
});

describe("goals", async () => {
  const [jess, marcus, priya] = await Promise.all([load("jess"), load("marcus"), load("priya")]);
  const g = (type: Parameters<typeof orderForGoal>[1]) => type;

  it("gambling is offered only when detected, last, and labels name the next stage", () => {
    expect(goalOptions(jess)).toEqual(["reach_payday", "off_advances", "lift_score", "cut_bills", "build_buffer", "gambling_less"]);
    expect(goalOptions(marcus)).not.toContain("gambling_less");
    expect([goalLabel(jess, "lift_score"), goalLabel(marcus, "lift_score"), goalLabel(priya, "lift_score")]).toEqual(["Lift my SmartScore to Healthy", "Lift my SmartScore to Thriving", "Build my SmartScore"]);
  });

  it("the goal brings its plan steps to the front; no goal or 'lift my score' keeps the usual order", () => {
    const base = recommendations(jess).map((r) => r.id);
    expect(recommendations(jess, undefined).map((r) => r.id)).toEqual(base);
    expect(recommendations(jess, { type: "lift_score", startedAt: "2026-09-25" }).map((r) => r.id)).toEqual(base);
    expect(recommendations(jess, { type: "cut_bills", startedAt: "2026-09-25" })[0]!.id).toBe("subscriptions");
    expect(recommendations(jess, { type: "reach_payday", startedAt: "2026-09-25" })[0]!.id).toBe("money-left");
    expect(recommendations(jess, { type: "off_advances", startedAt: "2026-09-25" })[0]!.id).toBe("pay-advance");
    expect(recommendations(marcus, { type: "cut_bills", startedAt: "2026-09-25" }).map((r) => r.id)).toEqual(["subscriptions", "money-left"]);
  });

  it("when short before payday a goal never puts a step that costs money first", () => {
    const recs = recommendations(jess);
    const costly = recs.find((r) => !r.noCost)!;
    const fake = [costly, ...recs.filter((r) => r !== costly)];
    expect(orderForGoal(fake, g("off_advances"), true)[0]!.noCost).toBe(true);
  });

  it("recap lead line by goal; gambling never leads the recap", () => {
    expect([recapLead("reach_payday"), recapLead("build_buffer"), recapLead("off_advances"), recapLead("lift_score"), recapLead("cut_bills"), recapLead("gambling_less"), recapLead(undefined)])
      .toEqual(["balance", "balance", "advances", "score", null, null, null]);
  });

  it("first payday after onboarding (the enhanced check-in), main pay only", async () => {
    const [jessP, marcusP, priyaP] = await Promise.all([loadPayday("jess"), loadPayday("marcus"), loadPayday("priya")]);
    expect(isFirstPayday(jessP, "2026-09-25")).toBe(true);
    expect(isFirstPayday(jessP, "2026-09-10")).toBe(false); // 17/09 was her first
    expect(isFirstPayday(jessP, undefined)).toBe(false);
    expect(isFirstPayday(marcusP, "2026-09-25")).toBe(true);
    expect(isFirstPayday(priyaP, "2026-09-25")).toBe(true);
  });

  it("goal and onboarding date survive the cookie; bad values are dropped", () => {
    const raw = serialiseAccount(undefined, "jess", { focusGoal: { type: "off_advances", startedAt: "2026-09-25" }, onboardedAt: "2026-09-25" });
    expect(parseAccount(raw, "jess")).toMatchObject({ focusGoal: { type: "off_advances", startedAt: "2026-09-25" }, onboardedAt: "2026-09-25" });
    const bad = encodeURIComponent(JSON.stringify({ jess: { focusGoal: { type: "win_big", startedAt: "2026-09-25" }, onboardedAt: "soon" } }));
    expect(parseAccount(bad, "jess")).not.toHaveProperty("focusGoal");
    expect(parseAccount(bad, "jess")).not.toHaveProperty("onboardedAt");
  });
});
