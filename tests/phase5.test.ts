// Phase 5: repayments, the early repayment maths, billing, account state, notifications.
import { describe, expect, it } from "vitest";
import { applyAccount, parseAccount, serialiseAccount } from "@/lib/account/state";
import { sumMoney } from "@/lib/format/money";
import {
  billing, compareRepayment, dashboardBanner, failedPayments, notifications, repaymentHistory, simulateRepayment, upcomingRepayments, visibleOffers,
} from "@/lib/selectors";
import { load } from "./helpers";

describe("repayments", async () => {
  const [jess, marcus] = await Promise.all([load("jess"), load("marcus")]);

  it("upcoming: fortnightly loans repeat, monthly ones step a month, a pay advance appears once", () => {
    const u = upcomingRepayments(jess, 30);
    expect(u.filter((x) => x.provider === "Nimble").map((x) => x.date)).toEqual(["2026-10-03", "2026-10-17"]);
    expect(u.filter((x) => x.provider === "Beforepay")).toHaveLength(1);
    expect(upcomingRepayments(jess, 90).filter((x) => x.provider === "Zip Pay").map((x) => x.date)).toEqual(["2026-10-13", "2026-11-13", "2026-12-13"]);
    expect(upcomingRepayments(marcus, 30).every((x) => x.kind !== "wage_advance")).toBe(true);
  });

  it("history totals match their items; failed payments are facts with the lender", () => {
    for (const m of repaymentHistory(jess)) expect(m.total).toBe(sumMoney(m.items.map((i) => i.amount)));
    expect(failedPayments(jess).map((f) => [f.date, f.lender, f.fee])).toEqual([["2026-09-09", "Nimble", 15], ["2026-07-26", "Nimble", 15]]);
  });

  it("early repayment: extra pays off sooner and saves interest; no extra changes nothing", () => {
    const base = { balance: 2140, repayment: 120, cadenceDays: 14, ratePct: 24, monthlyFee: 0, extraPerCycle: 0 };
    const none = compareRepayment(base, "2026-09-25");
    expect(none.weeksSooner).toBe(0);
    expect(none.saved).toBe(0);
    const more = compareRepayment({ ...base, extraPerCycle: 40 }, "2026-09-25");
    expect(more.weeksSooner).toBeGreaterThan(0);
    expect(more.saved).toBeGreaterThan(0);
    expect(more.plan.weeks! + more.weeksSooner!).toBe(more.base.weeks);
  });

  it("no interest or fees: weeks = balance / repayment, nothing saved", () => {
    const r = simulateRepayment({ balance: 960, repayment: 96, cadenceDays: 14, ratePct: 0, monthlyFee: 0, extraPerCycle: 0 }, "2026-09-25");
    expect(r.repayments).toBe(10);
    expect(r.weeks).toBe(20);
    expect(r.interestAndFees).toBe(0);
  });

  it("a repayment that doesn't cover the interest is never paid off (said plainly, not a huge number)", () => {
    expect(simulateRepayment({ balance: 5000, repayment: 10, cadenceDays: 14, ratePct: 48, monthlyFee: 0, extraPerCycle: 0 }, "2026-09-25").weeks).toBeNull();
  });
});

describe("account state", async () => {
  const [jess, marcus] = await Promise.all([load("jess"), load("marcus")]);

  it("withdrawing lender matching hides offers straight away", () => {
    expect(visibleOffers(marcus)).toHaveLength(1);
    const off = applyAccount(marcus, { consents: { lender_matching: { granted: false, at: "2026-09-25T09:30:00+10:00" } } });
    expect(visibleOffers(off)).toEqual([]);
  });

  it("offers are never a banner or a notification, even with matching on (05/10 guardrail)", () => {
    expect(dashboardBanner(marcus)).toBeNull();
    for (const n of notifications(marcus)) expect(`${n.title} ${n.body} ${n.href}`).not.toMatch(/offer|lender/i);
  });

  it("Not interested hides only that offer and leaves matching on", () => {
    const d = applyAccount(marcus, { dismissedOffers: ["off_001"] });
    expect(d.offers.offers).toEqual([]);
    expect(d.consents.find((c) => c.id === "lender_matching")!.granted).toBe(true);
  });

  it("parses defensively", () => {
    expect(parseAccount("nope", "jess")).toEqual({});
    const raw = serialiseAccount(undefined, "jess", { dismissedOffers: ["a"], subscription: { status: "cancelled", plan: "standard", effective: "2026-09-28", changedAt: "x" } });
    expect(parseAccount(raw, "jess").subscription?.status).toBe("cancelled");
    expect(parseAccount(raw, "marcus")).toEqual({});
  });

  it("billing: monthly from sign-up (moved to after payday, spec 03); cancel keeps access to the period end; pause skips one charge", () => {
    const b = billing(jess);
    expect(b.history[0]!.date).toBe("2026-09-28" > jess.asOf ? "2026-08-28" : "2026-09-28");
    expect(b.nextCharge).toBe("2026-10-02");
    expect(b.alignment!.nominal).toBe("2026-09-28");
    const c = billing(jess, { subscription: { status: "cancelled", plan: "standard", effective: "2026-09-28", changedAt: "" } });
    expect([c.nextCharge, c.until]).toEqual([null, "2026-09-28"]);
    // Pausing skips the 02/10 charge; billing resumes the day after a payday about a month later, as the sheet said.
    expect([b.effects.pauseSkips, b.effects.pauseResumes]).toEqual(["2026-10-02", "2026-10-30"]);
    const p = billing(jess, { subscription: { status: "paused", plan: "standard", effective: "2026-10-02", changedAt: "" } });
    expect([p.nextCharge, p.until]).toEqual(["2026-10-30", "2026-10-30"]);
    expect(billing(marcus).planName).toBe("Pro");
  });
});
