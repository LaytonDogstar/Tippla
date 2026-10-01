// P1 Dashboard: point to the next two taps, not a data fire-hose.
import { Bell } from "lucide-react";
import Link from "next/link";
import { loadPersona } from "@/lib/api/client";
import { categoryEdits, currentPersona, presentationMode } from "@/lib/persona";
import { dashboardBanner, firstAction, nextBill, payCycleSummary, scoreChange, scoreState, sixMonthSpending } from "@/lib/selectors";
import { formatUpdated, formatDate } from "@/lib/format";
import { dashboard as t } from "@/content/dashboard";
import { PageHeader, PortalShell } from "@/components/shell/Shells";
import { HomeView } from "./HomeView";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data } = await loadPersona(persona);
  const edits = categoryEdits(persona);
  const banner = dashboardBanner(data);
  const bannerView = banner && (
    banner.kind === "hardship" ? { text: t.banners.hardship, href: "/hardship" }
      : banner.kind === "new_offer" ? { text: t.banners.newOffer(banner.count), href: "/offers" }
      : banner.kind === "score_drop" ? { text: t.banners.scoreDrop(banner.points), href: "/score" }
      : { text: t.banners.bankExpired(formatDate(banner.since)), href: "/account/bank" });
  return (
    <PortalShell path="/" persona={persona} present={presentationMode(searchParams.present)} wide
      header={<PageHeader title={t.hi(data.profile.first_name)} sub={data.score?.scoredAt ? formatUpdated(data.score.scoredAt) : undefined}
        action={<Link href="/notifications" aria-label={t.notifications} className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-pill bg-surface2 text-text hover:bg-neutral-soft"><Bell aria-hidden size={24} /></Link>} />}>
      <HomeView
        asOf={data.asOf}
        banner={bannerView}
        score={scoreState(data)}
        change={scoreChange(data)}
        action={firstAction(data)}
        payCycle={payCycleSummary(data, edits)}
        nextBill={nextBill(data)}
        bars={sixMonthSpending(data, edits)}
      />
    </PortalShell>
  );
}
