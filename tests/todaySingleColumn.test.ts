// Today single-column redesign (09/10/2026): Coming up's running balances are the Calendar's forecast; Spending
// compares the same day of the last pay cycle; the change colour has one tunable threshold.
import { describe, expect, it } from "vitest";
import {
  CHANGE_THRESHOLD, changeTone, comingUp, comingUpBlocks, currentBalance, fortnight, FIXED_COMMITMENTS, payCycleSummary, spendingSoFar, totalSpent,
  withMembershipCharge, categoryTotals,
} from "@/lib/selectors";
import { feed } from "@/lib/feed";
import { addDays, daysBetween } from "@/lib/format";
import { all, load } from "./helpers";

describe("Coming up running balances", () => {
  it("every day's last row equals the Calendar's end-of-day forecast (all personas, Tippla's charge included)", async () => {
    for (const raw of await all()) {
      const d = withMembershipCharge(raw);
      const blocks = comingUpBlocks(d, comingUp(d), currentBalance(d));
      const rows = [...blocks.before, ...blocks.paydayRows, ...blocks.after].sort((a, b) => a.date.localeCompare(b.date));
      const cal = new Map([...fortnight(d, 0).days, ...fortnight(d, 1).days].map((x) => [x.date, x.balance]));
      const lastOfDay = new Map(rows.map((r) => [r.date, r.left]));
      for (const [date, left] of lastOfDay) expect(left, `${d.profile.id} ${date}`).toBe(cal.get(date));
    }
  });

  it("Jess: $314 → $262 after Telstra → −$53 after Beforepay (the row that takes her below $0), short $53", async () => {
    const d = withMembershipCharge(await load("jess"));
    const b = comingUpBlocks(d, comingUp(d), currentBalance(d));
    expect(Math.round(b.balanceNow)).toBe(314);
    expect(b.before.map((r) => [r.name, Math.round(r.left), r.takesBelowZero])).toEqual([["Telstra", 262, false], ["Beforepay", -53, true]]);
    expect(Math.round(b.leftBeforePayday)).toBe(Math.round(payCycleSummary(d).leftAfterBills));
    expect(b.paydayRows).toHaveLength(1);
    expect(b.after.find((r) => r.kind === "tippla")).toMatchObject({ date: "2026-10-02", amount: 9.99 });
    expect(b.afterSummary!.lastDate).toBe(b.after.at(-1)!.date);
  });

  it("the Tippla charge is added once, and not while paused", async () => {
    const d = await load("jess");
    const once = withMembershipCharge(withMembershipCharge(d));
    expect(once.derived.upcoming_bills.filter((b) => b.membership)).toHaveLength(1);
    const paused = withMembershipCharge(d, { subscription: { status: "paused", plan: d.profile.tier, effective: d.asOf, at: d.asOf } } as never);
    expect(paused.derived.upcoming_bills.some((b) => b.membership)).toBe(false);
  });
});

describe("Spending so far: the same point of the last pay cycle", () => {
  it("compares day N with day N, never the whole previous cycle", async () => {
    const d = await load("jess");
    const s = spendingSoFar(d, {}, { fixed: FIXED_COMMITMENTS });
    expect(s.day).toBe(daysBetween("2026-09-17", d.asOf) + 1); // day 9
    expect(s.of).toBe(14);
    const prevStart = addDays("2026-09-17", -14);
    const same = { id: "cycle" as const, label: "", start: prevStart, end: addDays(prevStart, s.day - 1), basedOnDays: s.day, limitedByHistory: false };
    expect(s.previous).toBe(totalSpent(d, same));
    const full = { ...same, end: addDays(prevStart, 13) };
    expect(s.previous).not.toBe(totalSpent(d, full));
    expect(s.change).toBe(Math.round((s.total - s.previous!) * 100) / 100);
  });

  it("fixed costs are FIXED_COMMITMENTS; everyday rows are sorted by amount spent; everything adds up", async () => {
    for (const d of await all()) {
      const s = spendingSoFar(d, {}, { fixed: FIXED_COMMITMENTS, n: 4 });
      expect(s.fixed.categories.every((c) => FIXED_COMMITMENTS.includes(c))).toBe(true);
      expect(s.everyday.every((r) => !FIXED_COMMITMENTS.includes(r.category))).toBe(true);
      const amounts = s.everyday.map((r) => r.total);
      expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
      const sum = s.fixed.total + s.everyday.reduce((n, r) => n + r.total, 0) + (s.other?.total ?? 0);
      expect(Math.round(sum * 100)).toBe(Math.round(s.total * 100));
    }
  });

  it("no previous pay cycle in the data: no comparison at all (never zeros)", async () => {
    const d = await load("priya");
    const late = { ...d, profile: { ...d.profile, data_from: "2026-09-20" } };
    const s = spendingSoFar(late, {}, { fixed: FIXED_COMMITMENTS });
    expect(s.previous).toBeNull();
    expect(s.change).toBeNull();
    expect(s.fixed.change).toBeNull();
    expect(s.everyday.every((r) => r.change === null && r.tone === "neutral")).toBe(true);
  });

  it("gambling insights off: gambling isn't named, it counts in Other", async () => {
    const d = await load("jess");
    const s = spendingSoFar(d, {}, { fixed: FIXED_COMMITMENTS, hideGambling: true });
    expect(s.everyday.some((r) => r.category === "gambling")).toBe(false);
    expect(categoryTotals(d, { id: "cycle", label: "", start: "2026-09-17", end: d.asOf, basedOnDays: 9, limitedByHistory: false }).some((r) => r.category === "gambling")).toBe(true);
    expect(s.other).not.toBeNull();
  });
});

describe("change colour threshold", () => {
  it(`colours only changes over ${CHANGE_THRESHOLD.pct * 100}% and over $${CHANGE_THRESHOLD.min}`, () => {
    expect(changeTone(40, 100)).toBe("neutral"); // 40% but under $50
    expect(changeTone(60, 100)).toBe("up"); // over both
    expect(changeTone(-60, 100)).toBe("down");
    expect(changeTone(60, 1000)).toBe("neutral"); // over $50 but only 6%
    expect(changeTone(115, 0)).toBe("up"); // new spending this cycle
    expect(changeTone(50, 100)).toBe("neutral"); // exactly on the line stays grey
  });
});

describe("Needs a look leaves out what the hero says", () => {
  it("Jess: the shortfall is in the feed for notifications, not in Needs a look or its counts", async () => {
    const d = await load("jess");
    const f = feed({ d, edits: {}, account: {} });
    expect(f.open.some((i) => i.type === "shortfall")).toBe(true);
    expect(f.shown.some((i) => i.type === "shortfall")).toBe(false);
    expect(Object.values(f.bySection).reduce((a, b) => a + b, 0)).toBe(f.shown.length);
  });
});
