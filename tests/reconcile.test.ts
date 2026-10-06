// "One source of truth for numbers": totals must agree across every view of the same data.
import { describe, expect, it } from "vitest";
import type { ArrayMetricValue } from "@/lib/api/types";
import { metric } from "@/lib/dataUse";
import { sumMoney } from "@/lib/format/money";
import {
  categoryTotals, currentCycle, debitsIn, lastCycles, payCycleSummary, period, PERIOD_IDS, posted, sixMonthSpending, totalSpent,
} from "@/lib/selectors";
import { all } from "./helpers";

describe("reconciliation", async () => {
  const personas = await all();

  for (const d of personas) {
    describe(d.id, () => {
      it.each(PERIOD_IDS)("category totals sum to total spent (%s)", (id) => {
        const p = period(d, id);
        const rows = categoryTotals(d, p);
        expect(sumMoney(rows.map((r) => r.total))).toBe(totalSpent(d, p));
        if (rows.length) expect(rows.reduce((a, r) => a + r.share, 0)).toBeCloseTo(1, 6);
      });

      it("pay-cycle spent equals the sum of the cycle's posted debits", () => {
        const c = currentCycle(d);
        const direct = sumMoney(
          d.transactions.filter((t) => t.status === "posted" && t.amount < 0 && t.date >= c.start && t.date <= c.end).map((t) => -t.amount),
        );
        expect(payCycleSummary(d).spent).toBe(direct);
      });

      it("pending transactions never count in totals", () => {
        const pend = d.transactions.filter((t) => t.status === "pending");
        expect(pend.length).toBeGreaterThan(0);
        const p = currentCycle(d);
        expect(debitsIn(d, p).some((t) => t.status === "pending")).toBe(false);
      });

      it("TaleFin monthly total debits (AM2004) match the transactions", () => {
        const mv = metric<ArrayMetricValue>(d.bankStatement, "AM2004").monthly_values ?? {};
        for (const v of Object.values(mv)) {
          const fromTx = sumMoney(posted(d.transactions).filter((t) => t.amount < 0 && t.date.startsWith(v.month)).map((t) => -t.amount));
          expect(fromTx, v.month).toBe(v.sum_amount);
        }
      });

      it("six-month bars never show a month without data as $0", () => {
        for (const b of sixMonthSpending(d)) if (b.month < d.profile.data_from.slice(0, 7)) expect(b.total).toBeNull();
      });

      it("left after bills = balance − bills due before payday", () => {
        const s = payCycleSummary(d);
        expect(s.leftAfterBills).toBe(sumMoney([s.balance, -s.dueTotal]));
        expect(s.dueTotal).toBe(sumMoney(s.dueBeforePayday.map((b) => b.expected_amount)));
        expect(s.isShort).toBe(s.leftAfterBills < 0);
      });

      it("paid in counts income only, never pay advances", () => {
        const s = payCycleSummary(d);
        expect(s.incomeLines.every((l) => l.source === "wages" || l.source === "centrelink")).toBe(true);
        expect(s.paidIn).toBe(sumMoney(s.incomeLines.map((l) => l.amount)));
      });

      it("recategorising moves money between categories without changing the total", () => {
        const p = currentCycle(d);
        const tx = debitsIn(d, p).find((t) => t.category !== "groceries");
        if (!tx) return;
        const before = categoryTotals(d, p);
        const after = categoryTotals(d, p, { [tx.id]: "groceries" });
        expect(totalSpent(d, p, { [tx.id]: "groceries" })).toBe(totalSpent(d, p));
        const g = (rows: typeof before, c: string) => rows.find((r) => r.category === c)?.total ?? 0;
        expect(g(after, "groceries")).toBe(sumMoney([g(before, "groceries"), -tx.amount]));
        expect(g(after, tx.category)).toBe(sumMoney([g(before, tx.category), tx.amount]));
      });

      it("pay cycles tile without gaps or overlaps", () => {
        const cycles = lastCycles(d, 6).filter((c) => !c.limitedByHistory);
        for (let i = 1; i < cycles.length; i++) {
          const prevEnd = new Date(cycles[i - 1]!.end + "T00:00:00Z").getTime();
          expect(new Date(cycles[i]!.start + "T00:00:00Z").getTime() - prevEnd).toBe(86_400_000);
        }
      });
    });
  }
});
