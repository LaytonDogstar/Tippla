import type { FactorKey, PersonaData } from "@/lib/api/types";
import { factorCopy } from "@/content/en-AU";
import { insightCopy } from "@/content/insights";
import { recs } from "@/content/recommendations";
import { addDays, formatDayMonth, formatWhole } from "@/lib/format";
import { sumMoney } from "@/lib/format/money";
import type { ArrayMetricValue } from "@/lib/api/types";
import { metric } from "@/lib/dataUse";
import { gamblingInsight } from "./gambling";
import { activeLoans, dishonours90, payAdvanceRun } from "./loans";
import { payCycleSummary } from "./payCycle";
import { factors } from "./score";
import { subscriptions } from "./subscriptions";
import { posted } from "./transactions";

export interface Recommendation {
  id: string;
  factorKey: FactorKey;
  factor: string;
  title: string;
  why: string;
  /** Dollar impact as a fact (computed). Score-point projections are a separate, flagged placeholder (Q3). */
  impact: string | null;
  /** Dollars per pay cycle used for ordering (0 when not money-shaped). */
  dollarsPerCycle: number;
  /** True for no-cost steps (preferred when short before payday). */
  noCost: boolean;
  action: { label: string; href: string };
  sheet: { happening: string; wouldChange: string; ifYouWant?: string };
}

/**
 * Ordered steps for "Ways to lift your score". Order: no-cost steps first when short before payday (docs/04),
 * then by dollars per pay cycle, then by how low the factor is. GOVERNMENT_RELIANCE never gets a recommendation.
 */
export function recommendations(d: PersonaData): Recommendation[] {
  if (!d.score || d.score.score === null) return [];
  const value = (k: FactorKey) => factors(d).find((f) => f.key === k)?.value ?? null;
  const isLowest = (k: FactorKey) => {
    const v = value(k);
    return v !== null && factors(d).every((f) => f.value === null || f.value >= v);
  };
  const out: Recommendation[] = [];

  const run = payAdvanceRun(d);
  if (run && run.count >= 2 && run.fee) {
    const c = insightCopy.payAdvance(formatWhole(run.amount), run.provider, formatDayMonth(run.since), formatWhole(run.fee));
    out.push({
      id: "pay-advance", factorKey: "LOAN_AMOUNT_AND_TYPE", factor: factorCopy.LOAN_AMOUNT_AND_TYPE.name, title: recs.payAdvance.title,
      why: recs.payAdvance.why(formatWhole(run.amount), run.provider, formatDayMonth(run.since), formatWhole(run.fee)),
      impact: recs.payAdvance.impact(formatWhole(run.fee)), dollarsPerCycle: run.fee, noCost: true,
      action: { label: recs.payAdvance.action, href: "/calendar" },
      sheet: { happening: c.happening, wouldChange: c.wouldChange, ifYouWant: c.ifYouWant },
    });
  }

  const sacc = activeLoans(d).filter((l) => l.type === "SACC").sort((a, b) => b.repayment - a.repayment);
  if (sacc[0] && (value("LOAN_AMOUNT_AND_TYPE") ?? 10) < 7) {
    const l = sacc[0];
    out.push({
      id: `pay-off-${l.provider}`, factorKey: "LOAN_AMOUNT_AND_TYPE", factor: factorCopy.LOAN_AMOUNT_AND_TYPE.name,
      title: recs.smallestLoan.title(l.provider), why: recs.smallestLoan.why(l.provider, formatWhole(l.repayment)),
      impact: recs.smallestLoan.impact(formatWhole(l.repayment)), dollarsPerCycle: l.repayment, noCost: false,
      action: { label: recs.smallestLoan.action, href: "/loans/repayment" },
      sheet: { happening: recs.smallestLoan.why(l.provider, formatWhole(l.repayment)), wouldChange: factorCopy.LOAN_AMOUNT_AND_TYPE.lifts + "." },
    });
  }

  const dis = dishonours90(d);
  if (dis.count && dis.latest) {
    const since = addDays(d.asOf, -89);
    const fees = sumMoney(posted(d.transactions).filter((t) => t.subcategory === "dishonour" && t.date >= since).map((t) => -t.amount));
    out.push({
      id: "failed-payments", factorKey: "MISSED_PAYMENT", factor: factorCopy.MISSED_PAYMENT.name, title: recs.failedPayments.title,
      why: recs.failedPayments.why(dis.count, formatDayMonth(dis.latest)), impact: fees ? recs.failedPayments.impact(formatWhole(fees)) : null,
      dollarsPerCycle: fees / 6.4, noCost: true, action: { label: recs.failedPayments.action, href: "/calendar" },
      sheet: { happening: recs.failedPayments.why(dis.count, formatDayMonth(dis.latest)), wouldChange: factorCopy.MISSED_PAYMENT.lifts + "." },
    });
  }

  const g = gamblingInsight(d);
  if (g && (value("ADVERSE_SPEND") ?? 10) < 7) {
    const c = insightCopy.gambling("", null);
    out.push({
      id: "gambling", factorKey: "ADVERSE_SPEND", factor: factorCopy.ADVERSE_SPEND.name, title: recs.gambling.title, why: recs.gambling.why,
      impact: recs.gambling.impact(formatWhole(g.deposits90)), dollarsPerCycle: 0, noCost: true,
      action: { label: recs.gambling.action, href: "/hardship" },
      sheet: { happening: recs.gambling.why, wouldChange: c.wouldChange, ifYouWant: c.ifYouWant },
    });
  }

  const cash = metric<ArrayMetricValue>(d.bankStatement, "AM2020")["90"];
  if (cash?.count && (value("CASH_SPEND") ?? 10) < 7) {
    out.push({
      id: "cash", factorKey: "CASH_SPEND", factor: factorCopy.CASH_SPEND.name, title: recs.cash.title, why: recs.cash.why,
      impact: recs.cash.impact(formatWhole(cash.sum_amount)), dollarsPerCycle: 0, noCost: true,
      action: { label: recs.cash.action, href: "/spending?category=cash" },
      sheet: { happening: recs.cash.why, wouldChange: factorCopy.CASH_SPEND.lifts + "." },
    });
  }

  const subs = subscriptions(d);
  if (subs.rows.length >= 2) {
    out.push({
      id: "subscriptions", factorKey: "DISPOSABLE_INCOME", factor: factorCopy.DISPOSABLE_INCOME.name, title: recs.subscriptions.title,
      why: recs.subscriptions.why(subs.rows.length), impact: recs.subscriptions.impact(formatWhole(subs.totalPerPayCycle)),
      dollarsPerCycle: subs.totalPerPayCycle, noCost: true, action: { label: recs.subscriptions.action, href: "/subscriptions" },
      sheet: { happening: recs.subscriptions.why(subs.rows.length), wouldChange: factorCopy.DISPOSABLE_INCOME.lifts + "." },
    });
  }

  const ml = value("DISPOSABLE_INCOME");
  if (ml !== null && !out.some((r) => r.factorKey === "DISPOSABLE_INCOME" && r.id !== "subscriptions") && ml < 7) {
    const pc = payCycleSummary(d);
    out.push({
      id: "money-left", factorKey: "DISPOSABLE_INCOME", factor: factorCopy.DISPOSABLE_INCOME.name, title: isLowest("DISPOSABLE_INCOME") ? recs.moneyLeft.title(ml.toFixed(1)) : recs.moneyLeft.titleNotLowest(ml.toFixed(1)),
      why: recs.moneyLeft.why, impact: pc.isShort ? null : recs.moneyLeft.impact(formatWhole(pc.leftAfterBills)), dollarsPerCycle: 0, noCost: true,
      action: { label: recs.moneyLeft.action, href: "/spending" },
      sheet: { happening: pc.isShort ? recs.moneyLeft.why : `${recs.moneyLeft.impact(formatWhole(pc.leftAfterBills))}.`, wouldChange: recs.moneyLeft.why },
    });
  }

  // Order: when short before payday, no-cost steps first (docs/04); then the lowest factor first; then the
  // step written for that factor (pay advance, money left) before general ones; then dollars per pay cycle.
  const short = payCycleSummary(d).isShort;
  const primary: Record<string, number> = { "pay-advance": 0, "money-left": 0 };
  return out.sort((a, b) =>
    (short ? Number(b.noCost) - Number(a.noCost) : 0) ||
    (value(a.factorKey) ?? 10) - (value(b.factorKey) ?? 10) ||
    (primary[a.id] ?? 1) - (primary[b.id] ?? 1) ||
    b.dollarsPerCycle - a.dollarsPerCycle,
  );
}

export interface FirstAction { id: string; factor: string; title: string; summary: string; happening: string; wouldChange?: string; ifYouWant?: string }

/** The first action on the reveal and "Next thing to do": the top recommendation. */
export function firstAction(d: PersonaData): FirstAction | null {
  const r = recommendations(d)[0];
  if (!r) return null;
  return { id: r.id, factor: r.factor, title: r.title, summary: r.why, happening: r.sheet.happening, wouldChange: r.sheet.wouldChange, ifYouWant: r.sheet.ifYouWant };
}
