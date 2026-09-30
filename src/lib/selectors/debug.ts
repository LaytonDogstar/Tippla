// Every selector output for one persona. Feeds the /dev/selectors page and the NEVER_DISPLAY test,
// so anything a screen could show is checked.
import type { PersonaData } from "@/lib/api/types";
import { activeLoans, dishonours90, loanTotals, otherCredit } from "./loans";
import { currentBalance, daysOverdrawn90, lowestBalance90 } from "./balance";
import { dashboardBanner, hardshipTriggered, lenderMatchingOn, visibleOffers } from "./banners";
import { fortnight } from "./calendar";
import { gamblingInsight } from "./gambling";
import { incomeSources, incomeStreams, incomeStreamsFromSummary, monthlyIncome, payPattern } from "./income";
import { sixMonthSpending } from "./monthly";
import { nextBill, payCycleSummary } from "./payCycle";
import { period, PERIOD_IDS, type PeriodId } from "./periods";
import { factors, scoreChange, scoreState, scoreTrend, strongestFactor, topThreeFactors } from "./score";
import { categorySparkline, categoryTotals, merchantsIn, totalSpent } from "./spending";
import { subscriptions } from "./subscriptions";

export function allSelectorOutputs(d: PersonaData) {
  const periods = Object.fromEntries(
    PERIOD_IDS.map((id) => {
      const p = period(d, id);
      const rows = categoryTotals(d, p);
      return [id, {
        period: p,
        totalSpent: totalSpent(d, p),
        categories: rows,
        merchants: Object.fromEntries(rows.map((r) => [r.category, merchantsIn(d, p, r.category)])),
      }];
    }),
  ) as Record<PeriodId, { period: ReturnType<typeof period>; totalSpent: number; categories: ReturnType<typeof categoryTotals>; merchants: Record<string, ReturnType<typeof merchantsIn>> }>;
  const cycleRows = categoryTotals(d, period(d, "this_cycle"));
  return {
    score: {
      state: scoreState(d), change: scoreChange(d), trend: scoreTrend(d), factors: factors(d),
      topThree: topThreeFactors(d), strongest: strongestFactor(d),
    },
    banner: dashboardBanner(d),
    hardshipTriggered: hardshipTriggered(d),
    payCycle: payCycleSummary(d),
    nextBill: nextBill(d),
    sixMonthSpending: sixMonthSpending(d),
    spending: periods,
    sparklines: Object.fromEntries(cycleRows.map((r) => [r.category, categorySparkline(d, r.category)])),
    calendar: fortnight(d),
    income: { monthly: monthlyIncome(d), sources: incomeSources(d), pattern: payPattern(d), streams: incomeStreams(d), streamsFromSummary: incomeStreamsFromSummary(d) },
    balance: { current: currentBalance(d), daysOverdrawn90: daysOverdrawn90(d), lowest90: lowestBalance90(d) },
    loans: { active: activeLoans(d), other: otherCredit(d), totals: loanTotals(d), dishonours90: dishonours90(d) },
    gambling: gamblingInsight(d),
    subscriptions: subscriptions(d),
    offers: { lenderMatchingOn: lenderMatchingOn(d), visible: visibleOffers(d) },
  };
}
