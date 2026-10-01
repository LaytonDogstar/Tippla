import { describe, expect, it } from "vitest";
import { sumMoney } from "@/lib/format/money";
import {
  activeLoans, categoryTotals, currentCycle, historyDays, incomeStreams, incomeStreamsFromSummary, lenderActivityFromSummary,
  loanTotals, monthlyIncome, payCycleSummary, totalSpent, upcomingIncome,
} from "@/lib/selectors";
import type { ArrayMetricValue } from "@/lib/api/types";
import { metric } from "@/lib/dataUse";
import { load } from "./helpers";

describe("when each income comes in", async () => {
  const [jess, marcus, priya] = await Promise.all([load("jess"), load("marcus"), load("priya")]);

  it("Jess: one wage stream, fortnightly Thursdays; pay advances are not income", () => {
    const s = incomeStreams(jess);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ source: "wages", payer: "Harbourside Hospitality Pty", cadence: 14, next: ["2026-10-01", "2026-10-15", "2026-10-29"] });
  });

  it("Marcus: Centrelink (Wed) and wages (Thu) listed side by side", () => {
    const up = upcomingIncome(marcus, "2026-10-09");
    expect(up.map((i) => [i.date, i.source, i.payer, i.amount, i.exact])).toEqual([
      ["2026-10-07", "centrelink", "Centrelink", 412, true],
      ["2026-10-08", "wages", "Southside Logistics", 1350, false],
    ]);
    // Through the end of the next pay cycle (20/10): one of each.
    expect(payCycleSummary(marcus).expectedIncome.map((i) => i.date)).toEqual(["2026-10-07", "2026-10-08"]);
  });

  it("the summary-only estimate agrees with the transaction feed on dates", () => {
    for (const d of [jess, marcus, priya]) {
      const fromTx = incomeStreams(d).map((s) => [s.source, s.next[0]]);
      const fromSummary = incomeStreamsFromSummary(d).map((s) => [s.source, s.next[0]]);
      expect(fromSummary).toEqual(fromTx);
    }
  });

  it("Priya: monthly income is rescaled to her 45 days (TaleFin divides by 90)", () => {
    expect(historyDays(priya, 90)).toBe(45);
    const v = metric<ArrayMetricValue>(priya.bankStatement, "AM2072")["90"]!;
    const m = monthlyIncome(priya);
    expect(m.basedOnDays).toBe(45);
    expect(m.amount).toBeCloseTo((v.sum_amount / 45) * (365 / 12), 6);
    expect(m.amount).toBeGreaterThan(v.monthly_mean_amount * 1.9); // TaleFin's figure is about half
  });
});

describe("what each lender debited", async () => {
  const jess = await load("jess");

  it("per lender from the transaction feed", () => {
    const loans = activeLoans(jess);
    const nimble = loans.find((l) => l.provider === "Nimble")!;
    const direct = jess.transactions.filter((t) => t.merchant === "Nimble" && t.status === "posted" && t.amount < 0 && t.date >= "2026-06-28");
    expect(nimble.activity).toMatchObject({ source: "transactions", repayments90: direct.length, repaid90: sumMoney(direct.map((t) => -t.amount)) });
    expect(nimble.activity.lastRepayment).toEqual({ date: direct.at(-1)!.date, amount: 96 });
  });

  it("from the summary alone: exact when a class has one lender, otherwise not guessed", () => {
    const rr = activeLoans(jess).find((l) => l.provider === "Right Road Finance")!;
    const fromSummary = lenderActivityFromSummary(jess, "Right Road Finance")!;
    expect(fromSummary).toMatchObject({ source: "class_total", repaid90: rr.activity.repaid90, repayments90: rr.activity.repayments90 });
    expect(lenderActivityFromSummary(jess, "Nimble")).toBeNull(); // two small loans share one class total
    expect(loanTotals(jess).repaid90.sacc).toBe(sumMoney(activeLoans(jess).filter((l) => l.type === "SACC").map((l) => l.activity.repaid90)));
  });
});

describe("transfers between the customer's own accounts", async () => {
  const jess = await load("jess");
  it("never count as spending or income", () => {
    const c = currentCycle(jess);
    const withTransfers = {
      ...jess,
      transactions: [
        ...jess.transactions,
        { id: "t1", date: "2026-09-20", description: "TRANSFER TO SAVINGS", merchant: "Transfer", amount: -500, category: "transfer" as const, subcategory: null, is_recurring: false, status: "posted" as const, account_id: 1, balance_after: null },
        { id: "t2", date: "2026-09-20", description: "TRANSFER FROM EVERYDAY", merchant: "Transfer", amount: 500, category: "transfer" as const, subcategory: null, is_recurring: false, status: "posted" as const, account_id: 2, balance_after: null },
      ],
    };
    expect(totalSpent(withTransfers, c)).toBe(totalSpent(jess, c));
    expect(categoryTotals(withTransfers, c).some((r) => (r.category as string) === "transfer")).toBe(false);
    expect(payCycleSummary(withTransfers).paidIn).toBe(payCycleSummary(jess).paidIn);
  });
});

describe("inferring transfers across connected accounts", () => {
  const base = { subcategory: null, is_recurring: false, status: "posted" as const, balance_after: null, merchant: "X" };
  const tx = (id: string, date: string, amount: number, account_id: number, description: string, category: any = "shopping") =>
    ({ ...base, id, date, amount, account_id, description, category });

  it("pairs same-amount debit and credit on different accounts within two days", async () => {
    const { findTransferPairs, applyTransferDetection, possibleUnconnectedTransfers } = await import("@/lib/selectors");
    const list = [
      tx("c", "2026-09-20", -500, 1, "KMART"),           // same amount and day, but the transfer-worded debit wins
      tx("a", "2026-09-20", -500, 1, "TRANSFER TO XX1234 NETBANK"),
      tx("b", "2026-09-21", 500, 2, "TRANSFER FROM XX4821"),
      tx("d", "2026-09-10", -80, 1, "OSKO PAYMENT TO J SMITH"), // transfer-looking, no match: ask the customer
      tx("e", "2026-09-10", 80, 1, "REFUND"),            // same account: never a transfer
      tx("f", "2026-09-25", 1335.06, 2, "SALARY", "income"),
      tx("g", "2026-09-25", -1335.06, 1, "RENT"),        // matches salary's amount, but income is never a transfer
    ];
    expect(findTransferPairs(list).map((m) => [m.debitId, m.creditId])).toEqual([["a", "b"]]);
    const applied = applyTransferDetection(list);
    expect(applied.filter((t) => t.category === "transfer").map((t) => t.id)).toEqual(["a", "b"]);
    expect(possibleUnconnectedTransfers(list).map((t) => t.id)).toEqual(["d"]);
  });

  it("changes nothing for single-account personas", async () => {
    const { findTransferPairs } = await import("@/lib/selectors");
    for (const d of await Promise.all([load("jess"), load("marcus"), load("priya")])) expect(findTransferPairs(d.transactions)).toEqual([]);
  });
});

describe("pay-advance run", async () => {
  const { payAdvanceRun } = await import("@/lib/selectors");
  it("Jess: three fortnightly Beforepay advances since 27/08, $15 fee each", async () => {
    expect(payAdvanceRun(await load("jess"))).toEqual({ provider: "Beforepay", count: 3, since: "2026-08-27", amount: 300, fee: 15 });
  });
  it("Marcus and Priya: none", async () => {
    expect(payAdvanceRun(await load("marcus"))).toBeNull();
    expect(payAdvanceRun(await load("priya"))).toBeNull();
  });
});
