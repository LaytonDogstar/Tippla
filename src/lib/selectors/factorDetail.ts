import type { ArrayMetricValue, FactorKey, PersonaData } from "@/lib/api/types";
import { metric } from "@/lib/dataUse";
import { drivers as c } from "@/content/factors";
import { weekdayLong } from "@/content/en-AU";
import { formatDayMonth, formatPercent, formatWhole } from "@/lib/format";
import { sumMoney } from "@/lib/format/money";
import { daysOverdrawn90, lowestBalance90 } from "./balance";
import { gamblingInsight } from "./gambling";
import { incomeStreams, monthlyIncome, payPattern } from "./income";
import { activeLoans, dishonours90, loanTotals, otherCredit, payAdvanceRun } from "./loans";
import { payCycleSummary } from "./payCycle";

export interface DriverFact { text: string; sample?: boolean }

const names = (xs: string[]) => xs.join(", ");

/** Plain facts behind a factor, each with its period. Values flagged `sample` are open-question placeholders. */
export function factorDrivers(d: PersonaData, key: FactorKey): DriverFact[] {
  if (d.score?.breakdown[key] === null || !d.score) return [{ text: c.nullFactor }];
  switch (key) {
    case "LOAN_AMOUNT_AND_TYPE": {
      const loans = activeLoans(d), t = loanTotals(d);
      const sacc = loans.filter((l) => l.type === "SACC"), non = loans.filter((l) => l.type !== "SACC");
      const out: DriverFact[] = [];
      if (sacc.length) out.push({ text: c.loans.sacc(sacc.length, names(sacc.map((l) => l.provider)), formatWhole(t.saccOutstanding)) });
      if (non.length) out.push({ text: c.loans.nonSacc(non.length, non.every((l) => l.type === "MACC") ? c.loans.mediumLoan(non.length) : c.loans.otherCredit, names(non.map((l) => l.provider)), formatWhole(t.nonSaccOutstanding)) });
      const run = payAdvanceRun(d);
      if (run && run.count >= 2) out.push({ text: c.loans.payAdvance(run.provider, formatDayMonth(run.since)) });
      if (!out.length) out.push({ text: c.loans.none });
      return out;
    }
    case "ADVERSE_SPEND": {
      const g = gamblingInsight(d);
      const alcohol = metric<{ category_id: number; monthly_mean_90_days: number | null }[]>(d.bankStatement, "AM2151").find((x) => x.category_id === 23)?.monthly_mean_90_days;
      const out: DriverFact[] = g ? [{ text: c.gambling.share(formatPercent(g.pctOfIncome90)) }, { text: c.gambling.total(formatWhole(g.deposits90)) }] : [{ text: c.gambling.none }];
      if (alcohol) out.push({ text: c.gambling.alcohol(formatWhole(alcohol)) });
      return out;
    }
    case "DISPOSABLE_INCOME": {
      const pc = payCycleSummary(d), t = loanTotals(d);
      return [
        { text: pc.isShort ? c.moneyLeft.short(formatWhole(-pc.leftAfterBills)) : c.moneyLeft.left(formatWhole(pc.leftAfterBills)) },
        ...(t.debtToIncomePct90 !== null ? [{ text: c.moneyLeft.dti(formatPercent(t.debtToIncomePct90, 0)) }] : []),
        { text: c.moneyLeft.lowest(formatWhole(lowestBalance90(d))) },
      ];
    }
    case "MISSED_PAYMENT": {
      const x = dishonours90(d);
      return [
        { text: x.count && x.latest ? c.payments.failed(x.count, formatDayMonth(x.latest)) : c.payments.none },
        { text: c.payments.overdrawn(daysOverdrawn90(d)) },
      ];
    }
    case "RELIABLE_PAYMENT_HISTORY": {
      const v = metric<ArrayMetricValue>(d.bankStatement, "AM2011")["180"];
      return [{ text: c.track.history(d.profile.data_days) }, { text: c.track.failed180(v?.count ?? 0) }];
    }
    case "INCOME": {
      const p = payPattern(d), streams = incomeStreams(d);
      const irregular = metric<Record<string, boolean>>(d.bankStatement, "AM2110")["90"];
      const out: DriverFact[] = [];
      if (p.typicalAmount && p.weekday && p.everyDays === 14) out.push({ text: c.income.pattern(formatWhole(p.typicalAmount), weekdayLong[p.weekday] ?? p.weekday) });
      if (streams.length > 1) out.push({ text: c.income.sources(streams.length) });
      const mi = monthlyIncome(d);
      if (mi.amount > 0) out.push({ text: c.income.monthly(formatWhole(mi.amount)) });
      for (const x of mi.excluded) out.push({ text: c.income.oneOff(formatWhole(x.amount), formatDayMonth(x.date)) });
      out.push({ text: irregular ? c.income.irregular : c.income.steady });
      out.push({ text: c.income.mix });
      return out;
    }
    case "CASH_SPEND": {
      const v = metric<ArrayMetricValue>(d.bankStatement, "AM2020")["90"];
      return [{ text: v && v.count ? c.cash.atm(formatWhole(v.sum_amount), v.count) : c.cash.none }];
    }
    case "PRODUCTIVE_SPEND": {
      const living = metric<ArrayMetricValue>(d.bankStatement, "AM2008")["90"]?.sum_amount ?? 0;
      const all = metric<ArrayMetricValue>(d.bankStatement, "AM2004")["90"]?.sum_amount ?? 0;
      return [
        // What TaleFin measures here is still open (Q2): the driver carries the dev-only Sample logic tag, and no
        // placeholder line reaches customers (UX round 2, 1.4).
        ...(all ? [{ text: c.mix.essentials(formatPercent((living / all) * 100, 0)), sample: true }] : [{ text: c.mix.none, sample: true }]),
      ];
    }
    case "GOVERNMENT_RELIANCE":
      return [{ text: c.income.mix }];
  }
}

/** BNPL and pay-advance providers named, for the borrowing factor's context. */
export const otherCreditNames = (d: PersonaData) => names(otherCredit(d).map((o) => o.provider));
export const totalRepaid90 = (d: PersonaData) => sumMoney(activeLoans(d).map((l) => l.activity.repaid90));
