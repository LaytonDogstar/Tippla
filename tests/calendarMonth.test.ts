// Calendar, month first (09/10/2026): range maths (opening, in, out, closing, lowest, into the forecast), pending
// never counted, the everyday-spend average, the Monday grid, and every way of selecting days.
import { describe, expect, it } from "vitest";
import { calendarDays, calendarNow, everydayAverage, monthGrid, payCycleRanges, rangeSummary, type CalDay } from "@/lib/selectors";
import { bounds, initialSelection, isSelected, select, type Selection, type SelectionAction } from "@/lib/calendar/selection";
import { sumMoney } from "@/lib/format/money";
import { all, load } from "./helpers";

const day = (date: string, balance: number | null, items: Partial<CalDay> = {}): CalDay => ({
  date, isToday: false, isFuture: false, balance, items: [], moneyIn: 0, moneyOut: 0, pending: 0, everyday: 0, ...items,
});

describe("range maths", () => {
  const days = [
    day("2026-09-23", 149),
    day("2026-09-24", 428, { moneyIn: 300, moneyOut: 21.46 }),
    day("2026-09-25", 314.31, { moneyOut: 113.62, pending: 212.4, isToday: true }),
    day("2026-09-26", 262.31, { moneyOut: 52, isFuture: true }),
    day("2026-09-30", -52.69, { moneyOut: 315, isFuture: true }),
  ];
  it("opening is the day before; in, out, closing and lowest across the range", () => {
    const r = rangeSummary(days, "2026-09-24", "2026-09-25");
    expect(r).toMatchObject({ opening: 149, moneyIn: 300, moneyOut: 135.08, closing: 314.31, closingIsForecast: false, lowest: { date: "2026-09-25", balance: 314.31 }, forecastFrom: null, pending: 212.4, days: 2 });
  });
  it("a range into forecast days: forecast closing, the lowest forecast day, and where the forecast starts", () => {
    const r = rangeSummary(days, "2026-09-30", "2026-09-24"); // either order
    expect(r).toMatchObject({ from: "2026-09-24", to: "2026-09-30", opening: 149, closing: -52.69, closingIsForecast: true, lowest: { date: "2026-09-30", balance: -52.69 }, forecastFrom: "2026-09-26", moneyOut: 502.08 });
  });
  it("no opening balance before the first day of data", () => {
    expect(rangeSummary(days, "2026-09-23", "2026-09-23").opening).toBeNull();
  });
});

describe("Jess's September (the mockup)", async () => {
  const d = await load("jess");
  const days = calendarDays(d);
  const now = calendarNow(d, days);
  it("the four stats and the banner", () => {
    expect(now.balanceToday).toBe(314.31);
    expect(now.lowest).toEqual({ date: "2026-09-30", balance: -52.69, dayBeforePayday: true });
    expect(now.bills).toEqual({ total: 367, payees: ["Telstra", "Beforepay"] });
    expect(now.belowZero).toEqual({ days: 10, of: 25 });
    expect(now.short).toEqual({ date: "2026-09-30", amount: 52.69 });
  });
  it("25/09: $113.62 out, $212.40 pending listed but not counted", () => {
    const r = rangeSummary(days, "2026-09-25", "2026-09-25");
    expect(r.moneyOut).toBe(113.62);
    expect(r.pending).toBe(212.4);
    expect(days.find((x) => x.date === "2026-09-25")!.items.filter((i) => i.status === "pending").map((i) => i.name).sort()).toEqual(["JB Hi-Fi", "Woolworths"]);
  });
  it("pay cycles come from the detected paydays", () => {
    expect(payCycleRanges(d)).toEqual({ last: ["2026-09-03", "2026-09-16"], this: ["2026-09-17", "2026-09-30"] });
  });
});

describe("pending is never in totals or balances (all personas)", async () => {
  for (const d of await all()) {
    it(`${d.id}: each day's balance = the day before + money in − money out (pending left out)`, () => {
      const days = calendarDays(d);
      for (let i = 1; i < days.length; i++) {
        const a = days[i - 1]!, b = days[i]!;
        if (a.balance === null || b.balance === null) continue;
        expect(sumMoney([a.balance, b.moneyIn, -b.moneyOut]), b.date).toBe(b.balance);
      }
    });
    it(`${d.id}: money in and out leave pending out`, () => {
      for (const x of calendarDays(d)) {
        const counted = x.items.filter((i) => i.status !== "pending");
        expect(x.moneyOut).toBe(sumMoney(counted.filter((i) => i.amount < 0).map((i) => -i.amount)));
        expect(x.pending).toBe(sumMoney(x.items.filter((i) => i.status === "pending").map((i) => -i.amount)));
      }
    });
  }
});

describe("everyday-spend average", () => {
  it("averages everyday spending a day over the days with data", () => {
    const days = [day("2026-09-01", 0, { everyday: 50 }), day("2026-09-02", 0, { everyday: 0 }), day("2026-09-03", 0, { everyday: 41 })];
    expect(everydayAverage(days, "2026-09-01", "2026-09-03")).toBe(30);
    expect(everydayAverage(days, "2026-08-01", "2026-09-01")).toBe(50);
    expect(everydayAverage([], "2026-09-01", "2026-09-03")).toBe(0);
  });
  it("leaves out rent, loan repayments, bills, BNPL, pay-advance repayments and pending", async () => {
    const d = await load("jess");
    const x = calendarDays(d).find((y) => y.date === "2026-09-25")!; // ATM $58.89 + Uber $47.05 + McDonald's $7.68; pending $212.40 left out
    expect(x.everyday).toBe(113.62);
    const rent = calendarDays(d).find((y) => y.date === "2026-09-18")!; // rent $820 + Uber Eats $21.33
    expect(rent.everyday).toBe(21.33);
  });
});

describe("month grid", () => {
  it("whole Monday-to-Sunday weeks; days outside the month marked", () => {
    const g = monthGrid("2026-09");
    expect(g.length % 7).toBe(0);
    expect(g[0]).toEqual({ date: "2026-08-31", inMonth: false }); // a Monday
    expect(g[1]).toEqual({ date: "2026-09-01", inMonth: true });
    expect(g.at(-1)).toEqual({ date: "2026-10-04", inMonth: false }); // a Sunday
    expect(g.filter((c) => c.inMonth)).toHaveLength(30);
  });
});

describe("selection", () => {
  const run = (actions: SelectionAction[], s: Selection = initialSelection("2026-09-25")) => actions.reduce(select, s);
  it("defaults to one day", () => {
    expect(bounds(initialSelection("2026-09-25"))).toEqual(["2026-09-25", "2026-09-25"]);
  });
  it("click (or Enter / Space) picks a day", () => {
    expect(bounds(run([{ type: "press", date: "2026-09-10" }]))).toEqual(["2026-09-10", "2026-09-10"]);
  });
  it("drag picks a run of days, in either direction, and ends on release", () => {
    const s = run([{ type: "press", date: "2026-09-10", drag: true }, { type: "enter", date: "2026-09-12" }, { type: "enter", date: "2026-09-07" }, { type: "release" }, { type: "enter", date: "2026-09-20" }]);
    expect(bounds(s)).toEqual(["2026-09-07", "2026-09-10"]);
    expect(s.dragging).toBe(false);
  });
  it("moving over days without dragging changes nothing", () => {
    expect(bounds(run([{ type: "press", date: "2026-09-10" }, { type: "enter", date: "2026-09-12" }]))).toEqual(["2026-09-10", "2026-09-10"]);
  });
  it("Shift-click extends from the last anchor", () => {
    const s = run([{ type: "press", date: "2026-09-10" }, { type: "press", date: "2026-09-14", shift: true }, { type: "press", date: "2026-09-04", shift: true }]);
    expect(bounds(s)).toEqual(["2026-09-04", "2026-09-10"]);
  });
  it("Select range: tap a start, then an end, and the mode turns off", () => {
    let s = run([{ type: "toggleRange" }]);
    expect(s.rangeMode).toBe(true);
    s = select(s, { type: "press", date: "2026-09-20" });
    expect(s.pendingStart).toBe("2026-09-20");
    s = select(s, { type: "press", date: "2026-09-17" });
    expect(bounds(s)).toEqual(["2026-09-17", "2026-09-20"]);
    expect(s.rangeMode).toBe(false);
    expect(isSelected(s, "2026-09-18")).toBe(true);
    expect(isSelected(s, "2026-09-21")).toBe(false);
  });
  it("turning Select range off before the end tap keeps the start day", () => {
    const s = run([{ type: "toggleRange" }, { type: "press", date: "2026-09-20" }, { type: "toggleRange" }]);
    expect(s).toMatchObject({ rangeMode: false, pendingStart: null, start: "2026-09-20", end: "2026-09-20" });
  });
  it("quick ranges set the range outright (and reset the anchor)", async () => {
    const d = await load("jess");
    const { last } = payCycleRanges(d);
    const s = run([{ type: "toggleRange" }, { type: "set", start: last[0], end: last[1] }]);
    expect(bounds(s)).toEqual(["2026-09-03", "2026-09-16"]);
    expect(s.rangeMode).toBe(false);
    expect(bounds(select(s, { type: "press", date: "2026-09-20", shift: true }))).toEqual(["2026-09-03", "2026-09-20"]);
  });
});
