// Today (Home): what Tippla did, what needs a look (ranked, max 3), then where things stand.
// Lender offers never appear here: this page is about the customer's own money.
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { goalPlan, lastRefresh, cycleRecap, paydayCheckIn, safeToSpend, valueTally, notifications, refreshStatus, scoreAttribution, unreadCount, dashboardBanner, firstAction, nextBill, payCycleSummary, scoreChange, scoreState, sixMonthSpending } from "@/lib/selectors";
import { formatUpdated, formatDate, formatDayMonth, formatWhole, toAESTDate } from "@/lib/format";
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
  const { data, account, edits, states } = await loadCustomer(persona);
  // Disconnected by the customer, or (dev state) the connection expired: numbers stopped at the last refresh.
  const expired = states.includes("bank_expired") && data.score?.scoredAt ? toAESTDate(data.score.scoredAt) : null;
  const f = feed({ d: data, edits }, account.feed);
  const status = refreshStatus(data, f.open.length);
  const rawBanner = dashboardBanner(data, { bankExpiredSince: account.bank?.disconnected ? data.asOf : expired, hardshipSelfSelected: account.hardshipSelfSelected });
  // The hardship banner steps aside when a feed card already offers the same options (no repetition).
  const banner = rawBanner?.kind === "hardship" && f.top.some((i) => i.hardship) ? null : rawBanner;
  const plan = goalPlan(data, account.goal);
  const checkIn = paydayCheckIn(data, plan?.thisCycle ?? 0);
  const recap = checkIn ? cycleRecap(data, edits) : null;
  const tally = valueTally(data, account);
  // Fees the customer avoided in the cycle being recapped (confirmed tally items dated in it).
  const feesAvoided = recap ? tally.items.filter((i) => i.kind !== "subscription" && i.date >= recap.cycle.start && i.date <= recap.cycle.end).reduce((a, i) => a + i.amount, 0) : 0;
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
        status={status.line}
        feedItems={f.open}
        attribution={scoreAttribution(data)}
        asOf={data.asOf}
        banner={bannerView}
        score={scoreState(data)}
        change={scoreChange(data)}
        action={firstAction(data)}
        payCycle={payCycleSummary(data, edits)}
        nextBill={nextBill(data)}
        bars={sixMonthSpending(data, edits)}
        lapsed={states.includes("lapsed")}
        safe={safeToSpend(data, { goal: plan?.thisCycle ?? 0 })}
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
