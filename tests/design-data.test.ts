// Every figure given to Astra in design/ASTRA_PROMPTS.md must come out of the selectors.
// If a fixture changes, this test tells you which prompt numbers to update.
import { describe, expect, it } from "vitest";
import { formatShortDay, formatWhole } from "@/lib/format";
import {
  activeLoans, categoryTotals, currentCycle, dashboardBanner, fortnight, gamblingInsight, loanTotals, nextBill, otherCredit,
  payCycleSummary, payPattern, scoreChange, scoreState, scoreTrend, sixMonthSpending, strongestFactor, topThreeFactors, visibleOffers,
} from "@/lib/selectors";
import { load } from "./helpers";

describe("Jess (Prompts 1, 2, 7)", async () => {
  const d = await load("jess");
  const s = payCycleSummary(d);

  it("score reveal", () => {
    const st = scoreState(d);
    expect(st.kind).toBe("scored");
    if (st.kind !== "scored") return;
    expect(st.score).toBe(472);
    expect(st.stage.name).toBe("Steadying");
    expect(st.stage.next).toMatchObject({ name: "Healthy", at: 600, pointsToGo: 128 });
    expect(st.stage.progress).toBeCloseTo(22 / 150, 5); // ~15% filled ring
    expect(topThreeFactors(d).map((f) => [f.name, f.value])).toEqual([
      ["Current borrowing", 2.9], ["Gambling & alcohol spending", 3.2], ["Money left over", 3.4],
    ]);
    expect(strongestFactor(d)).toMatchObject({ name: "Income stability", value: 7.4 });
    expect(loanTotals(d).counts.sacc + loanTotals(d).counts.macc).toBe(3); // "you have 3 loans open"
  });

  it("dashboard pay cycle card", () => {
    expect(currentCycle(d)).toMatchObject({ start: "2026-09-17", end: "2026-09-30" });
    expect(s.daysToPayday).toBe(6);
    expect(formatShortDay(s.nextPayday)).toBe("Thu 01/10");
    expect(formatWhole(s.spent)).toBe("$1,832");
    expect(formatWhole(s.paidIn)).toBe("$2,483");
    expect(s.payAdvances).toEqual([{ date: "2026-09-24", provider: "Beforepay", amount: 300, repayDate: "2026-09-30", repayAmount: 315, fee: 15 }]);
    expect(s.dueBeforePayday.map((b) => [formatShortDay(b.date), b.merchant, b.expected_amount])).toEqual([
      ["Sat 26/09", "Telstra", 52], ["Wed 30/09", "Beforepay", 315],
    ]);
    expect(s.dueTotal).toBe(367);
    expect(formatWhole(s.balance)).toBe("$314");
    expect(s.isShort).toBe(true);
    expect(formatWhole(-s.leftAfterBills)).toBe("$53");
    expect(nextBill(d)).toMatchObject({ date: "2026-09-26", merchant: "Telstra", expected_amount: 52 });
    expect(dashboardBanner(d)).toEqual({ kind: "hardship" });
    expect(scoreChange(d)).toEqual({ delta: -17, since: "2026-09-11" });
  });

  it("six-month spending bars", () => {
    const bars = sixMonthSpending(d).map((b) => [b.month, b.total === null ? null : Math.round(b.total), b.partial]);
    expect(bars).toEqual([
      ["2026-04", 4529, false], ["2026-05", 6361, false], ["2026-06", 4989, false],
      ["2026-07", 5385, false], ["2026-08", 5257, false], ["2026-09", 4821, true],
    ]);
  });

  it("smartscore trend", () => {
    expect(scoreTrend(d).map((p) => p.score)).toEqual([521, 515, 506, 498, 489, 472]);
    expect(scoreTrend(d)[0]!.date).toBe("2026-07-17");
  });

  it("spending overview categories (rows rounded, total $1,832)", () => {
    const rows = categoryTotals(d, currentCycle(d)).map((r) => [r.name, Math.round(r.total)]);
    expect(rows).toEqual([
      ["Rent & housing", 820], ["Loan repayments", 290], ["Gambling", 200], ["Transport", 115], ["Food & dining", 112],
      ["Bills & utilities", 82], ["Groceries", 82], ["Cash withdrawals", 59], ["Buy now, pay later", 45], ["Shopping", 21],
      ["Subscriptions", 4],
    ]);
  });

  it("gambling insight sheet", () => {
    const g = gamblingInsight(d)!;
    expect(g.pctOfIncome90.toFixed(1)).toBe("16.5");
    expect(g.factor).toBe(3.2);
    expect(g.trend).toEqual({ from: { month: "2026-04", amount: 260 }, to: { month: "2026-08", amount: 845 } });
  });

  it("loans overview", () => {
    const loans = activeLoans(d);
    expect(loans.map((l) => [l.provider, l.type, l.repayment])).toEqual(
      expect.arrayContaining([["Nimble", "SACC", 96], ["Cash Train", "SACC", 74], ["Right Road Finance", "MACC", 120]]),
    );
    expect(loans).toHaveLength(3);
    const t = loanTotals(d);
    expect(t.saccOutstanding).toBe(1060); // Nimble ~$610 + Cash Train ~$450 in the prompts
    expect(t.nonSaccOutstanding).toBe(2140);
    expect(loans.find((l) => l.provider === "Right Road Finance")!.estimatedBalance).toBe(2140);
    expect(Math.round(t.debtToIncomePct90 ?? 0)).toBe(21);
    const other = otherCredit(d).map((o) => [o.provider, o.kind, o.repayment]);
    expect(other).toEqual(expect.arrayContaining([["Afterpay", "bnpl", 45], ["Zip Pay", "bnpl", 40], ["Beforepay", "wage_advance", 315]]));
  });

  it("calendar fortnight", () => {
    const { days, nextPayday } = fortnight(d);
    expect(days[0]).toMatchObject({ date: "2026-09-17", weekday: "Thu", isPayday: true });
    expect(days[13]).toMatchObject({ date: "2026-09-30", weekday: "Wed" });
    expect(nextPayday).toBe("2026-10-01");
    const byDate = Object.fromEntries(days.map((x) => [x.date, x]));
    expect(byDate["2026-09-25"]).toMatchObject({ isToday: true, balance: 314.31, balancePredicted: false });
    expect(byDate["2026-09-26"]!.predictedBills.map((b) => b.merchant)).toEqual(["Telstra"]);
    expect(byDate["2026-09-29"]).toMatchObject({ balance: 262.31, balancePredicted: true });
    expect(byDate["2026-09-30"]).toMatchObject({ balance: -52.69, balancePredicted: true, belowZero: true });
    expect(days.filter((x) => x.belowZero).map((x) => x.date)).toEqual(["2026-09-30"]);
  });

  it("no offers for Jess", () => expect(visibleOffers(d)).toEqual([]));
});

describe("Marcus (Prompt 7 items 4 and 10)", async () => {
  const d = await load("marcus");
  const s = payCycleSummary(d);

  it("improving dashboard", () => {
    const st = scoreState(d);
    if (st.kind !== "scored") throw new Error("expected a score");
    expect(st.score).toBe(612);
    expect(st.stage.name).toBe("Healthy");
    expect(st.stage.next).toMatchObject({ name: "Thriving", at: 750, pointsToGo: 138 });
    expect(scoreChange(d)).toEqual({ delta: 11, since: "2026-09-11" });
    expect(topThreeFactors(d)[0]).toMatchObject({ name: "Money left over", value: 5.9 });
    expect(dashboardBanner(d)).toEqual({ kind: "new_offer", count: 1 });
  });

  it("pay cycle includes Centrelink like wages", () => {
    expect(currentCycle(d)).toMatchObject({ start: "2026-09-23", end: "2026-10-06" });
    expect(s.daysToPayday).toBe(12);
    expect(formatShortDay(s.nextPayday)).toBe("Wed 07/10");
    expect(formatWhole(s.spent)).toBe("$301");
    expect(formatWhole(s.paidIn)).toBe("$1,747");
    expect(s.incomeLines.map((l) => [l.source, l.amount])).toEqual([["centrelink", 412], ["wages", 1335.06]]);
    expect(formatWhole(s.dueTotal)).toBe("$663");
    expect(s.dueBeforePayday.map((b) => [formatShortDay(b.date), b.merchant])).toEqual([
      ["Sat 26/09", "Qld Housing Rent"], ["Sat 26/09", "Telstra"], ["Thu 01/10", "Afterpay"], ["Tue 06/10", "Netflix"],
    ]);
    expect(formatWhole(s.leftAfterBills)).toBe("$1,700");
    expect(nextBill(d)).toMatchObject({ date: "2026-09-26", merchant: "Qld Housing Rent", expected_amount: 560 });
  });

  it("six-month bars", () => {
    expect(sixMonthSpending(d).map((b) => Math.round(b.total ?? -1))).toEqual([3526, 3094, 3373, 3979, 4433, 2249]);
  });

  it("offer maths agree", () => {
    const [o] = visibleOffers(d);
    expect(o).toBeDefined();
    const n = o!.term_weeks / 2;
    expect(Math.round(o!.repayment_per_fortnight * n * 100) / 100).toBe(o!.total_repayable);
    // Comparison rate: nominal annual rate at which the repayments' present value equals the amount.
    let lo = 0, hi = 1;
    for (let i = 0; i < 200; i++) {
      const r = (lo + hi) / 2;
      let pv = 0;
      for (let k = 1; k <= n; k++) pv += o!.repayment_per_fortnight / (1 + r) ** k;
      if (pv > o!.amount) lo = r; else hi = r;
    }
    expect((lo * 26 * 100).toFixed(1)).toBe(o!.comparison_rate_pct.toFixed(1));
    // Not a SACC: over $2,000 or longer than a year.
    expect(o!.amount > 2000 || o!.term_weeks > 52).toBe(true);
  });
});

describe("Priya (Prompt 7 item 2)", async () => {
  const d = await load("priya");
  it("thin file, no score, expected date", () => {
    const st = scoreState(d);
    expect(st).toMatchObject({ kind: "override", override: "thin_file", code: -998, estimatedReadyDate: "2026-11-10" });
    expect(topThreeFactors(d)).toEqual([]);
    expect(strongestFactor(d)).toBeNull();
  });
  it("what we can already see", () => {
    expect(currentCycle(d)).toMatchObject({ start: "2026-09-24", end: "2026-10-07" });
    expect(payPattern(d)).toMatchObject({ typicalAmount: 1960, everyDays: 14, weekday: "Thu" });
    expect(d.profile.data_days).toBe(45);
    expect(dashboardBanner(d)).toBeNull();
  });
});
