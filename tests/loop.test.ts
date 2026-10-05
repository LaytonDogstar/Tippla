// Phase 2 (loop): safe to spend, payday check-in, end-of-cycle recap, score projection, value tally.
import { describe, expect, it } from "vitest";
import type { PersonaData } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import { recapCopy } from "@/content/loop";
import { addDays } from "@/lib/format/dates";
import { cycleRecap, detectSubscriptions, payAdvanceRun, payCycleSummary, paydayCheckIn, safeToSpend, valueTally } from "@/lib/selectors";
import { projectScore } from "@/lib/scoring/estimate";
import { load, loadPayday } from "./helpers";

const at = (date: string) => `${date}T09:30:00+10:00`;

describe("safe to spend", async () => {
  const [jess, marcus, priya] = await Promise.all([load("jess"), load("marcus"), load("priya")]);
  const [jessP, marcusP] = await Promise.all([loadPayday("jess"), loadPayday("marcus")]);

  it("Jess before payday: nothing spare, never negative, and the forecast matches the pay cycle hero", () => {
    const s = safeToSpend(jess);
    expect(s.perDay).toBe(0);
    expect(s.nothingSpare).toBe(true);
    expect(s.forecast).toBeCloseTo(-52.69, 2);
    expect(s.days).toBe(6);
    // No income before payday, so the forecast is exactly "left after bills" on the hero.
    expect(s.incomeTotal).toBe(0);
    expect(s.forecast).toBeCloseTo(payCycleSummary(jess, {}).leftAfterBills, 2);
  });

  it("Jess on payday: (forecast − buffer) ÷ days, rounded down", () => {
    const s = safeToSpend(jessP);
    expect(s.days).toBe(14);
    expect(s.forecast).toBeCloseTo(399.56, 2);
    expect(s.perDay).toBe(Math.floor((399.56 - 50) / 14));
    expect(s.perDay).toBe(24);
  });

  it("the daily figure never spends the buffer, for every persona and snapshot", () => {
    for (const d of [jess, marcus, priya, jessP, marcusP]) {
      const s = safeToSpend(d);
      expect(s.perDay).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(s.perDay)).toBe(true);
      if (!s.nothingSpare) expect(s.perDay * s.days + s.buffer).toBeLessThanOrEqual(s.forecast);
    }
    expect(safeToSpend(marcus, { buffer: 100_000 })).toMatchObject({ perDay: 0, nothingSpare: true });
  });

  it("bills reconcile: balance − bills + income = forecast (when nothing else moves)", () => {
    for (const d of [jess, marcus, jessP]) {
      const s = safeToSpend(d);
      expect(s.balance - s.billsTotal + s.incomeTotal).toBeCloseTo(s.forecast, 2);
    }
  });
});

describe("payday check-in", async () => {
  const [jess, jessP, marcusP] = await Promise.all([load("jess"), loadPayday("jess"), loadPayday("marcus")]);

  it("only on the morning regular income lands", () => {
    expect(paydayCheckIn(jess)).toBeNull();
    expect(paydayCheckIn(marcusP)).not.toBeNull();
  });

  it("Jess: what landed, what's due this cycle, and safe to spend", () => {
    const c = paydayCheckIn(jessP)!;
    expect(c.income).toEqual([{ payer: "Harbourside Hospitality Pty", amount: 2305.49 }]);
    expect(c.cycle.start).toBe(jessP.asOf);
    expect(c.billsTotal).toBeCloseTo(1225.99, 2);
    expect(c.repaymentsTotal).toBe(375);
    expect(c.advance).toBeNull(); // the Beforepay advance was repaid on 30/09
    expect(c.safe.perDay).toBe(24);
    expect(c.bills.every((b) => b.date > jessP.asOf && b.date < jessP.derived.pay_cycle.next_payday)).toBe(true);
  });
});

describe("end-of-cycle recap", async () => {
  const [jessP, marcusP, priyaP] = await Promise.all([loadPayday("jess"), loadPayday("marcus"), loadPayday("priya")]);

  it("Jess: the cycle that just ended, in her real figures", () => {
    const r = cycleRecap(jessP)!;
    expect([r.cycle.start, r.cycle.end]).toEqual(["2026-09-17", "2026-09-30"]);
    expect(r.spent).toBeCloseTo(2826.2, 2);
    expect(r.paidIn).toBeCloseTo(2482.52, 2);
    expect(r.advances).toEqual({ count: 1, total: 300 });
    expect(r.score).toEqual({ from: 489, to: 472 });
    expect(r.fees.count).toBe(0);
    expect(r.changes.map((c) => c.name)).toEqual(["Shopping", "Groceries", "Subscriptions"]);
  });

  it("never shames: a cycle with an advance has streak 0 and no streak words at all", () => {
    const r = cycleRecap(jessP)!;
    expect(r.noAdvanceStreak).toBe(0);
    expect(recapCopy.streak(r.noAdvanceStreak)).toBe("");
    expect(recapCopy.streak(1)).toBe("");
    const all = JSON.stringify(Object.values(recapCopy).map((v) => (typeof v === "function" ? [(v as (...a: unknown[]) => string)(0, "$0", false)] : v)));
    expect(all).not.toMatch(/broke|lost|missed|ended|failed|reset/i);
  });

  it("celebrates a positive streak (Marcus 13, Priya 4)", () => {
    expect(cycleRecap(marcusP)!.noAdvanceStreak).toBe(13);
    expect(recapCopy.streak(13)).toBe("That's 13 pay cycles in a row.");
    expect(cycleRecap(priyaP)!.noAdvanceStreak).toBe(4);
  });

  it("biggest changes never include gambling or alcohol", () => {
    for (const d of [jessP, marcusP, priyaP]) {
      const r = cycleRecap(d);
      expect(r?.changes.some((c) => c.category === "gambling" || c.category === "alcohol")).toBeFalsy();
    }
  });
});

describe("score projection (Q3 sample logic)", async () => {
  const [jess, marcus, priya] = await Promise.all([load("jess"), load("marcus"), load("priya")]);

  it("Jess: skip the next advance → about 490 by 23/10, always an estimate", () => {
    expect(projectScore(jess)).toMatchObject({ liftKey: "pay-advance", from: 472, to: 490, by: "2026-10-23", estimated: true });
  });
  it("Marcus 612 → 616; Priya (no score yet) gets none; switched off gives none", () => {
    expect(projectScore(marcus)).toMatchObject({ from: 612, to: 616 });
    expect(projectScore(priya)).toBeNull();
    expect(projectScore(jess, false)).toBeNull();
  });
  it("never projects past 1,000 or downwards", () => {
    for (const d of [jess, marcus]) {
      const p = projectScore(d)!;
      expect(p.to).toBeGreaterThanOrEqual(p.from);
      expect(p.to).toBeLessThanOrEqual(1000);
    }
  });
});

describe("value tally: only savings we can see after an in-app action", async () => {
  const [jess, jessP] = await Promise.all([load("jess"), loadPayday("jess")]);
  const binge = detectSubscriptions(jess).find((s) => s.merchant === "Binge")!;
  const cancelBinge: AccountState = { actions: [{ type: "cancelled_subscription", key: "Binge", at: at("2026-09-25") }] };
  const later = (d: PersonaData, asOf: string): PersonaData => ({ ...d, asOf });

  it("nothing done in the app → nothing counted", () => {
    expect(valueTally(jessP, {})).toEqual({ total: 0, items: [], pending: [] });
  });

  it("cancelled subscription: pending until the expected charge passes, then counted", () => {
    const now = valueTally(jessP, cancelBinge);
    expect(now.total).toBe(0);
    expect(now.pending).toEqual([{ kind: "subscription", key: "sub:Binge", confirmAfter: "2026-10-11" }]);
    const after = valueTally(later(jessP, "2026-10-12"), cancelBinge);
    expect(after.items).toHaveLength(1);
    expect(after.total).toBe(binge.amount);
  });

  it("cancelled subscription that charged again anyway → not counted", () => {
    const d = later(jessP, "2026-10-12");
    const charged = { ...d, transactions: [...d.transactions, { ...d.transactions.find((t) => t.merchant === "Binge")!, id: "x", date: "2026-10-08" }] };
    expect(valueTally(charged, cancelBinge).total).toBe(0);
  });

  it("skip the next advance: whole cycles after the choice with no advance count the fee", () => {
    const fee = payAdvanceRun(jess)!.fee!;
    // Take out the advances from the pay cycle 03/09–16/09 (the fee history before it stays).
    const noAdvances = { ...jess, transactions: jess.transactions.filter((t) => !(t.category === "wage_advance" && t.date >= "2026-09-03" && t.date <= "2026-09-16")) };
    const t = valueTally(noAdvances, { actions: [{ type: "skip_advance", at: at("2026-09-01") }] });
    expect(t.items.map((i) => i.key)).toEqual(["adv:2026-09-03"]);
    expect(t.total).toBe(fee);
    // Real data: Jess chose on 25/09, after her 24/09 advance. Pending until payday.
    expect(valueTally(jess, { actions: [{ type: "skip_advance", at: at("2026-09-25") }] }).pending).toEqual([{ kind: "advance", key: "adv:2026-09-17", confirmAfter: "2026-10-01" }]);
  });

  it("an advance taken after choosing to skip: nothing counted and nothing said", () => {
    expect(valueTally(jess, { actions: [{ type: "skip_advance", at: at("2026-09-20") }] })).toEqual({ total: 0, items: [], pending: [] });
  });

  it("bill bigger than balance, acted on before the date, went through with no fee → fee avoided", () => {
    const id = "bill_over_balance:Beforepay:2026-09-30";
    expect(valueTally(jessP, { feed: { [id]: { status: "done", at: "2026-09-25" } } }).total).toBe(15);
    expect(valueTally(jessP, { feed: { [id]: { status: "dismissed", at: "2026-09-25" } } }).total).toBe(0);
    expect(valueTally(jessP, { feed: { [id]: { status: "done", at: "2026-10-01" } } }).total).toBe(0);
    // Before the bill date nothing can be confirmed yet.
    expect(valueTally(jess, { feed: { [id]: { status: "done", at: "2026-09-25" } } }).total).toBe(0);
    expect(addDays("2026-09-30", 1)).toBe(jessP.asOf);
  });
});
