// Today (Home, redesign 07/10/2026): the pay-cycle figure first, then what needs a look (ranked, max 3), the
// SmartScore, what's coming up, the plan and spending. Every figure comes from the selectors below.
// Lender offers never appear here: this page is about the customer's own money.
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { goalOptions, goalPlan, dashboardBanner, categoryTotals, comingUp, monthPeriod, scoreTrend, spendGroups, savingsGoalStatus, cycleOfBills, nextBufferStep, stageMoment, streakMilestones, surplusSuggestion, activePlan, publicPlanTitle, connectionHealth, forecastAccuracy, goalLabel, isFirstPayday, recapLead, lastRefresh, cycleRecap, paydayCheckIn, safeToSpendFor, stsOptions, valueTally, notifications, refreshStatus, scoreAttribution, unreadCount, firstAction, payCycleSummary, scoreChange, scoreState, sixMonthSpending } from "@/lib/selectors";
import { addDays, daysBetween, formatDate, formatDayMonth, formatShortDay, formatUpdated, formatWhole, toAESTDate } from "@/lib/format";
import { safeCopy } from "@/content/loop";
import { flagsFor } from "@/config/featureFlags";
import { billId } from "@/lib/account/state";
import { dashboard as t } from "@/content/dashboard";
import { accuracyCopy, healthCopy } from "@/content/corrections";
import { progressCopy as p } from "@/content/progress";
import { savingsCopy } from "@/content/plans";
import { PortalShell } from "@/components/shell/Portal";
import { TodayHeader } from "@/components/today/TodayHeader";
import { todayCopy } from "@/content/today";
import { projectScore } from "@/lib/scoring/estimate";
import { isOn } from "@/config/featureFlags";
import { feed } from "@/lib/feed";
import { HomeView } from "./HomeView";
import { Suspense } from "react";
import { PortalFrame } from "@/components/shell/Shells";
import { TodayHeaderSkeleton, TodaySkeleton } from "@/components/today/TodaySkeleton";

export const dynamic = "force-dynamic";

/** The page shell streams straight away with card-shaped placeholders; the figures replace them when loaded. */
export default function Home({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  return (
    <Suspense fallback={<PortalFrame path="/" persona={persona} present={present} wide header={<TodayHeaderSkeleton />}><TodaySkeleton /></PortalFrame>}>
      <TodayContent searchParams={searchParams} />
    </Suspense>
  );
}

async function TodayContent({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data, raw, account, goal, edits, states } = await loadCustomer(persona);
  // Disconnected by the customer, or (dev state) the connection expired: numbers stopped at the last refresh.
  const expired = states.includes("bank_expired") && data.score?.scoredAt ? toAESTDate(data.score.scoredAt) : null;
  const on = flagsFor(persona);
  const f = feed({ d: data, edits, account, states }, account.feed);
  // Spec 05 connection health: stale data and an ending consent show in the status line, and data older
  // than 72 h pauses safe to spend rather than guess.
  const health = on.connection_health_v1 ? connectionHealth(data, account, states) : null;
  const renewed = !!account.bank?.renewedOn && account.bank.renewedOn >= data.asOf;
  const staleSince = account.bank?.disconnected ? data.asOf : expired && !renewed ? expired : health?.status === "stale" ? health.dataFrom : null;
  const status = refreshStatus(data, f.open.length, { staleSince, expiringOn: health?.status === "expiring" ? health.consentEndsOn : null });
  // Banners become a notice at the top of the hero (same copy): the bank connection stopped, or money's tight.
  // A score drop is covered by the SmartScore card.
  const banner = dashboardBanner(data, { bankExpiredSince: account.bank?.disconnected ? data.asOf : renewed ? null : expired, hardshipSelfSelected: account.hardshipSelfSelected });
  // The hero always offers "Options if money's tight"; the hardship notice is for members who've said money's
  // tight themselves (Profile: "we'll keep these options at the top of Home").
  const notice = !banner || banner.kind === "score_drop" || (banner.kind === "hardship" && !account.hardshipSelfSelected) ? null
    : banner.kind === "hardship" ? { kind: "hardship" as const, text: t.banners.hardship, href: "/hardship" }
    : { kind: "bank" as const, text: account.bank?.disconnected ? t.banners.bankDisconnected : t.banners.bankExpired(formatDate(banner.since)), href: "/account/bank" };
  // Spec 05: data over 72 hours old pauses safe to spend; the hero says so, with Reconnect.
  const pausedNotice = health?.pauseSafeToSpend ? { kind: "bank" as const, text: healthCopy.pausedBody(formatShortDay(health.dataFrom)), action: healthCopy.paused, href: "/account/bank/reconnect?return=/" } : null;
  const checkIn = on.cycle_checkin_v1 ? paydayCheckIn(data, stsOptions(data, account)) : null;
  const recap = on.cycle_recap_v1 && paydayCheckIn(data) ? cycleRecap(data, edits) : null;
  const tally = valueTally(data, account);
  // Fees the customer avoided in the cycle being recapped (confirmed tally items dated in it).
  const feesAvoided = recap ? tally.items.filter((i) => i.kind !== "subscription" && i.date >= recap.cycle.start && i.date <= recap.cycle.end).reduce((a, i) => Math.round((a + i.amount) * 100) / 100, 0) : 0;
  const safe = safeToSpendFor(data, account);
  // "Up $4 since yesterday" (spec 02): against the figure seen on an earlier day; only ever said when it's up.
  const seen = account.stsSeen;
  const base = seen ? (seen.date < data.asOf ? seen : seen.prev) : undefined;
  const movement = base && !safe.nothingSpare && safe.perDay > base.perDay
    ? { up: safe.perDay - base.perDay, since: base.date === addDays(data.asOf, -1) ? safeCopy.yesterday : formatShortDay(base.date) } : null;
  // Check-in adjustments: the predicted bills before next payday (before the member's changes) and one-offs.
  const payday = data.derived.pay_cycle.next_payday;
  const paid = new Set(account.billAdjust?.paid ?? []);
  const adjustBills = raw.derived.upcoming_bills.filter((b) => b.date > data.asOf && b.date < payday)
    .map((b) => ({ id: billId(b), merchant: b.merchant, amount: b.expected_amount, date: b.date, paid: paid.has(billId(b)) }));
  const oneOffDates = Array.from({ length: Math.max(0, daysBetween(data.asOf, payday) - 1) }, (_, i) => addDays(data.asOf, i + 1));
  const next = firstAction(data, goal);
  // Spec 04: the member's goal, shown in the plan card and changed there in a sheet.
  const focusGoal = on.goals_v1 ? {
    current: goal ? { type: goal.type, label: goalLabel(data, goal.type) } : null,
    options: goalOptions(data).map((type) => ({ type, label: goalLabel(data, type) })),
  } : null;
  const plan = goalPlan(data, account.goal);
  const progressText = plan ? (plan.latest ? p.homeGoal(formatWhole(plan.amount), formatDayMonth(plan.by), plan.percent) : p.homeGoalPending(formatWhole(plan.amount), formatDayMonth(plan.by))) : p.homeNoGoal;
  // Spec 05: forecast accuracy (from fresh data only: a stale forecast isn't judged).
  const acc = on.forecast_accuracy_v1 && !staleSince ? forecastAccuracy(data) : null;
  const accuracyLine = acc?.show ? accuracyCopy.line(formatWhole(acc.within), acc.hits, acc.of) : null;
  const miss = acc?.miss && !account.forecastAnswers?.[acc.miss.forDate] ? acc.miss : null;
  const multiPlan = on.plans_v1 ? activePlan(data, account, goal) : null;
  const bars = sixMonthSpending(data, edits);
  const lastMonth = bars.at(-1)?.month ?? data.asOf.slice(0, 7);
  const groups = spendGroups(categoryTotals(data, monthPeriod(data, lastMonth), edits), { hideGambling: account.hideGambling });
  // Spec 01 status line under the greeting (what Tippla checked, what needs a look, or stale data); wider
  // screens add when the data was updated before it.
  const updated = data.score?.scoredAt ? formatUpdated(lastRefresh(data).at) : null;

  return (
    <PortalShell path="/" persona={persona} present={presentationMode(searchParams.present)} wide
      header={<TodayHeader title={t.hi(data.profile.first_name)} sub={on.status_line_v1 ? status.line : updated ?? ""} subBefore={on.status_line_v1 && !status.stale ? updated : null} subHref={status.stale ? "/account/bank" : undefined}
        unread={unreadCount(notifications(data, account))} ask={on.assistant_v1 ? { placeholder: todayCopy.askPlaceholder } : null} />}>
      <HomeView
        persona={persona}
        account={account}
        flags={{ feed: on.feed_v1, safe: on.safe_to_spend_v1, tally: on.value_tally_v1, buffer: on.buffer_v1, corrections: on.corrections_v1, assistant: on.assistant_v1 }}
        checked={status.checked}
        feedItems={f.open}
        attribution={on.score_attribution_v1 ? scoreAttribution(data, { hideGambling: account.hideGambling }) : null}
        asOf={data.asOf}
        score={scoreState(data)}
        change={scoreChange(data)}
        trend={scoreTrend(data)}
        action={next}
        projection={projectScore(data, isOn("score_projection_v1", persona), goal)}
        payCycle={payCycleSummary(data, edits)}
        bars={bars}
        groups={groups}
        coming={comingUp(data, account)}
        lapsed={states.includes("lapsed")}
        safe={safe}
        movement={movement}
        adjustBills={adjustBills}
        oneOffDates={oneOffDates}
        focus={next?.title ?? null}
        goalLabel={focusGoal?.current?.label ?? null}
        focusGoal={focusGoal}
        progressText={progressText}
        firstPayday={!!checkIn && on.onboarding_v2 && isFirstPayday(data, account.onboardedAt)}
        recapLead={recapLead(goal?.type)}
        accuracyLine={accuracyLine}
        miss={miss}
        bufferSteps={on.buffer_v1 ? { extra: [250, cycleOfBills(data)], next: nextBufferStep(data, account.buffer ?? 0) } : null}
        milestones={recap && on.streaks_v1 ? streakMilestones(data) : []}
        surplus={recap && on.buffer_v1 ? surplusSuggestion(data, recap.endBalance, account.buffer ?? 0) : null}
        savingsLines={checkIn && on.savings_goals_v1 ? (account.savingsGoals ?? []).map((g) => savingsGoalStatus(data, g)).filter((g) => !g.reached).map((g) => savingsCopy.checkIn(g.goal.name, formatWhole(g.perCycle))) : []}
        moment={on.streaks_v1 ? stageMoment(data, account) : null}
        plan={multiPlan ? { progress: multiPlan, title: publicPlanTitle(multiPlan) } : null}
        stsPaused={health?.pauseSafeToSpend ? health.dataFrom : null}
        notice={notice ?? pausedNotice}
        payPending={!checkIn && payday === data.asOf}
        checkIn={checkIn}
        recap={recap}
        feesAvoided={feesAvoided}
        tally={tally}
        present={presentationMode(searchParams.present)}
      />
    </PortalShell>
  );
}
