import { Info } from "lucide-react";
import { AskAboutThis } from "@/components/domain/AskTippla";
import { assistantCopy } from "@/content/assistant";
import { activePlan, publicPlanTitle } from "@/lib/selectors/plans";
import { PlanCompact } from "@/components/domain/PlanCard";
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
import { HEADER_ACTION, PageHeader } from "@/components/shell/Shells";
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
  const plan = isOn("plans_v1", persona) ? activePlan(data, account, goal) : null;
  const totals = loanTotals(data);
  const panels = Object.fromEntries(all.map((f) => [f.key, {
    factor: f,
    drivers: factorDrivers(data, f.key),
    related: recs.find((r) => r.factorKey === f.key) ?? null,
    explanation: f.key === "LOAN_AMOUNT_AND_TYPE" && f.value !== null ? onboarding.reveal.loansOpen(totals.counts.sacc + totals.counts.macc + totals.counts.aocc) : undefined,
  } satisfies FactorPanel])) as Record<Key, FactorPanel>;
  const others = all.filter((f) => !top.some((x) => x.key === f.key)).sort((a, b) => (a.value ?? 99) - (b.value ?? 99));
  return (
    <PortalShell path="/score" persona={persona} present={present} wide
      header={<PageHeader title={t.title} sub={data.score?.scoredAt ? formatUpdated(data.score.scoredAt) : undefined}
        action={<Link href="/help#score" aria-label={t.howItWorks} className={HEADER_ACTION}><Info aria-hidden size={20} strokeWidth={1.8} /></Link>} />}>
      <ScoreView state={scoreState(data)} attribution={isOn("score_attribution_v1", persona) ? scoreAttribution(data, { hideGambling: account.hideGambling }) : null} projection={projectScore(data, isOn("score_projection_v1", persona), goal)} trend={scoreTrend(data)} top={top} others={others} strongest={strongestFactor(data)}
        panels={panels} scoredAt={data.score?.scoredAt ?? null} initial={slug ? factorFromSlug(slug) : null} present={present} stagesSample={STAGES_ARE_SAMPLE} />
      {plan && <div className="mt-t3 pb-t2"><PlanCompact plan={plan} title={publicPlanTitle(plan)} /></div>}
      {isOn("assistant_v1", persona) && <div className="pb-t6"><AskAboutThis question={assistantCopy.suggestions.score} /></div>}
    </PortalShell>
  );
}

export default function Page({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  return <ScorePage searchParams={searchParams} />;
}
