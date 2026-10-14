// The homepage's example figures (content/siteExamples) are Jess's, exactly as the app shows her.
import { describe, expect, it } from "vitest";
import { siteExamples as ex } from "@/content/siteExamples";
import { cycleBefore, progress, scoreChange, scoreState } from "@/lib/selectors";
import { firstInsight } from "@/lib/selectors/firstValue";
import { moneyWent } from "@/lib/selectors/moneyPlan";
import { payCycleCard } from "@/lib/selectors/payCycleCard";
import { recommendations } from "@/lib/selectors/recommendations";
import { scoreAttribution } from "@/lib/selectors/scoreAttribution";
import { streamingInsight } from "@/lib/selectors/subscriptionReview";
import { subscriptions } from "@/lib/selectors/subscriptions";
import { load } from "./helpers";

describe("homepage examples match the app (Jess)", () => {
  it("score, stage, change, what moved it and the next step", async () => {
    const d = await load("jess");
    const s = scoreState(d);
    expect(s.kind).toBe("scored");
    if (s.kind !== "scored") return;
    expect(s.score).toBe(ex.score.score);
    expect(s.stage.next).toMatchObject({ name: ex.score.next.name, at: ex.score.next.at, pointsToGo: ex.score.next.toGo });
    expect(scoreChange(d)).toEqual(ex.score.change);
    expect(scoreAttribution(d)!.parts.map((p) => ({ name: p.name, points: p.points }))).toEqual(ex.score.moved);
    expect(recommendations(d)[0]!.title).toBe(ex.score.nextStep);
  });

  it("the shortfall before payday", async () => {
    const d = await load("jess");
    const a = firstInsight(d);
    expect(a.type).toBe("shortfall");
    if (a.type !== "shortfall") return;
    expect(d.asOf).toBe(ex.cycle.asOf);
    expect({ short: a.short, balance: a.balance, due: a.due, payday: a.payday }).toEqual({ short: ex.cycle.short, balance: ex.cycle.balance, due: ex.cycle.due, payday: ex.cycle.payday });
    expect([...a.bills].sort((x, y) => y.amount - x.amount).map((b) => ({ merchant: b.merchant, amount: b.amount }))).toEqual(ex.cycle.bills);
    const now = cycleBefore(d, 0);
    expect({ from: now.start, to: now.end }).toEqual({ from: ex.cycle.from, to: ex.cycle.to });
  });

  it("streaming subscriptions", async () => {
    const d = await load("jess");
    const s = streamingInsight(subscriptions(d).rows)!;
    expect({ count: s.names.length, monthly: s.monthly }).toEqual(ex.streaming);
  });

  it("where the pay went, by group", async () => {
    const d = await load("jess");
    const c = payCycleCard(moneyWent(d, cycleBefore(d, 1)));
    expect(c.paid).toBe(ex.plan.paid);
    const debt = c.groups.find((g) => g.id === "debt")!;
    const gambling = debt.items.find((i) => i.group === "gambling")!.total;
    expect(c.groups.find((g) => g.id === "essentials")!.total).toBeCloseTo(ex.plan.groups[0].total, 2);
    expect(gambling).toBe(ex.plan.groups[1].total);
    expect(debt.total - gambling).toBeCloseTo(ex.plan.groups[2].total, 2);
  });

  it("money left the day before each payday", async () => {
    const d = await load("jess");
    const bars = progress(d).trend!.bars.map((b) => ({ end: b.end, value: b.value, ...(b.forecast ? { forecast: true } : {}) }));
    expect(bars).toEqual(ex.trend.bars);
  });
});
