// Today single-column redesign (09/10/2026): Coming up's running balances are the Calendar's forecast; Spending
// compares the same day of the last pay cycle; the change colour has one tunable threshold.
import { describe, expect, it } from "vitest";
import {
  CHANGE_THRESHOLD, changeTone, comingUp, comingUpBlocks, currentBalance, fortnight, payCycleSummary, withMembershipCharge,
} from "@/lib/selectors";
import { feed } from "@/lib/feed";
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
