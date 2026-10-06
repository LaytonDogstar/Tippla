// Retention pack specs 01–02 alignment: feed rules and ranking details, resurfacing, the status line, bank
// reconnect, hiding gambling insights, the member's buffer, check-in adjustments, the 7-day fallback,
// best streak, projection rounding and the tally's conservative rules.
import { describe, expect, it } from "vitest";
import type { PersonaData, Transaction } from "@/lib/api/types";
import { applyAccount, billId } from "@/lib/account/state";
import { allFeedItems, changedMaterially, feed } from "@/lib/feed";
import { RULES } from "@/lib/feed/registry";
import { isRise } from "@/lib/feed/rules/priceRise";
import { cycleRecap, detectSubscriptions, payCycleSummary, refreshStatus, safeToSpend, safeToSpendFor, scoreAttribution, valueTally } from "@/lib/selectors";
import { projectScore } from "@/lib/scoring/estimate";
import { load, loadPayday } from "./helpers";

const tx = (x: Partial<Transaction>): Transaction => ({
  id: `t_${Math.random().toString(36).slice(2)}`, date: "2026-09-20", description: "TEST", merchant: "Cafe", amount: -12, category: "food",
  subcategory: null, is_recurring: false, status: "posted", account_id: 1, balance_after: null, ...x,
});

describe("feed (spec 01)", async () => {
  const [jess, marcus, priya] = await Promise.all([load("jess"), load("marcus"), load("priya")]);
  const ctx = (d: PersonaData, extra = {}) => ({ d, edits: {}, ...extra });

  it("a done or not-relevant card comes back only if the amount changes by more than 20%", () => {
    const item = allFeedItems(ctx(jess)).find((i) => i.type === "shortfall")!;
    expect(changedMaterially({ ...item, amountAtStake: 60 }, 52.69)).toBe(false);
    expect(changedMaterially({ ...item, amountAtStake: 70 }, 52.69)).toBe(true);
    const state = { [item.id]: { status: "dismissed" as const, at: jess.asOf, amount: 30 } };
    expect(feed(ctx(jess), state).open.map((i) => i.id)).toContain(item.id); // $53 now vs $30 then
    expect(feed(ctx(jess), { [item.id]: { status: "dismissed", at: jess.asOf, amount: 52.69 } }).open.map((i) => i.id)).not.toContain(item.id);
  });

  it("bank_reconnect when the connection is broken or disconnected", () => {
    expect(RULES.bankReconnect!(ctx(marcus))).toEqual([]);
    expect(RULES.bankReconnect!(ctx(marcus, { states: ["bank_expired"] }))[0]).toMatchObject({ urgency: 4, title: "Reconnect your bank to keep forecasts accurate", action: { href: "/account/bank" } });
    expect(RULES.bankReconnect!(ctx(marcus, { account: { bank: { disconnected: true } } }))).toHaveLength(1);
  });

  it("price rise: at least 5% or $1", () => {
    expect([isRise(18.99, 16.99), isRise(10.5, 10), isRise(100.5, 100), isRise(9, 10)]).toEqual([true, true, false, false]);
  });

  it("possible duplicate: same merchant and amount within 48 hours, not 3 days apart", () => {
    const two = { ...marcus, transactions: [...marcus.transactions, tx({ date: "2026-09-20" }), tx({ date: "2026-09-22" })] };
    expect(RULES.duplicateCharge!(ctx(two)).map((i) => i.title)).toEqual(["Possible double charge: Cafe $12.00 twice on 20/09"]);
    const three = { ...marcus, transactions: [...marcus.transactions, tx({ date: "2026-09-19" }), tx({ date: "2026-09-22" })] };
    expect(RULES.duplicateCharge!(ctx(three))).toEqual([]);
  });

  it("score changed: only moves of 5 points or more", () => {
    const h = jess.scoreHistory;
    const small = { ...jess, scoreHistory: [...h.slice(0, -1), { ...h.at(-1)!, score: h.at(-2)!.score - 3 }] };
    expect(RULES.scoreChange!(ctx(small))).toEqual([]);
    expect(RULES.scoreChange!(ctx(jess))[0]!.urgency).toBe(3);
  });

  it("status line: what was checked, all caught up, or stale data", () => {
    expect(refreshStatus(jess, 7).line).toBe("Checked 32 new transactions this morning · 7 things to look at");
    expect(refreshStatus(jess, 0).line).toBe("All caught up · next payday Thu 01/10");
    expect(refreshStatus(jess, 7, { staleSince: "2026-09-22" })).toMatchObject({ line: "Your bank data is from Tue 22/09. Reconnect to update it.", stale: true });
  });

  it("hiding gambling insights: the explanation says 'spending mix and other factors' and still adds up", () => {
    const shown = scoreAttribution(jess)!;
    const hidden = scoreAttribution(jess, { hideGambling: true })!;
    expect(shown.summary).toContain("gambling deposits");
    expect(JSON.stringify(hidden)).not.toMatch(/gambl/i);
    expect(hidden.summary).toContain("spending mix and other factors");
    expect(hidden.parts.reduce((a, p) => a + p.points, 0)).toBe(hidden.delta);
    expect(RULES.scoreChange!(ctx(jess, { account: { hideGambling: true } }))[0]!.body).not.toMatch(/gambl/i);
  });

  it("Priya's feed is unchanged by the alignment", () => {
    expect(allFeedItems(ctx(priya)).map((i) => i.type)).toEqual(["repayment_due"]);
  });
});

describe("pay cycle (spec 02)", async () => {
  const [jess, jessP, marcus] = await Promise.all([load("jess"), loadPayday("jess"), load("marcus")]);

  it("the buffer starts at $0 and the member can set one", () => {
    expect(safeToSpendFor(jessP, {}).buffer).toBe(0);
    expect(safeToSpendFor(jessP, { buffer: 100 })).toMatchObject({ buffer: 100, perDay: Math.floor((399.56 - 100) / 14) });
  });

  it("'already paid' takes a bill out of every forecast; a one-off puts a cost in", () => {
    const beforepay = jess.derived.upcoming_bills.find((b) => b.merchant === "Beforepay")!;
    const paid = applyAccount(jess, { billAdjust: { paid: [billId(beforepay)], oneOffs: [] } });
    expect(payCycleSummary(jess, {}).isShort).toBe(true);
    expect(payCycleSummary(paid, {}).isShort).toBe(false);
    expect(safeToSpend(paid).nothingSpare).toBe(false);
    const extra = applyAccount(jessP, { billAdjust: { paid: [], oneOffs: [{ id: "o1", label: "School excursion", amount: 60, date: "2026-10-05" }] } });
    expect(safeToSpend(extra).billsTotal).toBeCloseTo(safeToSpend(jessP).billsTotal + 60, 2);
    expect(safeToSpend(extra).bills.some((b) => b.merchant === "School excursion")).toBe(true);
  });

  it("no payday found: safe to spend covers the next 7 days", () => {
    const none = { ...marcus, derived: { ...marcus.derived, pay_cycle: { ...marcus.derived.pay_cycle, next_payday: "" } } };
    expect(safeToSpend(none)).toMatchObject({ sevenDayMode: true, days: 7, payday: "2026-10-02" });
  });

  it("irregular income: the payday is labelled as an estimate", () => {
    const irregular = { ...jess, score: { ...jess.score!, breakdown: { ...jess.score!.breakdown, INCOME: 3.1 } } };
    expect(safeToSpend(irregular).paydayEstimated).toBe(true);
    expect(safeToSpend(jess).paydayEstimated).toBe(false);
  });

  it("recap: leads with the best-ever streak when the current one is 0", () => {
    expect(cycleRecap(jessP)).toMatchObject({ noAdvanceStreak: 0, bestNoAdvance: 10 });
  });

  it("projection is rounded to the nearest 5", () => {
    for (const d of [jess, marcus]) expect(projectScore(d)!.to % 5).toBe(0);
  });

  it("tally: a cancelled subscription counts for at most 12 months", () => {
    const sub = detectSubscriptions(jess).find((s) => s.merchant === "Netflix")!;
    const muchLater = { ...jess, asOf: "2028-06-01" };
    const t = valueTally(muchLater, { actions: [{ type: "cancelled_subscription", key: "Netflix", at: "2026-09-25T09:30:00+10:00" }] });
    expect(t.items[0]!.label.count).toBe(12);
    expect(t.total).toBeCloseTo(sub.amount * 12, 2);
  });
});
