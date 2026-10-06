// P8 Loans: upcoming repayments (predicted from past payments), repayment history, and P9's early
// repayment maths. TaleFin gives no rate or term (Q7): the calculator only uses what the customer confirms.
import type { CategoryId, PersonaData } from "@/lib/api/types";
import { addDays, type ISODate } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { posted } from "./transactions";

export type CreditKind = "loan_repayment" | "bnpl" | "wage_advance";
const CREDIT: CreditKind[] = ["loan_repayment", "bnpl", "wage_advance"];
const isCredit = (c: CategoryId): c is CreditKind => (CREDIT as string[]).includes(c);

export interface UpcomingRepayment { date: ISODate; provider: string; amount: number; kind: CreditKind; predicted: true }

function addMonth(date: ISODate): ISODate {
  const [y, m, day] = date.split("-").map(Number) as [number, number, number];
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

/**
 * Repayments expected in the next `days` days, from the predicted bills and their cadence. A pay advance
 * repayment appears once: the next advance is the customer's choice, so it is never projected.
 */
export function upcomingRepayments(d: Pick<PersonaData, "asOf" | "derived">, days: 30 | 60 | 90): UpcomingRepayment[] {
  const until = addDays(d.asOf, days);
  const out: UpcomingRepayment[] = [];
  for (const b of d.derived.upcoming_bills) {
    if (!isCredit(b.category) || b.date <= d.asOf) continue;
    let date = b.date;
    while (date <= until) {
      out.push({ date, provider: b.merchant, amount: b.expected_amount, kind: b.category, predicted: true });
      if (b.category === "wage_advance") break;
      date = b.cadence_days >= 28 ? addMonth(date) : addDays(date, b.cadence_days);
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.provider.localeCompare(b.provider));
}

export interface HistoryMonth { month: string; total: number; items: { id: string; date: ISODate; provider: string; amount: number; kind: CreditKind }[] }

/** Past repayments (posted debits to lenders, BNPL and pay-advance providers), newest month first. */
export function repaymentHistory(d: Pick<PersonaData, "transactions">): HistoryMonth[] {
  const m = new Map<string, HistoryMonth>();
  for (const t of posted(d.transactions)) {
    if (t.amount >= 0 || !isCredit(t.category)) continue;
    const key = t.date.slice(0, 7);
    const h = m.get(key) ?? { month: key, total: 0, items: [] };
    h.items.push({ id: t.id, date: t.date, provider: t.merchant, amount: -t.amount, kind: t.category });
    h.total = sumMoney([h.total, -t.amount]);
    m.set(key, h);
  }
  return [...m.values()].sort((a, b) => b.month.localeCompare(a.month)).map((h) => ({ ...h, items: h.items.sort((a, b) => b.date.localeCompare(a.date)) }));
}

/** Failed payments as plain facts: the dishonour fees in the transactions, newest first. */
export function failedPayments(d: Pick<PersonaData, "transactions">) {
  const lender = (desc: string) => {
    const m = /DISHONOUR FEE\s*-\s*(.+?)(\s+DD)?$/i.exec(desc);
    return m ? m[1]!.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : null;
  };
  return posted(d.transactions).filter((t) => t.subcategory === "dishonour")
    .map((t) => ({ id: t.id, date: t.date, fee: -t.amount, lender: lender(t.description) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ---- P9 Early repayment calculator ---------------------------------------------------------------

export interface RepaymentInputs {
  balance: number;
  /** Regular repayment and how often it's made. */
  repayment: number;
  cadenceDays: number;
  /** Interest, % a year (0 if the loan only charges fees). */
  ratePct: number;
  /** Flat monthly fee (small loans often charge one instead of interest). */
  monthlyFee: number;
  /** Extra paid each pay cycle (fortnight), on top of the repayment. */
  extraPerCycle: number;
  /** Optional one-off extra payment today (Pro scenario, Q9). */
  lumpSum?: number;
}

export interface RepaymentResult {
  /** null = never paid off at this repayment (it doesn't cover interest and fees). */
  repayments: number | null;
  weeks: number | null;
  payoffDate: ISODate | null;
  interestAndFees: number;
}

const MAX_STEPS = 1300; // 50 years of fortnights: past this it's "not paid off"

/** Simulate repayments day by day in steps of the repayment cadence. Interest accrues daily, fees monthly. */
export function simulateRepayment(i: RepaymentInputs, start: ISODate): RepaymentResult {
  let bal = Math.max(0, i.balance - (i.lumpSum ?? 0));
  if (bal <= 0) return { repayments: 0, weeks: 0, payoffDate: start, interestAndFees: 0 };
  const step = Math.max(1, Math.round(i.cadenceDays));
  const extraPerStep = (i.extraPerCycle * step) / 14;
  const pay = i.repayment + extraPerStep;
  let cost = 0, day = 0, n = 0, feeClock = 0;
  while (bal > 0.005 && n < MAX_STEPS) {
    day += step; n += 1; feeClock += step;
    const interest = (bal * (i.ratePct / 100) * step) / 365;
    let fee = 0;
    while (feeClock >= 30.4) { fee += i.monthlyFee; feeClock -= 30.4; }
    bal += interest + fee;
    cost += interest + fee;
    bal -= pay;
    if (n > 3 && interest + fee >= pay) return { repayments: null, weeks: null, payoffDate: null, interestAndFees: Math.round(cost * 100) / 100 };
  }
  if (bal > 0.005) return { repayments: null, weeks: null, payoffDate: null, interestAndFees: Math.round(cost * 100) / 100 };
  return { repayments: n, weeks: Math.ceil(day / 7), payoffDate: addDays(start, day), interestAndFees: Math.round(cost * 100) / 100 };
}

/** Base plan vs with extra: weeks sooner and interest/fees saved. */
export function compareRepayment(i: RepaymentInputs, start: ISODate) {
  const base = simulateRepayment({ ...i, extraPerCycle: 0, lumpSum: 0 }, start);
  const plan = simulateRepayment(i, start);
  return {
    base, plan,
    weeksSooner: base.weeks !== null && plan.weeks !== null ? Math.max(0, base.weeks - plan.weeks) : null,
    saved: base.weeks !== null && plan.weeks !== null ? Math.max(0, Math.round((base.interestAndFees - plan.interestAndFees) * 100) / 100) : null,
  };
}
