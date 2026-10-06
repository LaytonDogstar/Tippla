// Spec 03: Tippla's own charge aligned to payday, never taking the balance below $0, retries only after pay,
// proration shown, the "pause or downgrade" feed card, and the billing date log.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PersonaData } from "@/lib/api/types";
import { parseAccount, serialiseAccount, type BillingPref } from "@/lib/account/state";
import { allFeedItems } from "@/lib/feed";
import { billing, retryDates } from "@/lib/selectors";
import { billingLog, logAlignment, logPreference } from "@/lib/billing/log";
import { resetDbForTests } from "@/lib/db";
import { load, loadPayday } from "./helpers";

const pref = (p: Omit<BillingPref, "changedAt">): { billingPref: BillingPref } => ({ billingPref: { ...p, changedAt: "2026-09-25T09:30:00+10:00" } });

describe("billing on payday", async () => {
  const [jess, jessP, marcus] = await Promise.all([load("jess"), loadPayday("jess"), load("marcus")]);
  afterEach(() => { delete process.env.FLAGS_OFF; });

  it("Jess: the 28/09 charge moves to Fri 02/10, the day after her 01/10 payday, with the proration shown", () => {
    const b = billing(jess);
    expect(b.nextCharge).toBe("2026-10-02");
    expect(b.alignment).toMatchObject({ nominal: "2026-09-28", payday: "2026-10-01", moved: true, deferred: null, amount: 9.99 });
    expect(b.alignment!.proration).toEqual({ from: "2026-09-28", to: "2026-10-01", days: 4, periodDays: 30, amount: 1.33 });
  });

  it("with the flag off, billing stays on the old date", () => {
    process.env.FLAGS_OFF = "payday_billing_v1";
    expect(billing(jess)).toMatchObject({ nextCharge: "2026-09-28", alignment: null });
  });

  it("a fixed date that would take the balance below $0 before pay is deferred to after pay lands", () => {
    const b = billing(jess, pref({ mode: "fixed_date", fixedDay: 28, cadence: "monthly" }));
    expect(b.nextCharge).toBe("2026-10-02");
    expect(b.alignment!.deferred).toEqual({ from: "2026-09-28", to: "2026-10-02", lowest: -52.69 });
  });

  it("a fixed date with room stays put (Marcus on the 28th)", () => {
    const b = billing(marcus, pref({ mode: "fixed_date", fixedDay: 28, cadence: "monthly" }));
    expect(b.nextCharge).toBe("2026-09-28");
    expect(b.alignment).toMatchObject({ moved: false, deferred: null, proration: null });
  });

  it("per pay cycle: monthly × 12 ÷ 26, the day after each payday, no proration", () => {
    const b = billing(jess, pref({ mode: "after_payday", cadence: "per_cycle" }));
    expect(b.nextCharge).toBe("2026-10-02");
    expect(b.alignment).toMatchObject({ amount: 4.61, proration: null });
  });

  it("if the pay pattern changes, the charge re-anchors to the new payday", () => {
    const moved: PersonaData = { ...jess, derived: { ...jess.derived, pay_cycle: { ...jess.derived.pay_cycle, next_payday: "2026-10-05" } } };
    expect(billing(moved).nextCharge).toBe("2026-10-06");
  });

  it("on payday the next charge is the day after the payday nearest the old date", () => {
    expect(billing(jessP)).toMatchObject({ nextCharge: "2026-10-30", alignment: { nominal: "2026-10-28", payday: "2026-10-29" } });
  });

  it("failed payments: retried only after the next pay lands, at most twice", () => {
    expect(retryDates(jess, "2026-09-28")).toEqual(["2026-10-02", "2026-10-16"]);
    expect(retryDates(jess, "2026-10-02")).toEqual(["2026-10-16", "2026-10-30"]);
    expect(billing(jess, {}, { failedLast: true }).alignment!.failed).toEqual({ on: "2026-08-28", amount: 9.99, retries: ["2026-10-02", "2026-10-16"] });
  });

  it("pause and plan changes follow the aligned dates", () => {
    const b = billing(jess);
    expect(b.effects).toEqual({ cancelAccessUntil: "2026-09-28", pauseSkips: "2026-10-02", pauseResumes: "2026-10-30", changeFrom: "2026-10-02" });
  });

  it("billing preferences are validated when read back", () => {
    const ok = pref({ mode: "fixed_date", fixedDay: 99, cadence: "monthly" });
    expect(parseAccount(serialiseAccount(undefined, "jess", ok), "jess").billingPref!.fixedDay).toBe(1);
    expect(parseAccount(encodeURIComponent(JSON.stringify({ jess: { billingPref: { mode: "weekly", cadence: "monthly", changedAt: "x" } } })), "jess").billingPref).toBeUndefined();
  });
});

describe("pause or downgrade Tippla, offered openly (tippla_billing_relief)", async () => {
  const [jess, marcus] = await Promise.all([load("jess"), load("marcus")]);
  const relief = (d: PersonaData, account = {}) => allFeedItems({ d, edits: {}, account }).filter((i) => i.type === "tippla_billing_relief");

  it("Jess, short before payday: a Help card with her real charge and date", () => {
    const [card] = relief(jess);
    expect(card).toMatchObject({ section: "help", urgency: 3, title: "You can pause your $9.99 Tippla payment", action: { href: "/account/subscription" } });
    expect(card!.body).toBe("It's due Fri 02/10. If money's tight, you can skip a month. It takes a minute and you can undo it.");
  });

  it("Marcus: only once he's using hardship support this pay cycle (and then mentions Standard)", () => {
    expect(relief(marcus)).toEqual([]);
    expect(relief(marcus, { hardshipSelfSelected: true })[0]!.body).toContain("or switch to Standard");
    expect(relief(marcus, { hardshipVisitedAt: "2026-09-24" })).toHaveLength(1);
    expect(relief(marcus, { hardshipVisitedAt: "2026-09-01" })).toEqual([]); // a previous pay cycle
  });

  it("not when already paused or cancelled", () => {
    for (const status of ["paused", "cancelled"] as const) {
      expect(relief(jess, { subscription: { status, plan: "standard", effective: "2026-10-02", changedAt: "" } })).toEqual([]);
    }
  });
});

describe("billing log", () => {
  beforeAll(async () => { await resetDbForTests(); });

  it("logs each date change once, with its reason, however often the page is viewed", async () => {
    const jess = await load("jess");
    const b = billing(jess);
    for (let i = 0; i < 3; i++) await logAlignment("jess", b.alignment!, b.nextCharge, { consent: false });
    const deferred = billing(jess, pref({ mode: "fixed_date", fixedDay: 28, cadence: "monthly" }));
    await logAlignment("jess", deferred.alignment!, deferred.nextCharge, { consent: false });
    await logPreference("jess", pref({ mode: "fixed_date", fixedDay: 28, cadence: "monthly" }).billingPref);
    const rows = await billingLog("jess");
    expect(rows.map((r) => [r.type, r.from_date, r.to_date])).toEqual([
      ["aligned", "2026-09-28", "2026-10-02"],
      ["deferred", "2026-09-28", "2026-10-02"],
      ["preference_changed", null, null],
    ]);
    expect(rows[1]!.reason).toContain("-52.69");
  });
});
