// Calendar (08/10/2026): the headline answers "will I be OK until payday?" from the same day figures as the
// chart, grid and timeline; the timeline lists every money event once, with the end-of-day balance.
import { describe, expect, it } from "vitest";
import { calendarHeadline, calendarTimeline, fortnight, monthCalendar, payCycleSummary } from "@/lib/selectors";
import { load } from "./helpers";

describe("calendar headline", () => {
  it("Jess, this fortnight: short on the day the hero says, by the same amount", async () => {
    const d = await load("jess");
    const f = fortnight(d, 0);
    const h = calendarHeadline(f.days, d.asOf, f.nextPayday);
    expect(h.kind).toBe("short");
    if (h.kind !== "short") return;
    const s = payCycleSummary(d);
    expect(Math.round(h.amount)).toBe(Math.round(-s.leftAfterBills));
    expect(h.payday).toBe(f.nextPayday);
    expect(h.daysBefore).toBeGreaterThan(0);
  });

  it("next fortnight: covered, lowest point is the minimum forecast balance", async () => {
    for (const p of ["jess", "marcus"] as const) {
      const d = await load(p);
      const f = fortnight(d, 1);
      const h = calendarHeadline(f.days, d.asOf, f.nextPayday);
      const min = Math.min(...f.days.filter((x) => x.balance !== null && x.date >= d.asOf).map((x) => x.balance!));
      if (h.kind === "covered") expect(h.balance).toBe(min);
      if (h.kind === "short") expect(-h.amount).toBe(min);
    }
  });

  it("a past fortnight reports its lowest point and closing balance", async () => {
    const d = await load("marcus");
    const h = calendarHeadline(fortnight(d, -2).days, d.asOf, null);
    expect(h.kind).toBe("past");
  });
});

describe("calendar timeline", () => {
  it("one line per event, balance once per day, lowest marked, totals reconcile with the day figures", async () => {
    const d = await load("jess");
    const f = fortnight(d, 0);
    const h = calendarHeadline(f.days, d.asOf, f.nextPayday);
    const tl = calendarTimeline(f.days, d.asOf, h.kind === "none" ? null : h.date);
    expect(tl.days.filter((x) => x.isLowest)).toHaveLength(1);
    for (const day of tl.days) {
      const src = f.days.find((x) => x.date === day.date)!;
      const bills = day.events.filter((e) => e.kind === "bill").reduce((n, e) => n - e.amount, 0);
      expect(Math.round(bills * 100)).toBe(Math.round(src.predictedBills.reduce((n, b) => n + b.expected_amount, 0) * 100));
      expect(day.balance).toBe(src.balance);
    }
    expect(tl.forecastEnds).toBeNull();
  });

  it("month view past the forecast says where the forecast ends", async () => {
    const d = await load("jess");
    const m = monthCalendar(d, "2026-10");
    const tl = calendarTimeline(m.days, d.asOf, null);
    expect(tl.forecastEnds).not.toBeNull();
    expect(tl.days.every((x) => x.date < tl.forecastEnds!)).toBe(true);
  });
});

describe("spending by category (replaced the donut)", () => {
  it("ranked highest first; rows add up to the total; lenders flag only gambling and loan repayments", async () => {
    const { categoryTotals, currentCycle, totalSpent, isLenderCategory, LENDER_CATEGORIES } = await import("@/lib/selectors");
    const d = await load("jess");
    const p = currentCycle(d);
    const rows = categoryTotals(d, p);
    expect(rows.map((r) => r.total)).toEqual([...rows.map((r) => r.total)].sort((a, b) => b - a));
    expect(Math.round(rows.reduce((n, r) => n + r.total, 0) * 100)).toBe(Math.round(totalSpent(d, p) * 100));
    expect([...LENDER_CATEGORIES].sort()).toEqual(["gambling", "loan_repayment"]);
    expect(rows.filter((r) => isLenderCategory(r.category)).map((r) => r.category).sort()).toEqual(["gambling", "loan_repayment"]);
  });
});
