// Cross-page journeys (12/10/2026): one calculation for each shared number, the back control's origin and fallback,
// the calendar's URL round-trip, the panels' data, and hardship mode's signals and flag.
import { describe, expect, it } from "vitest";
import {
  calendarDays, cycleWins, currentCycleForecast, forecastBoth, gamblingPanel, goalPlan, savingsGoalLimit, hardshipSignals, lenderViews, lenders, loanBalance, lowestBoth, payCycleSummary, repayments,
  sharedSmallLoans, shortBeforePayday, tightPanel, usualEverydayPerDay,
} from "@/lib/selectors";
import { ORIGIN_PARAM, backTarget, originOf, pageName, safeFrom, withFrom } from "@/lib/nav/back";
import { calendarInitial, calendarSearch } from "@/lib/calendar/selection";
import { hardshipModeOn } from "@/lib/hardshipMode";
import { daysBetween } from "@/lib/format/dates";
import { load } from "./helpers";

const r = (n: number) => Math.round(n);

describe("short before payday: one calculation, both ways", () => {
  it("Jess: $53 bills only (Today's headline); about $483 with her usual everyday spending, by Wed 30/09", async () => {
    const d = await load("jess");
    const s = shortBeforePayday(d);
    expect(r(s.billsOnly)).toBe(-53);
    expect(s.billsOnly).toBe(payCycleSummary(d).leftAfterBills); // the same figure Today shows
    expect(s.everydayPerDay).toBe(86);
    expect(s.withEveryday).toEqual({ balance: expect.closeTo(-482.69, 1), date: "2026-09-30" });
  });
  it("Marcus and Priya: never short, either way", async () => {
    for (const p of ["marcus", "priya"] as const) {
      const s = shortBeforePayday(await load(p));
      expect(s.billsOnly).toBeGreaterThan(0);
      expect(s.withEveryday!.balance).toBeGreaterThan(0);
    }
  });
});

describe("forecast: the same engine on Calendar and Today", () => {
  it("bills-only days are the calendar's own balances; with-everyday takes the usual spending off each day", async () => {
    const d = await load("jess");
    const days = calendarDays(d);
    const per = usualEverydayPerDay(d, days);
    for (const f of forecastBoth(d, days)) {
      expect(f.billsOnly).toBe(days.find((x) => x.date === f.date)!.balance);
      expect(f.withEveryday).toBeCloseTo(f.billsOnly - per * daysBetween(d.asOf, f.date), 2);
    }
  });
  it("Jess 01/10–14/10: +$1,051 counting bills only, about −$583 with her usual spending (the B7 mismatch, now labelled)", async () => {
    const d = await load("jess");
    const low = lowestBoth(d, calendarDays(d), "2026-10-01", "2026-10-14")!;
    // The fixture alone: 1,061. On screen the app adds Tippla's own $10 fee (withMembershipCharge): $1,051.
    expect(r(low.billsOnly.balance)).toBe(1061);
    expect(low.withEveryday.date).toBe("2026-10-14");
    expect(low.withEveryday.balance).toBeLessThan(-500);
  });
});

describe("repayments and lender count: one figure on every page", () => {
  it("Jess: $668 a pay cycle across 6 lenders, including one pay-advance provider", async () => {
    const d = await load("jess");
    const rp = repayments(d);
    expect(r(rp.perCycle)).toBe(668);
    expect(rp.count).toBe(6);
    expect(rp.advanceProviders).toBe(1);
    // Money plan's rows add up to the same total; the lender panel lists the same lenders.
    expect(r(lenders(d).reduce((s, l) => s + l.perCycle, 0))).toBe(668);
    expect(lenderViews(d).map((l) => l.provider)).toEqual(rp.lenders.map((l) => l.provider));
  });
  it("Marcus: 2 lenders, no pay advances", async () => {
    const rp = repayments(await load("marcus"));
    expect([rp.count, rp.advanceProviders, r(rp.perCycle)]).toEqual([2, 0, 60]);
  });
});

describe("loan balances: Borrowing's estimate everywhere", () => {
  it("Right Road $2,140 estimated; Nimble and Cash Train share about $1,060; BNPL not available", async () => {
    const d = await load("jess");
    expect(loanBalance(d, "Right Road Finance")).toEqual({ kind: "estimate", amount: 2140 });
    expect(loanBalance(d, "Nimble")).toEqual({ kind: "shared", amount: 1060, with: ["Cash Train"] });
    expect(loanBalance(d, "Afterpay")).toEqual({ kind: "none" });
    expect(sharedSmallLoans(d)).toEqual({ amount: 1060, providers: ["Nimble", "Cash Train"] });
  });
});

describe("back control", () => {
  it("names pages, longest match first", () => {
    expect(pageName("/")).toBe("Today");
    expect(pageName("/money-plan?persona=jess")).toBe("Money plan");
    expect(pageName("/progress/whats-next")).toBe("What's next");
    expect(pageName("/progress")).toBe("Pay cycles");
    expect(pageName("/spending/budgets")).toBe("Budgets");
    expect(pageName("/nowhere")).toBeNull();
  });
  it("only an internal, named page is an origin", () => {
    expect(safeFrom("/score")).toBe("/score");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil", "/nowhere", "", null]) expect(safeFrom(bad)).toBeNull();
  });
  it("goes to the origin; without one, to the logical parent; top-level pages with neither have none", () => {
    expect(backTarget("/?persona=jess", "/spending")).toEqual({ href: "/?persona=jess", label: "Today" });
    expect(backTarget(null, "/spending")).toEqual({ href: "/spending", label: "Spending" });
    expect(backTarget("//evil.example", "/account")).toEqual({ href: "/account", label: "Account" });
    expect(backTarget(null, undefined)).toBeNull();
  });
  it("tags cross-page links with the origin, never the same page, and keeps the calendar's own from/to", () => {
    const origin = originOf("/money-plan", `?persona=jess&panel=lender%3ANimble&${ORIGIN_PARAM}=%2F`);
    expect(origin).toBe("/money-plan?persona=jess");
    expect(withFrom("/calendar?from=2026-10-01&to=2026-10-14", origin)).toBe(`/calendar?from=2026-10-01&to=2026-10-14&${ORIGIN_PARAM}=%2Fmoney-plan%3Fpersona%3Djess`);
    expect(withFrom("/spending?category=gambling#activity", "/")).toBe(`/spending?category=gambling&${ORIGIN_PARAM}=%2F#activity`);
    expect(withFrom("/money-plan#mp-wins", origin)).toBe("/money-plan#mp-wins");
    expect(withFrom("https://ndh.org.au/", origin)).toBe("https://ndh.org.au/");
    expect(withFrom(`/score?${ORIGIN_PARAM}=%2F`, origin)).toBe(`/score?${ORIGIN_PARAM}=%2F`);
  });
});

describe("calendar URL round-trip", () => {
  const dates = Array.from({ length: 140 }, (_, i) => new Date(Date.UTC(2026, 5, 7 + i)).toISOString().slice(0, 10)); // 07/06 – 24/10
  it("a range opens selected and is written back as from/to (never swapped for month)", () => {
    const init = calendarInitial({ from: "2026-10-01", to: "2026-10-14", month: "2026-10" }, dates, "2026-09-25", "2026-09-17");
    expect(init).toEqual({ month: "2026-10", start: "2026-10-01", end: "2026-10-14" });
    const q = calendarSearch(new URLSearchParams(`persona=jess&${ORIGIN_PARAM}=%2Fmoney-plan`), init.month, init.start, init.end);
    expect(Object.fromEntries(q)).toEqual({ persona: "jess", [ORIGIN_PARAM]: "/money-plan", month: "2026-10", from: "2026-10-01", to: "2026-10-14" });
    expect(calendarInitial(Object.fromEntries(q), dates, "2026-09-25", "2026-09-17")).toEqual(init);
  });
  it("a single day as ?day=; past the forecast, clipped; legacy ?offset= still lands", () => {
    const q = calendarSearch(new URLSearchParams("from=2026-10-01&to=2026-10-14"), "2026-09", "2026-09-30", "2026-09-30");
    expect(Object.fromEntries(q)).toEqual({ month: "2026-09", day: "2026-09-30" });
    expect(calendarInitial({ from: "2026-10-20", to: "2026-11-30" }, dates, "2026-09-25", "2026-09-17")).toEqual({ month: "2026-10", start: "2026-10-20", end: "2026-10-24" });
    expect(calendarInitial({ offset: "-2" }, dates, "2026-09-25", "2026-09-17").month).toBe("2026-08");
  });
});

describe("panels", () => {
  it("gambling: this cycle so far against the same point last cycle (as Today's card), with the whole of last cycle too", async () => {
    const g = gamblingPanel(await load("jess"));
    expect([g.total, g.lastSamePoint, g.change, g.lastCycle]).toEqual([200, 300, -100, 385]);
    expect(g.transactions.map((t) => t.merchant)).toEqual(["Sportsbet", "TAB"]);
  });
  it("money's tight: both figures, what's due (lenders marked), smaller wins; buffer only when safe to spend shows", async () => {
    const d = await load("jess");
    const t = tightPanel(d);
    expect(r(t.billsOnly)).toBe(-53);
    expect(t.due.map((b) => [b.merchant, b.lender])).toEqual([["Telstra", false], ["Beforepay", true]]);
    expect(t.wins.length).toBeGreaterThan(0);
    expect(t.bufferVisible).toBe(false);
    expect(tightPanel(d, undefined, { safeToSpendVisible: true }).bufferVisible).toBe(true);
  });
  it("one lender view: repayment, next due, repaid in 90 days, the shared balance estimate", async () => {
    const v = lenderViews(await load("jess")).find((l) => l.provider === "Nimble")!;
    expect(v).toMatchObject({ amount: 96, frequency: "fortnightly", nextDue: { date: "2026-10-03", amount: 96 }, repaid90: 576, balance: { kind: "shared", amount: 1060 } });
  });
});

describe("hardship mode", () => {
  it("Jess shows strong signals; Marcus and Priya don't", async () => {
    const j = hardshipSignals(await load("jess"));
    expect(j.strong).toBe(true);
    expect(j.signals).toEqual(expect.arrayContaining(["recurring_advances", "lenders", "gambling"]));
    expect(hardshipSignals(await load("marcus")).strong).toBe(false);
    expect(hardshipSignals(await load("priya")).strong).toBe(false);
  });
  it("off for everyone until signed off; previewable with the dev state", () => {
    expect(hardshipModeOn("jess")).toBe(false);
    expect(hardshipModeOn("jess", ["hardship_mode"])).toBe(true);
  });
});

describe("Pay cycles", () => {
  it("this pay cycle as a forecast row: the same −$483 / −$53 as Today and Calendar", async () => {
    const d = await load("jess");
    const c = currentCycleForecast(d)!;
    expect(c.cycle).toEqual({ start: "2026-09-17", end: "2026-09-30" });
    expect(c.withEveryday).toBe(shortBeforePayday(d).withEveryday!.balance);
    expect(r(c.billsOnly)).toBe(-53);
  });
  it("going well so far: Today's everyday comparison and the gambling panel's, only when down; gambling hidden stays hidden", async () => {
    const d = await load("jess");
    expect(cycleWins(d)).toEqual([{ kind: "everyday_less", amount: 39 }, { kind: "gambling_less", amount: -gamblingPanel(d).change }]);
    expect(cycleWins(d, { hideGambling: true }).map((w) => w.kind)).toEqual(["everyday_less"]);
  });
  it("savings goals: not tied to the score alone; one once the buffer goal is reached", async () => {
    const d = await load("jess");
    expect(savingsGoalLimit(d)).toBe(0);
    expect(savingsGoalLimit(d, true)).toBe(1);
    expect(goalPlan(d, undefined)).toBeNull();
    expect(savingsGoalLimit(await load("marcus"))).toBe(1);
  });
});
