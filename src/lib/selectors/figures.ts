// One calculation for each number that more than one page shows (journeys brief, 12/10/2026). Today, Calendar,
// Money plan, Spending and Borrowing all read these, so a figure never reads two ways:
//   short before payday   bills only (Today's headline) and with usual everyday spending (labelled), same engine
//   repayments            every recurring loan, BNPL and pay-advance repayment, normalised to one pay cycle
//   lender count          distinct providers in the above, saying whether pay advances are included
//   loan balance          Borrowing's estimate (TaleFin), labelled "estimated", or not available
//   forecast              calendarDays: bills and pay only; withEveryday adds the usual everyday spending a day
import type { PersonaData } from "@/lib/api/types";
import { addDays, daysBetween, type ISODate } from "@/lib/format/dates";
import { cents, sumMoney } from "@/lib/format/money";
import { calendarDays, everydayAverage, type CalDay } from "./calendarMonth";
import { activeLoans, loanTotals } from "./loans";
import { lenders as lenderList, type Lender } from "./moneyPlan";
import { payCycleSummary } from "./payCycle";
import type { CategoryOverrides } from "./transactions";

/** How many days of history the "usual everyday spending a day" is averaged over. */
export const EVERYDAY_WINDOW_DAYS = 42;

/** Usual everyday spending a day (whole dollars): the last EVERYDAY_WINDOW_DAYS of posted everyday debits. */
export const usualEverydayPerDay = (d: PersonaData, days: CalDay[]) => everydayAverage(days, addDays(d.asOf, -(EVERYDAY_WINDOW_DAYS - 1)), d.asOf);

export interface ForecastDay { date: ISODate; billsOnly: number; withEveryday: number }

/** Future end-of-day balances, both ways: bills and pay only, and with the usual everyday spending taken off each day. */
export function forecastBoth(d: PersonaData, days: CalDay[]): ForecastDay[] {
  const perDay = usualEverydayPerDay(d, days);
  return days.filter((x) => x.isFuture && x.balance !== null).map((x) => ({
    date: x.date, billsOnly: x.balance!, withEveryday: cents(x.balance! - perDay * daysBetween(d.asOf, x.date)),
  }));
}

const lowestIn = (f: ForecastDay[], key: "billsOnly" | "withEveryday", from: ISODate, to: ISODate) =>
  f.filter((x) => x.date >= from && x.date <= to).reduce<ForecastDay | null>((lo, x) => (!lo || x[key] < lo[key] ? x : lo), null);

export interface ShortBeforePayday {
  payday: ISODate;
  /** Today's headline: balance less the bills due before payday. Negative = short. */
  billsOnly: number;
  /** The lowest balance before payday once the usual everyday spending is taken off too. */
  withEveryday: { balance: number; date: ISODate } | null;
  everydayPerDay: number;
}

export function shortBeforePayday(d: PersonaData, overrides?: CategoryOverrides, days = calendarDays(d, overrides)): ShortBeforePayday {
  const payday = d.derived.pay_cycle.next_payday;
  const low = lowestIn(forecastBoth(d, days), "withEveryday", addDays(d.asOf, 1), addDays(payday, -1));
  return {
    payday,
    billsOnly: payCycleSummary(d, overrides).leftAfterBills,
    withEveryday: low ? { balance: low.withEveryday, date: low.date } : null,
    everydayPerDay: usualEverydayPerDay(d, days),
  };
}

/** The lowest forecast balance in a range, both ways (Calendar's range panel). */
export function lowestBoth(d: PersonaData, days: CalDay[], from: ISODate, to: ISODate) {
  const f = forecastBoth(d, days);
  const a = lowestIn(f, "billsOnly", from, to), b = lowestIn(f, "withEveryday", from, to);
  return a && b ? { billsOnly: { balance: a.billsOnly, date: a.date }, withEveryday: { balance: b.withEveryday, date: b.date } } : null;
}

export interface Repayments {
  /** Every lender, BNPL provider and pay-advance provider still being repaid, biggest first. */
  lenders: Lender[];
  /** All of them, a pay cycle. */
  perCycle: number;
  /** Distinct providers, pay advances included. */
  count: number;
  /** Of which pay-advance providers. */
  advanceProviders: number;
}

export function repayments(d: PersonaData, overrides?: CategoryOverrides): Repayments {
  const ls = lenderList(d, overrides);
  return { lenders: ls, perCycle: sumMoney(ls.map((l) => l.perCycle)), count: ls.length, advanceProviders: ls.filter((l) => l.kind === "advance").length };
}

export type LoanBalance =
  | { kind: "estimate"; amount: number }
  /** TaleFin gives one balance for all small loans (SACC): shared with these other lenders. */
  | { kind: "shared"; amount: number; with: string[] }
  | { kind: "none" };

/** Borrowing's balance estimate for a provider, the same everywhere it's shown. */
export function loanBalance(d: PersonaData, provider: string): LoanBalance {
  const loans = activeLoans(d);
  const l = loans.find((x) => x.provider === provider);
  if (!l) return { kind: "none" };
  if (l.estimatedBalance !== null) return { kind: "estimate", amount: l.estimatedBalance };
  const saccs = loans.filter((x) => x.type === "SACC");
  const total = loanTotals(d).saccOutstanding;
  if (l.type === "SACC" && saccs.length > 1 && total > 0) return { kind: "shared", amount: total, with: saccs.filter((x) => x.provider !== provider).map((x) => x.provider) };
  return { kind: "none" };
}

/** The small loans that share one balance, by name (Borrowing's "About $1,060 left across Nimble and Cash Train"). */
export function sharedSmallLoans(d: PersonaData): { amount: number; providers: string[] } | null {
  const saccs = activeLoans(d).filter((x) => x.type === "SACC");
  const amount = loanTotals(d).saccOutstanding;
  return saccs.length > 1 && amount > 0 ? { amount, providers: saccs.map((x) => x.provider) } : null;
}
