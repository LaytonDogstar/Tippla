import type { ArrayMetricValue, PercentMetricValue, PersonaData } from "@/lib/api/types";
import { metric } from "@/lib/dataUse";
import { daysBetween } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { posted } from "./transactions";

export type LoanType = "SACC" | "MACC" | "AOCC";

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
}

export interface OtherCredit { provider: string; kind: "bnpl" | "wage_advance"; repayment: number; cadenceDays: number | null; nextDue: string | null }

const providers = (d: PersonaData, code: "AM2117" | "AM2120" | "AM2123") =>
  metric<{ provider: string }[]>(d.bankStatement, code).map((p) => p.provider);

/** A loan counts as open if it was repaid in the last 35 days or a repayment is predicted. */
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

export function activeLoans(d: PersonaData): Loan[] {
  const typeOf = new Map<string, LoanType>();
  providers(d, "AM2117").forEach((p) => typeOf.set(p, "SACC"));
  providers(d, "AM2120").forEach((p) => typeOf.set(p, "MACC"));
  providers(d, "AM2123").forEach((p) => typeOf.set(p, "AOCC"));
  const loans: Loan[] = [];
  for (const [provider, r] of repaymentsBy(d, "loan_repayment")) {
    const type = typeOf.get(provider);
    if (!type) continue;
    const lastPaid = r.dates.at(-1)!;
    const upcoming = d.derived.upcoming_bills.find((b) => b.merchant === provider);
    if (!upcoming && daysBetween(lastPaid, d.asOf) > 35) continue; // paid off
    loans.push({
      provider, type, repayment: r.amounts.at(-1)!, cadenceDays: upcoming?.cadence_days ?? null,
      nextDue: upcoming?.date ?? null, lastPaid, estimatedBalance: null,
    });
  }
  const sacc = metric<number>(d.bankStatement, "AM2024");
  const nonSacc = metric<number>(d.bankStatement, "AM2132");
  const saccs = loans.filter((l) => l.type === "SACC");
  const others = loans.filter((l) => l.type !== "SACC");
  if (saccs.length === 1) saccs[0]!.estimatedBalance = sacc;
  if (others.length === 1) others[0]!.estimatedBalance = nonSacc;
  return loans;
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
  return {
    saccOutstanding: metric<number>(d.bankStatement, "AM2024"),
    nonSaccOutstanding: metric<number>(d.bankStatement, "AM2132"),
    totalOutstanding: sumMoney([metric<number>(d.bankStatement, "AM2024"), metric<number>(d.bankStatement, "AM2132")]),
    counts: {
      sacc: metric<number>(d.bankStatement, "AM2172"),
      macc: metric<number>(d.bankStatement, "AM2173"),
      aocc: metric<number>(d.bankStatement, "AM2174"),
      payAdvanceProviders: metric<number>(d.bankStatement, "AM2175"),
    },
    /** "Debt repayments as a share of income", 90 days. No target badge. */
    debtToIncomePct90: dti["90"],
  };
}

/** Dishonours as plain facts (AM2011). */
export function dishonours90(d: PersonaData): { count: number; latest: string | null } {
  const v = metric<ArrayMetricValue>(d.bankStatement, "AM2011")["90"];
  return { count: v?.count ?? 0, latest: v?.latest ?? null };
}
