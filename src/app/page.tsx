// Today (Home): what Tippla did, what needs a look (ranked, max 3), then where things stand.
// Lender offers never appear here: this page is about the customer's own money.
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { goalPlan, lastRefresh, cycleRecap, paydayCheckIn, safeToSpendFor, stsOptions, valueTally, notifications, refreshStatus, scoreAttribution, unreadCount, dashboardBanner, firstAction, nextBill, payCycleSummary, scoreChange, scoreState, sixMonthSpending } from "@/lib/selectors";
import { addDays, daysBetween, formatShortDay, formatUpdated, formatDate, formatDayMonth, formatWhole, toAESTDate } from "@/lib/format";
import { safeCopy } from "@/content/loop";
import { flagsFor } from "@/config/featureFlags";
import { billId } from "@/lib/account/state";
import { progressCopy as p } from "@/content/progress";
import { dashboard as t } from "@/content/dashboard";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { HeaderActions } from "@/components/shell/HeaderActions";
import { feed } from "@/lib/feed";
import { HomeView } from "./HomeView";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data, raw, account, edits, states } = await loadCustomer(persona);
  // Disconnected by the customer, or (dev state) the connection expired: numbers stopped at the last refresh.
  const expired = states.includes("bank_expired") && data.score?.scoredAt ? toAESTDate(data.score.scoredAt) : null;
  const on = flagsFor(persona);
  const f = feed({ d: data, edits, account, states }, account.feed);
  const staleSince = account.bank?.disconnected ? data.asOf : expired;
  const status = refreshStatus(data, f.open.length, { staleSince });
  const rawBanner = dashboardBanner(data, { bankExpiredSince: account.bank?.disconnected ? data.asOf : expired, hardshipSelfSelected: account.hardshipSelfSelected });
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
        flags={{ feed: on.feed_v1, status: on.status_line_v1, safe: on.safe_to_spend_v1, tally: on.value_tally_v1, buffer: on.buffer_v1 }}
        status={status.line}
        statusStale={status.stale}
        checked={status.checked}
        feedItems={f.open}
        attribution={on.score_attribution_v1 ? scoreAttribution(data, { hideGambling: account.hideGambling }) : null}
        asOf={data.asOf}
        banner={bannerView}
        score={scoreState(data)}
        change={scoreChange(data)}
        action={firstAction(data)}
        payCycle={payCycleSummary(data, edits)}
        nextBill={nextBill(data)}
        bars={sixMonthSpending(data, edits)}
        lapsed={states.includes("lapsed")}
        safe={safe}
        movement={movement}
        adjustBills={adjustBills}
        oneOffDates={oneOffDates}
        focus={firstAction(data)?.title ?? null}
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
