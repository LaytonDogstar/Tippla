// Today (Home): what Tippla did, what needs a look (ranked, max 3), then where things stand.
// Lender offers never appear here: this page is about the customer's own money.
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { savingsGoalStatus, cycleOfBills, nextBufferStep, stageMoment, streakMilestones, surplusSuggestion, activePlan, publicPlanTitle, connectionHealth, forecastAccuracy, goalLabel, goalOptions, isFirstPayday, recapLead, goalPlan, lastRefresh, cycleRecap, paydayCheckIn, safeToSpendFor, stsOptions, valueTally, notifications, refreshStatus, scoreAttribution, unreadCount, dashboardBanner, firstAction, nextBill, payCycleSummary, scoreChange, scoreState, sixMonthSpending } from "@/lib/selectors";
import { addDays, daysBetween, formatShortDay, formatUpdated, formatDate, formatDayMonth, formatWhole, toAESTDate } from "@/lib/format";
import { safeCopy } from "@/content/loop";
import { flagsFor } from "@/config/featureFlags";
import { billId } from "@/lib/account/state";
import { progressCopy as p } from "@/content/progress";
import { dashboard as t } from "@/content/dashboard";
import { accuracyCopy } from "@/content/corrections";
import { savingsCopy } from "@/content/plans";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { HeaderActions } from "@/components/shell/HeaderActions";
import { feed } from "@/lib/feed";
import { HomeView } from "./HomeView";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
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
  const rawBanner = dashboardBanner(data, { bankExpiredSince: account.bank?.disconnected ? data.asOf : renewed ? null : expired, hardshipSelfSelected: account.hardshipSelfSelected });
  // The hardship banner steps aside when a feed card already offers the same options (no repetition).
  const banner = rawBanner?.kind === "hardship" && f.top.some((i) => i.hardship) ? null : rawBanner;
  const plan = goalPlan(data, account.goal);
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
  // Spec 04: the member's goal, shown on Today and changeable there.
  const focusGoal = on.goals_v1 ? {
    current: goal ? { type: goal.type, label: goalLabel(data, goal.type) } : null,
    options: goalOptions(data).map((type) => ({ type, label: goalLabel(data, type) })),
  } : null;
  // Spec 05: forecast accuracy (from fresh data only: a stale forecast isn't judged).
  const acc = on.forecast_accuracy_v1 && !staleSince ? forecastAccuracy(data) : null;
  const accuracyLine = acc?.show ? accuracyCopy.line(formatWhole(acc.within), acc.hits, acc.of) : null;
  const miss = acc?.miss && !account.forecastAnswers?.[acc.miss.forDate] ? acc.miss : null;
  const multiPlan = on.plans_v1 ? activePlan(data, account, goal) : null;
  const bannerView = banner && (
    banner.kind === "hardship" ? { text: t.banners.hardship, href: "/hardship" }
      : banner.kind === "score_drop" ? { text: t.banners.scoreDrop(banner.points), href: "/score" }
      : { text: account.bank?.disconnected ? t.banners.bankDisconnected : t.banners.bankExpired(formatDate(banner.since)), href: "/account/bank" });

  return (
    <PortalShell path="/" persona={persona} present={presentationMode(searchParams.present)} wide
      header={<PageHeader title={t.hi(data.profile.first_name)} sub={data.score?.scoredAt ? formatUpdated(lastRefresh(data).at) : undefined}
        action={<HeaderActions unread={unreadCount(notifications(data, account))} />} />}>
      <HomeView
        persona={persona}
        account={account}
        flags={{ feed: on.feed_v1, status: on.status_line_v1, safe: on.safe_to_spend_v1, tally: on.value_tally_v1, buffer: on.buffer_v1, corrections: on.corrections_v1, assistant: on.assistant_v1 }}
        status={status.line}
        statusStale={status.stale}
        checked={status.checked}
        feedItems={f.open}
        attribution={on.score_attribution_v1 ? scoreAttribution(data, { hideGambling: account.hideGambling }) : null}
        asOf={data.asOf}
        banner={bannerView}
        score={scoreState(data)}
        change={scoreChange(data)}
        action={next}
        payCycle={payCycleSummary(data, edits)}
        nextBill={nextBill(data)}
        bars={sixMonthSpending(data, edits)}
        lapsed={states.includes("lapsed")}
        safe={safe}
        movement={movement}
        adjustBills={adjustBills}
        oneOffDates={oneOffDates}
        focus={next?.title ?? null}
        focusGoal={focusGoal}
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
        payPending={!checkIn && payday === data.asOf}
        progressText={plan ? (plan.latest ? p.homeGoal(formatWhole(plan.amount), formatDayMonth(plan.by), plan.percent) : p.homeGoalPending(formatWhole(plan.amount), formatDayMonth(plan.by))) : p.homeNoGoal}
        checkIn={checkIn}
        recap={recap}
        feesAvoided={feesAvoided}
        tally={tally}
        present={presentationMode(searchParams.present)}
      />
    </PortalShell>
  );
}
