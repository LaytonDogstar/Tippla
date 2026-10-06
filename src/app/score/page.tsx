import { Info } from "lucide-react";
import Link from "next/link";
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { factorDrivers, factors, loanTotals, recommendations, scoreAttribution, scoreState, scoreTrend, strongestFactor, topThreeFactors } from "@/lib/selectors";
import { formatUpdated } from "@/lib/format";
import { scorePage as t } from "@/content/factors";
import { onboarding } from "@/content/onboarding";
import { projectScore } from "@/lib/scoring/estimate";
import { isOn } from "@/config/featureFlags";
import { STAGES_ARE_SAMPLE } from "@/config/stages";
import { factorFromSlug } from "@/lib/ui/factorSlugs";
import type { FactorKey } from "@/lib/api/types";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { ScoreView, type FactorPanel } from "./ScoreView";

export const dynamic = "force-dynamic";
type Key = Exclude<FactorKey, "GOVERNMENT_RELIANCE">;

export async function ScorePage({ searchParams, slug }: { searchParams: { persona?: string; present?: string }; slug?: string }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data, account, goal } = await loadCustomer(persona);
  const all = factors(data);
  const top = topThreeFactors(data);
  const recs = recommendations(data, goal);
  const totals = loanTotals(data);
  const panels = Object.fromEntries(all.map((f) => [f.key, {
    factor: f,
    drivers: factorDrivers(data, f.key),
    related: recs.find((r) => r.factorKey === f.key) ?? null,
    explanation: f.key === "LOAN_AMOUNT_AND_TYPE" && f.value !== null ? onboarding.reveal.loansOpen(totals.counts.sacc + totals.counts.macc + totals.counts.aocc) : undefined,
  } satisfies FactorPanel])) as Record<Key, FactorPanel>;
  const others = all.filter((f) => !top.some((x) => x.key === f.key)).sort((a, b) => (a.value ?? 99) - (b.value ?? 99));
  return (
    <PortalShell path="/score" persona={persona} present={present}
      header={<PageHeader title={t.title} sub={data.score?.scoredAt ? formatUpdated(data.score.scoredAt) : undefined}
        action={<Link href="/help#score" aria-label={t.howItWorks} className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-pill bg-surface2 text-text hover:bg-neutral-soft"><Info aria-hidden size={24} /></Link>} />}>
      <ScoreView state={scoreState(data)} attribution={isOn("score_attribution_v1", persona) ? scoreAttribution(data, { hideGambling: account.hideGambling }) : null} projection={projectScore(data, isOn("score_projection_v1", persona), goal)} trend={scoreTrend(data)} top={top} others={others} strongest={strongestFactor(data)}
        panels={panels} scoredAt={data.score?.scoredAt ?? null} initial={slug ? factorFromSlug(slug) : null} present={present} stagesSample={STAGES_ARE_SAMPLE} />
    </PortalShell>
  );
}

export default function Page({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  return <ScorePage searchParams={searchParams} />;
}
