import type { PersonaData, UpcomingBill } from "@/lib/api/types";
import { daysBetween } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { currentCycle, type Period } from "./periods";
import { totalSpent } from "./spending";
import { applyOverrides, inPeriod, isIncome, posted, type CategoryOverrides } from "./transactions";
import { currentBalance } from "./balance";

export interface IncomeLine { date: string; source: "wages" | "centrelink" | "other"; payer: string; amount: number }
export interface PayAdvance { date: string; provider: string; amount: number; repayDate: string | null; repayAmount: number | null; fee: number | null }

export interface PayCycleSummary {
  cycle: Period;
  nextPayday: string;
  /** Calendar days from the data date to the next payday (Fri 25/09 → Thu 01/10 = 6). */
  daysToPayday: number;
  spent: number;
  /** Income only (wages and Centrelink). Pay advances are listed separately. */
  paidIn: number;
  incomeLines: IncomeLine[];
  payAdvances: PayAdvance[];
  dueBeforePayday: UpcomingBill[];
  dueTotal: number;
  balance: number;
  /** available balance − bills due before payday. Negative → "About $x short before payday". */
  leftAfterBills: number;
  isShort: boolean;
}

/** Predicted bills after the data date and before the next payday. */
export function billsBeforePayday(d: PersonaData): UpcomingBill[] {
  return d.derived.upcoming_bills.filter((b) => b.date > d.asOf && b.date < d.derived.pay_cycle.next_payday);
}

export const nextBill = (d: PersonaData): UpcomingBill | null => d.derived.upcoming_bills.find((b) => b.date > d.asOf) ?? null;

export function payCycleSummary(d: PersonaData, overrides?: CategoryOverrides): PayCycleSummary {
  const cycle = currentCycle(d);
  const cycleTx = inPeriod(posted(applyOverrides(d.transactions, overrides)), cycle);
  const incomeLines: IncomeLine[] = cycleTx.filter(isIncome).map((t) => ({
    date: t.date,
    source: t.subcategory === "wages" ? "wages" : t.subcategory === "centrelink" ? "centrelink" : "other",
    payer: t.merchant,
    amount: t.amount,
  }));
  const payAdvances: PayAdvance[] = cycleTx
    .filter((t) => t.amount > 0 && t.category === "wage_advance")
    .map((t) => {
      const repay = d.derived.upcoming_bills.find((b) => b.merchant === t.merchant && b.category === "wage_advance" && b.date >= t.date);
      return {
        date: t.date, provider: t.merchant, amount: t.amount,
        repayDate: repay?.date ?? null,
        repayAmount: repay?.expected_amount ?? null,
        fee: repay ? sumMoney([repay.expected_amount, -t.amount]) : null,
      };
    });
  const due = billsBeforePayday(d);
  const dueTotal = sumMoney(due.map((b) => b.expected_amount));
  const balance = currentBalance(d);
  const leftAfterBills = sumMoney([balance, -dueTotal]);
  return {
    cycle,
    nextPayday: d.derived.pay_cycle.next_payday,
    daysToPayday: daysBetween(d.asOf, d.derived.pay_cycle.next_payday),
    spent: totalSpent(d, cycle, overrides),
    paidIn: sumMoney(incomeLines.map((l) => l.amount)),
    incomeLines,
    payAdvances,
    dueBeforePayday: due,
    dueTotal,
    balance,
    leftAfterBills,
    isShort: leftAfterBills < 0,
  };
}
