import type { ArrayMetricValue, PercentMetricValue, PersonaData } from "@/lib/api/types";
import { metric } from "@/lib/dataUse";
import { addDays, daysBetween } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { posted } from "./transactions";

/** SACC = small loan; MACC = medium loan; AOCC = other credit; NON_SACC when TaleFin can't say which. */
export type LoanType = "SACC" | "MACC" | "AOCC" | "NON_SACC";

export interface LenderActivity {
  /** Total debited by this lender in the last 90 days, and how many repayments. */
  repaid90: number;
  repayments90: number;
  lastRepayment: { date: string; amount: number } | null;
  /** Where the per-lender figure came from. "class_total" = TaleFin's class metric, valid because the class has one lender. */
  source: "transactions" | "class_total";
}

export interface Loan {
  provider: string;
  type: LoanType;
  repayment: number;
  cadenceDays: number | null;
  nextDue: string | null;
  lastPaid: string;
  /**
   * Estimated balance. TaleFin only gives class totals (AM2024 SACC, AM2132 non-SACC), so a per-loan
   * figure exists only when a class has one active loan. Otherwise null: show the class total instead.
   */
  estimatedBalance: number | null;
  activity: LenderActivity;
}

export interface OtherCredit { provider: string; kind: "bnpl" | "wage_advance"; repayment: number; cadenceDays: number | null; nextDue: string | null }

function repaymentsBy(d: PersonaData, category: "loan_repayment" | "bnpl" | "wage_advance") {
  const m = new Map<string, { amounts: number[]; dates: string[] }>();
  for (const t of posted(d.transactions).filter((x) => x.category === category && x.amount < 0)) {
    const r = m.get(t.merchant) ?? { amounts: [], dates: [] };
    r.amounts.push(-t.amount);
    r.dates.push(t.date);
    m.set(t.merchant, r);
  }
  return m;
}

/** The type of each lender, from TaleFin's provider lists plus the class counts. */
function lenderTypes(d: PersonaData): Map<string, LoanType> {
  const { lenders } = d.bankStatement;
  const macc = metric<number>(d.bankStatement, "AM2173");
  const aocc = metric<number>(d.bankStatement, "AM2174");
  const nonSaccType: LoanType = macc > 0 && aocc === 0 ? "MACC" : aocc > 0 && macc === 0 ? "AOCC" : "NON_SACC";
  const types = new Map<string, LoanType>();
  lenders.sacc.filter((l) => l.status !== "settled").forEach((l) => types.set(l.provider, "SACC"));
  lenders.nonSacc.forEach((p) => types.set(p, nonSaccType));
  return types;
}

/** TaleFin class debit metric for a loan type (AM2044 SACC, AM2045 MACC, AM2046 AOCC). */
function classDebits(d: PersonaData, type: LoanType): ArrayMetricValue["90"] | undefined {
  const code = type === "SACC" ? "AM2044" : type === "MACC" ? "AM2045" : type === "AOCC" ? "AM2046" : null;
  return code ? metric<ArrayMetricValue>(d.bankStatement, code)["90"] : undefined;
}

export function activeLoans(d: PersonaData): Loan[] {
  const types = lenderTypes(d);
  const since90 = addDays(d.asOf, -89);
  const loans: Loan[] = [];
  for (const [provider, r] of repaymentsBy(d, "loan_repayment")) {
    const type = types.get(provider);
    if (!type) continue;
    const lastPaid = r.dates.at(-1)!;
    const upcoming = d.derived.upcoming_bills.find((b) => b.merchant === provider);
    if (!upcoming && daysBetween(lastPaid, d.asOf) > 35) continue; // paid off
    const recent = r.dates.map((date, i) => ({ date, amount: r.amounts[i]! })).filter((x) => x.date >= since90);
    loans.push({
      provider, type, repayment: r.amounts.at(-1)!, cadenceDays: upcoming?.cadence_days ?? null,
      nextDue: upcoming?.date ?? null, lastPaid, estimatedBalance: null,
      activity: {
        repaid90: sumMoney(recent.map((x) => x.amount)),
        repayments90: recent.length,
        lastRepayment: recent.at(-1) ?? null,
        source: "transactions",
      },
    });
  }
  const sacc = metric<number | null>(d.bankStatement, "AM2024") ?? 0;
  const nonSacc = metric<number | null>(d.bankStatement, "AM2132") ?? 0;
  const saccs = loans.filter((l) => l.type === "SACC");
  const others = loans.filter((l) => l.type !== "SACC");
  if (saccs.length === 1) saccs[0]!.estimatedBalance = sacc;
  if (others.length === 1) others[0]!.estimatedBalance = nonSacc;
  return loans;
}

/**
 * Lender activity from TaleFin's summary alone (no transaction feed): exact per lender only when the
 * class has one lender; otherwise null (show the class total). Used when transactions aren't available.
 */
export function lenderActivityFromSummary(d: PersonaData, provider: string): LenderActivity | null {
  const type = lenderTypes(d).get(provider);
  if (!type) return null;
  const sameClass = [...lenderTypes(d).values()].filter((t) => t === type).length;
  const v = classDebits(d, type);
  if (sameClass !== 1 || !v || !v.count) return null;
  return { repaid90: v.sum_amount, repayments90: v.count, lastRepayment: v.latest ? { date: v.latest, amount: v.mean_amount ?? 0 } : null, source: "class_total" };
}

export function otherCredit(d: PersonaData): OtherCredit[] {
  const out: OtherCredit[] = [];
  for (const kind of ["bnpl", "wage_advance"] as const) {
    for (const [provider, r] of repaymentsBy(d, kind)) {
      const upcoming = d.derived.upcoming_bills.find((b) => b.merchant === provider);
      if (!upcoming && daysBetween(r.dates.at(-1)!, d.asOf) > 35) continue;
      out.push({ provider, kind, repayment: upcoming?.expected_amount ?? r.amounts.at(-1)!, cadenceDays: upcoming?.cadence_days ?? null, nextDue: upcoming?.date ?? null });
    }
  }
  // A pay advance received but not yet repaid still counts.
  for (const b of d.derived.upcoming_bills.filter((x) => x.category === "wage_advance"))
    if (!out.some((o) => o.provider === b.merchant))
      out.push({ provider: b.merchant, kind: "wage_advance", repayment: b.expected_amount, cadenceDays: b.cadence_days, nextDue: b.date });
  return out;
}

export function loanTotals(d: PersonaData) {
  const dti = metric<PercentMetricValue>(d.bankStatement, "AM2069");
  const sacc = metric<number | null>(d.bankStatement, "AM2024") ?? 0;
  const nonSacc = metric<number | null>(d.bankStatement, "AM2132") ?? 0;
  const debits = (code: "AM2044" | "AM2045" | "AM2046" | "AM2139" | "AM2128") => metric<ArrayMetricValue>(d.bankStatement, code)["90"]?.sum_amount ?? 0;
  return {
    saccOutstanding: sacc,
    nonSaccOutstanding: nonSacc,
    totalOutstanding: sumMoney([sacc, nonSacc]),
    counts: {
      sacc: metric<number>(d.bankStatement, "AM2172"),
      macc: metric<number>(d.bankStatement, "AM2173"),
      aocc: metric<number>(d.bankStatement, "AM2174"),
      payAdvanceProviders: metric<number>(d.bankStatement, "AM2175"),
    },
    /** Debited by class over the last 90 days (TaleFin summary; works without a transaction feed). */
    repaid90: { sacc: debits("AM2044"), macc: debits("AM2045"), aocc: debits("AM2046"), payAdvances: debits("AM2139"), bnpl: debits("AM2128") },
    /** "Debt repayments as a share of income", 90 days. No target badge. */
    debtToIncomePct90: dti["90"],
  };
}

/** Dishonours as plain facts (AM2011). */
export function dishonours90(d: PersonaData): { count: number; latest: string | null } {
  const v = metric<ArrayMetricValue>(d.bankStatement, "AM2011")["90"];
  return { count: v?.count ?? 0, latest: v?.latest ?? null };
}
