// Phase 6 data states (docs/09): one-off deposit excluded from monthly income; second account; parsing.
import { describe, expect, it } from "vitest";
import { applyDevStates, ONE_OFF, parseDevStates } from "@/lib/dev/states";
import { categoryTotals, currentCycle, factorDrivers, monthlyIncome, oneOffDeposits, totalSpent } from "@/lib/selectors";
import { sumMoney } from "@/lib/format/money";
import { load } from "./helpers";

describe("dev states", async () => {
  const jess = await load("jess");

  it("parses only known states", () => {
    expect(parseDevStates("lapsed,nope,offline,lapsed")).toEqual(["lapsed", "offline"]);
    expect(parseDevStates(undefined)).toEqual([]);
  });

  it("a one-off $4,000 deposit is left out of monthly income, with a note", () => {
    const base = monthlyIncome(jess);
    expect(base.excluded).toEqual([]);
    const d = applyDevStates(jess, ["one_off"]);
    expect(oneOffDeposits(d)).toEqual([expect.objectContaining({ amount: ONE_OFF.amount, date: ONE_OFF.date })]);
    expect(monthlyIncome(d).amount).toBeCloseTo(base.amount, 2);
    expect(factorDrivers(d, "INCOME").map((f) => f.text)).toContain("We've left out a one-off $4,000 deposit on 12/09");
  });

  it("a second account adds its spending and still reconciles", () => {
    const d = applyDevStates(jess, ["two_accounts"]);
    expect(d.bankStatement.profiles[0]!.accounts).toHaveLength(2);
    const c = currentCycle(d);
    expect(sumMoney(categoryTotals(d, c).map((r) => r.total))).toBe(totalSpent(d, c));
    expect(totalSpent(d, c)).toBeGreaterThan(totalSpent(jess, c));
  });

  it("never mutates the fixtures", () => {
    const before = jess.transactions.length;
    applyDevStates(jess, ["one_off", "two_accounts"]);
    expect(jess.transactions.length).toBe(before);
  });
});
