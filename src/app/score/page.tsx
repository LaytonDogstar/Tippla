// SmartScore, one column (12/10/2026; reference: smartscore-mock.dc.html): the same header as Today and Spending
// (Updated and next update, bell, Ask Tippla with two suggested questions). The server works out everything shown:
// the hero (band, direction, change), What changed, the next step (plan, action, estimate, and the shortfall guard
// from Today's own pay-cycle summary), every factor's change since the last update, and the trend.
import { activePlan, publicPlanTitle } from "@/lib/selectors/plans";
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import {
  factorDrivers, factorLines, factors, firstAction, groupFactors, lastRefresh, loanTotals, nextUpdate, notifications, payCycleSummary,
  panelData, recommendations, scoreAttribution, scoreDirection, scoreSections, scoreState, scoreTrend, shortfallGuard, unreadCount,
} from "@/lib/selectors";
import { formatShortDay, formatUpdated } from "@/lib/format";
import { scorePage as t } from "@/content/factors";
import { onboarding } from "@/content/onboarding";
import { projectScore } from "@/lib/scoring/estimate";
import { isOn } from "@/config/featureFlags";
import { SCORE_SECTION_ORDER } from "@/config/flags";
import { STAGES_ARE_SAMPLE } from "@/config/stages";
import { factorFromSlug } from "@/lib/ui/factorSlugs";
import type { FactorKey } from "@/lib/api/types";
import { PortalShell } from "@/components/shell/Portal";
import { TodayHeader } from "@/components/today/TodayHeader";
import { ScoreView, type FactorPanel } from "./ScoreView";

export const dynamic = "force-dynamic";
type Key = Exclude<FactorKey, "GOVERNMENT_RELIANCE">;

export async function ScorePage({ searchParams, slug }: { searchParams: { persona?: string; present?: string }; slug?: string }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data, account, goal, edits } = await loadCustomer(persona);
  const recs = recommendations(data, goal);
  const plan = isOn("plans_v1", persona) ? activePlan(data, account, goal) : null;
  const totals = loanTotals(data);
  const loansOpen = onboarding.reveal.loansOpen(totals.counts.sacc + totals.counts.macc + totals.counts.aocc);
  const panels = Object.fromEntries(factors(data).map((f) => [f.key, {
    factor: f,
    drivers: factorDrivers(data, f.key),
    related: recs.find((r) => r.factorKey === f.key) ?? null,
    explanation: f.key === "LOAN_AMOUNT_AND_TYPE" && f.value !== null ? loansOpen : undefined,
  } satisfies FactorPanel])) as Record<Key, FactorPanel>;
  const attribution = isOn("score_attribution_v1", persona) ? scoreAttribution(data, { hideGambling: account.hideGambling }) : null;
  const payCycle = payCycleSummary(data, edits);
  const lines = factorLines(data, { attribution, payCycle, loansOpen, shortReason: t.shortReason });
  const { room, other, strongest } = groupFactors(lines);
  const prev = data.scoreHistory.at(-2);
  const next = nextUpdate(data.scoreHistory);
  const action = firstAction(data, goal);
  const updated = formatUpdated(lastRefresh(data).at);
  // "Why did my score drop?" only when it did; no score yet, no question about it.
  const delta = prev && data.score?.score != null ? data.score.score - prev.score : null;
  const askChips = [...(delta === null ? [] : [delta < 0 ? t.askChips.drop : t.askChips.change]), t.askChips.help];
  return (
    <PortalShell path="/score" persona={persona} present={present} wide
      header={<TodayHeader title={t.title} sub={t.updated(updated, next ? formatShortDay(next) : null)} unread={unreadCount(notifications(data, account))}
        ask={isOn("assistant_v1", persona) ? { placeholder: t.askPlaceholder, chips: askChips, chipsLabel: t.askChipsLabel } : null} />}>
      <ScoreView
        state={scoreState(data)} attribution={attribution}
        previous={prev ? { score: prev.score, date: prev.scored_date } : null}
        direction={scoreDirection(data.scoreHistory)}
        sections={scoreSections(SCORE_SECTION_ORDER)}
        plan={plan ? { progress: plan, title: publicPlanTitle(plan) } : null}
        action={action ? { title: action.title } : null}
        projection={projectScore(data, isOn("score_projection_v1", persona), goal)}
        shortfall={shortfallGuard(payCycle)}
        journey={panelData(data, account, edits)} persona={persona} account={account}
        room={room} other={other} strongest={strongest} gamblingLink={!account.hideGambling}
        trend={scoreTrend(data)} panels={panels} scoredAt={data.score?.scoredAt ?? null}
        initial={slug ? factorFromSlug(slug) : null} present={present} stagesSample={STAGES_ARE_SAMPLE} />
    </PortalShell>
  );
}

export default function Page({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  return <ScorePage searchParams={searchParams} />;
}
