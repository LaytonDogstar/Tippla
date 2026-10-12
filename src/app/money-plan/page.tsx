// Your money plan (12/10/2026; reference: tippla-money-plan-mockup.dc.html). One column like Today, Spending and
// SmartScore. The server works out every figure from the transactions, recurring payments and pay cycle (selectors in
// lib/selectors/moneyPlan): where the last full pay cycle's money went, the plan with what it would take, the
// repayments, the gambling card (over GAMBLING_CARD_MIN_PER_CYCLE, never when gambling insights are hidden), this
// cycle against the last, and the smaller wins. The client keeps the menus, the per-cycle hides and the ticks.
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import {
  activePlan, availablePlans, calendarDays, currentCycle, cycleBefore, cycleLength, cycleProgress, gamblingCard, lastRefresh, lenders, moneyWent,
  loanBalance, notifications, panelData, payAdvanceRun, shortfallIn, smallerWins, suggestedPlan, unreadCount, whatItWouldTake,
} from "@/lib/selectors";
import { addDays, formatUpdated } from "@/lib/format";
import { moneyPlan as t } from "@/content/moneyPlan";
import { isOn } from "@/config/featureFlags";
import { PortalShell } from "@/components/shell/Portal";
import { TodayHeader } from "@/components/today/TodayHeader";
import { MoneyPlanView } from "./MoneyPlanView";

export const dynamic = "force-dynamic";

export default async function MoneyPlan({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data, account, goal, edits } = await loadCustomer(persona);
  const last = cycleBefore(data, 1);
  const now = currentCycle(data);
  const hasLast = !last.limitedByHistory;
  const went = moneyWent(data, last, edits);
  const days = calendarDays(data, edits);
  const run = payAdvanceRun(data);
  const shortfall = hasLast ? shortfallIn(went, days) : 0;
  const plan = isOn("plans_v1", persona) ? activePlan(data, account, goal) : null;
  const nextStart = data.derived.pay_cycle.next_payday;
  return (
    <PortalShell path="/money-plan" persona={persona} present={present} wide
      header={<TodayHeader title={t.title} sub={formatUpdated(lastRefresh(data).at)} unread={unreadCount(notifications(data, account))}
        ask={isOn("assistant_v1", persona) ? { placeholder: t.askPlaceholder } : null} />}>
      <MoneyPlanView
        persona={persona} account={account} asOf={data.asOf} present={present}
        last={hasLast ? { start: last.start, end: last.end } : null}
        now={{ start: now.start, end: now.end }}
        next={{ start: nextStart, end: addDays(nextStart, 13) }}
        went={hasLast ? went : null}
        nowAdvances={moneyWent(data, now, edits).advances}
        run={run}
        take={hasLast ? whatItWouldTake(shortfall, run?.amount ?? null) : null}
        shortfall={shortfall}
        lenders={lenders(data, edits)}
        balances={Object.fromEntries(lenders(data, edits).map((l) => [l.provider, loanBalance(data, l.provider)]))}
        panels={panelData(data, account, edits, { letter: isOn("hardship_autofill_v1", persona) })}
        gambling={account.hideGambling || !hasLast ? null : gamblingCard(data, went, edits)}
        progress={hasLast ? cycleProgress(data, edits) : null}
        wins={smallerWins(data, cycleLength(now.start, now.end))}
        state={data.profile.state}
        plan={plan} options={availablePlans(data)} suggested={suggestedPlan(data, goal?.type)}
      />
    </PortalShell>
  );
}
