// P1 Dashboard: point to the next two taps, not a data fire-hose.
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { notifications, unreadCount, dashboardBanner, firstAction, nextBill, payCycleSummary, scoreChange, scoreState, sixMonthSpending } from "@/lib/selectors";
import { formatUpdated, formatDate, toAESTDate } from "@/lib/format";
import { dashboard as t } from "@/content/dashboard";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { HeaderActions } from "@/components/shell/HeaderActions";
import { HomeView } from "./HomeView";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data, account, edits, states } = await loadCustomer(persona);
  // Disconnected by the customer, or (dev state) the connection expired: numbers stopped at the last refresh.
  const expired = states.includes("bank_expired") && data.score?.scoredAt ? toAESTDate(data.score.scoredAt) : null;
  const banner = dashboardBanner(data, { bankExpiredSince: account.bank?.disconnected ? data.asOf : expired, hardshipSelfSelected: account.hardshipSelfSelected });
  const bannerView = banner && (
    banner.kind === "hardship" ? { text: t.banners.hardship, href: "/hardship" }
      : banner.kind === "new_offer" ? { text: t.banners.newOffer(banner.count), href: "/offers" }
      : banner.kind === "score_drop" ? { text: t.banners.scoreDrop(banner.points), href: "/score" }
      : { text: account.bank?.disconnected ? t.banners.bankDisconnected : t.banners.bankExpired(formatDate(banner.since)), href: "/account/bank" });
  return (
    <PortalShell path="/" persona={persona} present={presentationMode(searchParams.present)} wide
      header={<PageHeader title={t.hi(data.profile.first_name)} sub={data.score?.scoredAt ? formatUpdated(data.score.scoredAt) : undefined}
        action={<HeaderActions unread={unreadCount(notifications(data, account))} />} />}>
      <HomeView
        asOf={data.asOf}
        banner={bannerView}
        score={scoreState(data)}
        change={scoreChange(data)}
        action={firstAction(data)}
        payCycle={payCycleSummary(data, edits)}
        nextBill={nextBill(data)}
        bars={sixMonthSpending(data, edits)}
        lapsed={states.includes("lapsed")}
      />
    </PortalShell>
  );
}
