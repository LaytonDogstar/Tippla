// Spec 05: corrections propagate to the forecast, feed, loans, subscriptions and plan; member rules match
// future transactions; forecast accuracy; connection health thresholds and consent-expiry scheduling.
import { describe, expect, it } from "vitest";
import { applyAccount, parseAccount, serialiseAccount, type AccountState } from "@/lib/account/state";
import { parseRules, withRule } from "@/lib/account/corrections";
import { applyDevStates } from "@/lib/dev/states";
import { feed } from "@/lib/feed";
import { activeLoans, backtestPoint, connectionHealth, consentReminders, forecastAccuracy, forecastAhead, isBadMiss, oneOffDeposits, payCycleSummary, recommendations, refreshStatus, safeToSpend, subscriptions, upcomingIncome } from "@/lib/selectors";
import { load } from "./helpers";

const NOW = "2026-09-25T09:30:00+10:00";

describe("corrections", async () => {
  const jess = await load("jess");
  const view = (a: AccountState) => {
    const d = applyAccount(jess, a);
    return { d, pc: payCycleSummary(d), safe: safeToSpend(d), feed: feed({ d, edits: {}, account: a }, {}).open };
  };

  it("acceptance: Jess marks Telstra as already paid; the shortfall and safe to spend update", () => {
    const before = view({});
    const after = view({ billAdjust: { paid: ["Telstra:2026-09-26"], oneOffs: [] } });
    expect([before.pc.leftAfterBills, after.pc.leftAfterBills]).toEqual([-52.69, -0.69]);
    expect(before.feed.find((i) => i.type === "shortfall")!.title).toBe("About $53 short before payday");
    expect(after.feed.find((i) => i.type === "shortfall")!.title).toBe("About $1 short before payday");
    expect(after.d.derived.upcoming_bills.some((b) => b.merchant === "Telstra")).toBe(false);
  });

  it("a different amount or a new date flows into the forecast and safe to spend", () => {
    const amount = view({ billAdjust: { paid: [], oneOffs: [], amounts: { "Beforepay:2026-09-30": 200 } } });
    expect([amount.pc.leftAfterBills, amount.safe.perDay]).toEqual([62.31, 10]);
    expect(amount.feed.some((i) => i.type === "shortfall")).toBe(false);
    const moved = view({ billAdjust: { paid: [], oneOffs: [], moved: { "Beforepay:2026-09-30": "2026-10-02" } } });
    expect([moved.pc.leftAfterBills, moved.safe.perDay]).toEqual([262.31, 43]);
    // The corrected bill keeps its original id, so it can be corrected again or undone.
    expect(moved.d.derived.upcoming_bills.find((b) => b.merchant === "Beforepay")).toMatchObject({ date: "2026-10-02", origin: "Beforepay:2026-09-30" });
  });

  it("subscriptions and loans: not a subscription, ended, not a loan; the plan follows", () => {
    const a: AccountState = { rules: [
      { id: "1", kind: "not_subscription", merchant: "Binge", createdAt: NOW },
      { id: "2", kind: "subscription_ended", merchant: "Netflix", createdAt: NOW },
      { id: "3", kind: "not_loan", merchant: "Nimble", createdAt: NOW },
    ] };
    const d = applyAccount(jess, a);
    expect(subscriptions(d).rows.map((r) => r.merchant)).toEqual(["Spotify", "Stan", "Apple iCloud"]);
    expect(d.derived.upcoming_bills.some((b) => b.merchant === "Netflix")).toBe(false);
    expect(activeLoans(jess).map((l) => l.provider)).toContain("Nimble");
    expect(activeLoans(d).map((l) => l.provider)).not.toContain("Nimble");
    // Nimble's payments are now a bill, still in the forecast.
    expect(d.derived.upcoming_bills.find((b) => b.merchant === "Nimble")!.category).toBe("bills");
    expect(d.transactions.filter((t) => t.merchant === "Nimble").every((t) => t.category !== "loan_repayment")).toBe(true);
    // Score-related: the "pay off" step moves to a real loan.
    expect(recommendations(d).map((r) => r.id)).toContain("pay-off-Cash Train");
    expect(recommendations(d).map((r) => r.id)).not.toContain("pay-off-Nimble");
  });

  it("member rules match future transactions too", () => {
    const later = { ...jess, transactions: [...jess.transactions, { ...jess.transactions.find((t) => t.merchant === "Woolworths" || t.category === "groceries")!, id: "future", date: "2026-10-03" }] };
    const merchant = later.transactions.at(-1)!.merchant;
    const d = applyAccount(later, { rules: [{ id: "c", kind: "category", merchant, category: "shopping", createdAt: NOW }] });
    expect(d.transactions.filter((t) => t.merchant === merchant).every((t) => t.category === "shopping")).toBe(true);
    expect(d.transactions.find((t) => t.id === "future")!.category).toBe("shopping");
  });

  it("income: the member's one-off / regular wins over the heuristic", () => {
    const withBond = applyDevStates(jess, ["one_off"]);
    expect(oneOffDeposits(withBond).map((o) => o.payer)).toEqual(["NSW Fair Trading"]);
    const regular = applyAccount(withBond, { rules: [{ id: "r", kind: "income_regular", merchant: "NSW Fair Trading", createdAt: NOW }] });
    expect(oneOffDeposits(regular)).toEqual([]);
    const employer = upcomingIncome(jess, "2026-10-20")[0]!.payer;
    const oneOff = applyAccount(jess, { rules: [{ id: "o", kind: "income_one_off", merchant: employer, createdAt: NOW }] });
    expect(upcomingIncome(oneOff, "2026-10-20").some((i) => i.payer === employer)).toBe(false);
  });

  it("rules parse defensively, survive the cookie, and the latest answer for a merchant wins", () => {
    expect(parseRules([{ id: "x", kind: "made_up", merchant: "A", createdAt: NOW }, { id: "y", kind: "category", merchant: "A", category: "income", createdAt: NOW }, "nope"])).toEqual([]);
    let rules = withRule([], { kind: "subscription_ended", merchant: "Stan", createdAt: NOW });
    rules = withRule(rules, { kind: "not_subscription", merchant: "Stan", createdAt: NOW });
    rules = withRule(rules, { kind: "not_bill", merchant: "Stan", createdAt: NOW });
    expect(rules.map((r) => r.kind)).toEqual(["not_subscription", "not_bill"]);
    const raw = serialiseAccount(undefined, "jess", { rules, billAdjust: { paid: [], oneOffs: [], amounts: { "Telstra:2026-09-26": 60 }, moved: { "Nimble:2026-10-03": "2026-10-06" } } });
    expect(parseAccount(raw, "jess")).toMatchObject({ rules, billAdjust: { amounts: { "Telstra:2026-09-26": 60 }, moved: { "Nimble:2026-10-03": "2026-10-06" } } });
  });
});

describe("forecast accuracy (Q31)", async () => {
  const [jess, marcus] = await Promise.all([load("jess"), load("marcus")]);

  it("backtests the end-of-day forecast against bank balances", () => {
    expect(backtestPoint(jess, "2026-09-24", 1)).toMatchObject({ madeOn: "2026-09-23", predicted: 69.84, actual: 427.93 });
    expect(backtestPoint(jess, "2026-09-26", 1)).toBeNull(); // not happened yet
    const a = forecastAccuracy(marcus);
    expect([a.hits, a.of, a.show]).toEqual([5, 10, false]);
    expect(a.mae[1]!).toBeLessThan(a.mae[14]!);
  });

  it("the member-facing line needs 8 of the last 10 within $20; a bad miss asks what happened", () => {
    for (const d of [jess, marcus]) expect(forecastAccuracy(d).show).toBe(false);
    expect(forecastAccuracy(jess).miss).toMatchObject({ forDate: "2026-09-24" });
    expect(forecastAccuracy(marcus).miss).toBeNull();
    expect(isBadMiss({ madeOn: "", forDate: "", horizon: 1, predicted: 100, actual: 210, error: -110 })).toBe(true);
    expect(isBadMiss({ madeOn: "", forDate: "", horizon: 1, predicted: 100, actual: 150, error: -50 })).toBe(true); // over 30%
    expect(isBadMiss({ madeOn: "", forDate: "", horizon: 1, predicted: 900, actual: 940, error: -40 })).toBe(false);
  });

  it("today's forecast for the days ahead uses the same rule (stored as snapshots)", () => {
    expect(forecastAhead(jess, 1).forDate).toBe("2026-09-26");
    // Payday (01/10) lands inside the 7-day window, so that forecast is higher.
    expect(forecastAhead(jess, 7).predicted).toBeGreaterThan(forecastAhead(jess, 1).predicted);
  });
});

describe("connection health", async () => {
  const jess = await load("jess");

  it("healthy by default; consent ends 12 months after it was granted", () => {
    expect(connectionHealth(jess)).toMatchObject({ status: "healthy", dataFrom: "2026-09-25", consentEndsOn: "2027-03-28", pauseSafeToSpend: false });
  });

  it("stale after 48 h, safe to spend paused after 72 h; reconnecting clears it", () => {
    expect(connectionHealth(jess, {}, [], "2026-09-27T18:00:00+10:00")).toMatchObject({ status: "healthy", hoursOld: 47 });
    expect(connectionHealth(jess, {}, [], "2026-09-27T20:00:00+10:00")).toMatchObject({ status: "stale", hoursOld: 49, pauseSafeToSpend: false });
    expect(connectionHealth(jess, {}, ["stale"])).toMatchObject({ status: "stale", hoursOld: 80, pauseSafeToSpend: true });
    expect(connectionHealth(jess, { bank: { renewedOn: "2026-09-25" } }, ["stale"]).status).toBe("healthy");
    expect(connectionHealth(jess, { bank: { disconnected: true } }).status).toBe("broken");
  });

  it("acceptance: consent ending in 10 days gives a feed card, a status line notice and the push schedule", () => {
    const d = applyDevStates(jess, ["consent_expiring"]);
    const h = connectionHealth(d);
    expect(h).toMatchObject({ status: "expiring", consentEndsOn: "2026-10-05", daysToConsentEnd: 10 });
    const card = feed({ d, edits: {}, account: {} }, {}).open.find((i) => i.type === "bank_reconnect")!;
    expect(card).toMatchObject({ title: "Your bank connection ends in 10 days", action: { label: "Renew connection", href: "/account/bank/reconnect?return=/" }, urgency: 3 });
    expect(refreshStatus(d, 3, { expiringOn: h.consentEndsOn }).line).toBe("Your bank connection ends Mon 05/10 · Renew it to keep your forecast up to date");
    expect(consentReminders("2026-10-05")).toEqual([
      { date: "2026-09-21", daysLeft: 14, priority: "normal" },
      { date: "2026-10-02", daysLeft: 3, priority: "normal" },
      { date: "2026-10-05", daysLeft: 0, priority: "high" },
    ]);
  });

  it("stale data gets its own card", () => {
    const card = feed({ d: jess, edits: {}, account: {}, states: ["stale"] }, {}).open.find((i) => i.type === "bank_reconnect")!;
    expect(card.title).toBe("We haven't had new bank data for a while");
  });
});
