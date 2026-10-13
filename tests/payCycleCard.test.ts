// The Money plan "last pay cycle" card (13/10/2026): largest-remainder squares, the grouping and the debt share.
import { describe, expect, it } from "vitest";
import { cycleBefore, largestRemainder, moneyWent, payCycleCard, waffleTotal, type MoneyWent } from "@/lib/selectors";
import { load } from "./helpers";

const sum = (a: number[]) => a.reduce((s, n) => s + n, 0);

describe("largestRemainder", () => {
  it("totals under 100%: the counts add up exactly", () => {
    const c = largestRemainder([500, 300, 33], 83);
    expect(sum(c)).toBe(83);
    expect(c).toEqual([50, 30, 3]);
  });
  it("totals over 100%: Jess's 111 squares, as the mockup", () => {
    // Rent, everyday, bills, gambling, loans, Beforepay (card order).
    const c = largestRemainder([820, 432.2, 77.77, 385, 374.97, 315], 111);
    expect(sum(c)).toBe(111);
    expect(c).toEqual([38, 20, 4, 18, 17, 14]);
  });
  it("a single category takes every square", () => {
    expect(largestRemainder([123.45], 57)).toEqual([57]);
  });
  it("zero categories, or nothing to split", () => {
    expect(largestRemainder([], 40)).toEqual([]);
    expect(largestRemainder([0, 0], 40)).toEqual([0, 0]);
    expect(largestRemainder([10, 20], 0)).toEqual([0, 0]);
  });
  it("ties in remainders go to the earlier category", () => {
    expect(largestRemainder([1, 1, 1], 4)).toEqual([2, 1, 1]);
    expect(largestRemainder([1, 1, 1, 1], 6)).toEqual([2, 2, 1, 1]);
  });
  it("waffle total is spending as a whole % of pay", () => {
    expect(waffleTotal(2404.94, 2166.66)).toBe(111);
    expect(waffleTotal(50, 100)).toBe(50);
    expect(waffleTotal(10, 0)).toBe(0);
  });
});

describe("payCycleCard", () => {
  it("Jess: 111 squares, essentials then debt & gambling, $1,075 (about half her pay), the Beforepay advance", async () => {
    const d = await load("jess");
    const c = payCycleCard(moneyWent(d, cycleBefore(d, 1)));
    expect(c.squares).toBe(111);
    expect(c.groups.map((g) => [g.id, Math.round(g.total), g.items.map((i) => [i.group, i.squares])])).toEqual([
      ["essentials", 1330, [["rent", 38], ["everyday", 20], ["bills", 4]]],
      ["debt", 1075, [["gambling", 18], ["loans", 17], ["advance", 14]]],
    ]);
    expect(Math.round(c.heavy!.shareOfPay * 100)).toBe(50);
    expect(c.advance).toEqual({ date: "2026-09-10", amount: 300, provider: "Beforepay" });
  });
  it("no debt or gambling: one group and no debt share; empty categories are left out", () => {
    const w: MoneyWent = {
      cycle: { start: "2026-09-03", end: "2026-09-16" } as MoneyWent["cycle"], paid: 2000, spent: 1200, net: 800, advances: [],
      groups: [{ group: "rent", total: 900, shareOfPay: 0.45, merchants: ["Rent"] }, { group: "everyday", total: 300, shareOfPay: 0.15, merchants: ["Coles"] }],
    };
    const c = payCycleCard(w);
    expect(c.groups.map((g) => g.id)).toEqual(["essentials"]);
    expect(c.groups[0]!.items.map((i) => [i.group, i.squares])).toEqual([["rent", 45], ["everyday", 15]]);
    expect([c.squares, c.heavy, c.advance]).toEqual([60, null, null]);
  });
  it("a very large overspend: every square still accounted for", () => {
    const w: MoneyWent = {
      cycle: { start: "2026-09-03", end: "2026-09-16" } as MoneyWent["cycle"], paid: 1000, spent: 1630, net: -630, advances: [],
      groups: [{ group: "rent", total: 800, shareOfPay: 0.8, merchants: [] }, { group: "gambling", total: 830, shareOfPay: 0.83, merchants: [] }],
    };
    const c = payCycleCard(w);
    expect(c.squares).toBe(163);
    expect(sum(c.groups.flatMap((g) => g.items.map((i) => i.squares)))).toBe(163);
  });
});
