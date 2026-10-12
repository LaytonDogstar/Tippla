// Your money plan (12/10/2026): pay-cycle boundaries from the detected pay dates, spending by group (pending left
// out), lenders and BNPL from recurring payments (per pay cycle, frequency normalised), the shortfall, the "What it
// would take" range, this cycle against the last one, the gambling card threshold and the smaller wins. Jess's
// 03/09–16/09 figures are the ones in the brief.
import { describe, expect, it } from "vitest";
import {
  calendarDays, currentCycle, cycleBefore, cycleProgress, gamblingCard, lenders, moneyWent, shortfallIn, smallerWins, whatItWouldTake,
  type MoneyWent,
} from "@/lib/selectors";
import { GAMBLING_CARD_MIN_PER_CYCLE } from "@/config/flags";
import type { PersonaData, Transaction } from "@/lib/api/types";
import { load } from "./helpers";

const tx = (date: string, amount: number, merchant: string, category: Transaction["category"], status: Transaction["status"] = "posted"): Transaction =>
  ({ id: `${merchant}-${date}-${amount}`, date, description: merchant, merchant, amount, category, subcategory: null, is_recurring: true, status, account_id: 1, balance_after: null });
const r = (n: number) => Math.round(n);

describe("pay-cycle boundaries", () => {
  it("come from the detected pay dates: 14-day cycles ending the day before payday", async () => {
    const jess = await load("jess");
    expect(cycleBefore(jess, 1)).toMatchObject({ start: "2026-09-03", end: "2026-09-16", limitedByHistory: false });
    expect(currentCycle(jess)).toMatchObject({ start: "2026-09-17", end: "2026-09-30" });
    expect(cycleBefore(await load("marcus"), 1)).toMatchObject({ start: "2026-09-09", end: "2026-09-22" });
  });
  it("the advance on 24/09 falls inside Jess's current cycle (the step 1 bug)", async () => {
    const jess = await load("jess");
    expect(moneyWent(jess, currentCycle(jess)).advances).toEqual([{ date: "2026-09-24", amount: 300, provider: "Beforepay" }]);
  });
});

describe("where your money went", () => {
  it("Jess, 03/09–16/09: paid $2,167, spent $2,405, short $238, by group", async () => {
    const jess = await load("jess");
    const w = moneyWent(jess, cycleBefore(jess, 1));
    expect([r(w.paid), r(w.spent), r(-w.net)]).toEqual([2167, 2405, 238]);
    expect(Object.fromEntries(w.groups.map((g) => [g.group, r(g.total)]))).toEqual({ rent: 820, everyday: 432, gambling: 385, loans: 375, advance: 315, bills: 78 });
    expect(w.advances).toEqual([{ date: "2026-09-10", amount: 300, provider: "Beforepay" }]);
    expect(w.heavyShare).toBeCloseTo((385 + 375 + 315) / 2166.66, 3);
    expect(w.payRanOutAt).toBeCloseTo(2166.66 / 2404.94, 3);
    // The groups add up to what was spent.
    expect(r(w.groups.reduce((s, g) => s + g.total, 0))).toBe(r(w.spent));
  });
  it("leaves pending transactions out, and transfers aren't spending", async () => {
    const jess = await load("jess");
    const c = cycleBefore(jess, 1);
    const before = moneyWent(jess, c);
    const d: PersonaData = { ...jess, transactions: [...jess.transactions, tx("2026-09-05", -999, "Pending shop", "shopping", "pending"), tx("2026-09-05", -500, "Own savings", "transfer")] };
    expect(moneyWent(d, c).spent).toBe(before.spent);
  });
  it("no pay-ran-out marker when there was money left", async () => {
    const marcus = await load("marcus");
    const w = moneyWent(marcus, cycleBefore(marcus, 1));
    expect(w.net).toBeGreaterThan(0);
    expect(w.payRanOutAt).toBeNull();
  });
});

describe("lenders and BNPL", () => {
  it("Jess: six from recurring payments, biggest first, per pay cycle", async () => {
    const ls = lenders(await load("jess"));
    expect(ls.map((l) => [l.provider, l.kind, l.frequency, l.perCycle])).toEqual([
      ["Beforepay", "advance", "fortnightly", 315],
      ["Right Road Finance", "loan", "fortnightly", 120],
      ["Nimble", "loan", "fortnightly", 96],
      ["Cash Train", "loan", "fortnightly", 74],
      ["Afterpay", "bnpl", "fortnightly", 45],
      ["Zip Pay", "bnpl", "monthly", 18.46], // $40 a month × 12 ÷ 26
    ]);
    expect(ls[0]!.fee).toBe(15);
    expect(r(ls.reduce((s, l) => s + l.perCycle, 0))).toBe(668);
  });
  it("Marcus: a lender not paid in the last 40 days isn't counted", async () => {
    expect(lenders(await load("marcus")).map((l) => l.provider)).toEqual(["Afterpay", "Latitude"]);
  });
  it("normalises weekly (× 2) and monthly (× 12 ÷ 26) to a pay cycle", async () => {
    const jess = await load("jess");
    const weekly = ["2026-09-01", "2026-09-08", "2026-09-15", "2026-09-22"].map((d) => tx(d, -25, "Weekly Loans", "loan_repayment"));
    const monthly = ["2026-07-20", "2026-08-20", "2026-09-20"].map((d) => tx(d, -65, "Monthly BNPL", "bnpl"));
    const ls = lenders({ ...jess, transactions: [...weekly, ...monthly] });
    expect(ls.map((l) => [l.provider, l.frequency, l.perCycle])).toEqual([["Weekly Loans", "weekly", 50], ["Monthly BNPL", "monthly", 30]]);
  });
});

describe("shortfall and what it would take", () => {
  it("Jess ran $238 short; to halve or skip a $300 advance she'd free up $90–$240", async () => {
    const jess = await load("jess");
    const w = moneyWent(jess, cycleBefore(jess, 1));
    const short = shortfallIn(w, calendarDays(jess));
    expect(r(short)).toBe(238);
    expect(whatItWouldTake(short, 300)).toEqual({ low: 90, high: 240 });
  });
  it("with money left over, the shortfall is the lowest balance before the advance came in", () => {
    const w = { cycle: { start: "2026-09-03", end: "2026-09-16" }, net: 50, advances: [{ date: "2026-09-10", amount: 300, provider: "X" }] } as unknown as MoneyWent;
    const day = (date: string, balance: number) => ({ date, balance }) as never;
    expect(shortfallIn(w, [day("2026-09-05", 40), day("2026-09-09", -120), day("2026-09-12", -400)])).toBe(120);
    expect(shortfallIn(w, [day("2026-09-05", 40)])).toBe(0);
  });
  it("the range: the whole advance at most at the high end, half of it off at the low end, rounded to $10", () => {
    expect(whatItWouldTake(500, 300)).toEqual({ low: 150, high: 300 });
    expect(whatItWouldTake(100, 300)).toEqual({ low: 0, high: 100 });
    expect(whatItWouldTake(0, 300)).toBeNull();
    expect(whatItWouldTake(200, null)).toBeNull();
  });
});

describe("this cycle against the last one", () => {
  it("Jess: lowest balance (forecast), gambling, pay advances, loans and BNPL, with the change", async () => {
    const p = cycleProgress(await load("jess"));
    expect(p.rows.map((x) => [x.key, r(x.last), r(x.now), r(x.change), !!x.nowForecast])).toEqual([
      ["lowest", -636, -53, 584, true],
      ["gambling", 385, 200, -185, false],
      ["advances", 300, 300, 0, false],
      ["loans", 375, 335, -40, false],
    ]);
  });
});

describe("gambling card", () => {
  it(`shows over $${GAMBLING_CARD_MIN_PER_CYCLE} a pay cycle: Jess $385, three operators, $200 so far`, async () => {
    const jess = await load("jess");
    const g = gamblingCard(jess, moneyWent(jess, cycleBefore(jess, 1)))!;
    expect(g).toMatchObject({ total: 385, operators: ["Ladbrokes", "Sportsbet", "TAB"], thisCycle: 200 });
    expect(r(g.shareOfPay * 100)).toBe(18);
  });
  it("not shown under the threshold", async () => {
    const marcus = await load("marcus");
    expect(gamblingCard(marcus, moneyWent(marcus, cycleBefore(marcus, 1)))).toBeNull();
    const w = { groups: [{ group: "gambling", total: GAMBLING_CARD_MIN_PER_CYCLE - 1, shareOfPay: 0.02, merchants: ["TAB"] }] } as unknown as MoneyWent;
    expect(gamblingCard(marcus, w)).toBeNull();
  });
});

describe("smaller wins", () => {
  it("Jess: subscriptions $31, failed debits (2, latest 09/09, $30), phone then energy", async () => {
    const wins = smallerWins(await load("jess"));
    expect(wins.map((w) => w.id)).toEqual(["subscriptions", "failed_debits", "phone", "energy"]);
    expect(wins[0]).toMatchObject({ names: ["Netflix", "Binge", "Spotify", "Stan", "Apple iCloud"], saving: 31 });
    expect(wins[1]).toMatchObject({ count: 2, lastDate: "2026-09-09", fees: 30, saving: 5 });
    expect(wins.slice(2).map((w) => [w.merchant, w.saving])).toEqual([["Telstra", null], ["Origin Energy", null]]);
  });
});
