"use client";
// P2 SmartScore: explain the score and show the path to the next stage. Factor detail opens as a sheet
// (deep link /score/[factor]); the related step replaces the sheet's content with Back, never a second scrim.
import { ChevronRight, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FactorKey } from "@/lib/api/types";
import type { Factor, ScoreState } from "@/lib/selectors/score";
import type { DriverFact } from "@/lib/selectors/factorDetail";
import type { Recommendation } from "@/lib/selectors/recommendations";
import { scorePage as t } from "@/content/factors";
import { copy } from "@/content/en-AU";
import { formatDate, formatDayMonth, formatUpdated } from "@/lib/format";
import { FACTOR_SLUGS } from "@/lib/ui/factorSlugs";
import { FactorRow, ScoreSummary, TrendChart } from "@/components/domain/ScoreParts";
import { InsightSheetBody } from "@/components/domain/Insight";
import { Button } from "@/components/ui/Button";
import { SampleTag } from "@/components/ui/SampleTag";
import { Sheet } from "@/components/ui/Sheet";
import { ScoreChangeDetail, ScoreProjectionCard } from "@/components/domain/ScoreChange";
import type { ScoreProjection } from "@/lib/scoring/estimate";
import type { ScoreAttribution } from "@/lib/selectors/scoreAttribution";

type Key = Exclude<FactorKey, "GOVERNMENT_RELIANCE">;
export interface FactorPanel { factor: Factor; drivers: DriverFact[]; related: Recommendation | null; explanation?: string }

export function ScoreView({ state, attribution, projection, trend, top, others, strongest, panels, scoredAt, initial, present, stagesSample }: {
  state: ScoreState; attribution: ScoreAttribution | null; projection: ScoreProjection | null; trend: { date: string; score: number }[]; top: Factor[]; others: Factor[]; strongest: Factor | null;
  panels: Record<Key, FactorPanel>; scoredAt: string | null; initial: Key | null; present: boolean; stagesSample: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<Key | null>(initial);
  const [related, setRelated] = useState(false);
  const [point, setPoint] = useState<{ date: string; score: number } | null>(null);
  const [how, setHow] = useState(false);
  const show = (k: Key) => { setRelated(false); setOpen(k); window.history.replaceState(null, "", `/score/${FACTOR_SLUGS[k]}`); };
  const close = () => { setOpen(null); setRelated(false); window.history.replaceState(null, "", "/score"); };
  const panel = open ? panels[open] : null;

  // Desktop: two columns (score and factors | what changed, trend, how it works). Phones: one column, in the order
  // below; the column wrappers are display: contents there, so `order` sets the sequence.
  return (
    <div className="flex flex-col gap-t4 desktop:flex-row desktop:items-start desktop:gap-t6">
      <div className="contents desktop:flex desktop:min-w-0 desktop:flex-[3_1_0] desktop:flex-col desktop:gap-t4">
        <div className="order-1 flex flex-col gap-t2">
          {state.kind === "scored" ? (
            <ScoreSummary state={state} />
          ) : (
            <section className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card sm:p-t6">
              <div className="flex items-center gap-t3">
                <span aria-hidden className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-pill bg-chip text-text-secondary"><Info size={20} strokeWidth={1.8} /></span>
                <h2 className="text-card text-text sm:text-card-l">{copy.score.factorNull}</h2>
              </div>
              <p className="mt-t3 text-body14 text-text-secondary">{state.kind === "override" && state.override === "thin_file" ? copy.score.thinFile : copy.score.unavailable}</p>
              {state.kind === "override" && state.estimatedReadyDate && <p className="mt-t2 text-meta text-text-muted">{copy.score.thinFileDate(formatDate(state.estimatedReadyDate))}</p>}
            </section>
          )}
          {stagesSample && state.kind === "scored" && <SampleTag q="Q4 stage bands" present={present} className="self-start" />}
        </div>

        {strongest && <p className="order-6 rounded-card-s bg-accent-soft p-t4 text-body14 text-text sm:rounded-card sm:px-t5">{t.strongestNote(strongest.name, strongest.value!.toFixed(1))}</p>}

        {top.length > 0 && (
          <section aria-labelledby="room" className="order-7">
            <h2 id="room" className="mb-t3 px-t1 text-card text-text sm:text-card-l">{t.roomToMove}</h2>
            <ul className="flex flex-col gap-t3">{top.map((f) => <li key={f.key}><FactorRow factor={f} explanation={panels[f.key as Key].explanation} onOpen={() => show(f.key as Key)} /></li>)}</ul>
          </section>
        )}
        <section aria-labelledby="other" className="order-8">
          <h2 id="other" className="mb-t3 px-t1 text-card text-text sm:text-card-l">{top.length ? t.other : t.roomToMove}</h2>
          <ul className="flex flex-col gap-t3">{others.map((f) => <li key={f.key}><FactorRow factor={f} onOpen={() => show(f.key as Key)} /></li>)}</ul>
        </section>
      </div>

      <div className="contents desktop:flex desktop:min-w-0 desktop:flex-[2_1_0] desktop:flex-col desktop:gap-t4">
        {attribution && <div className="order-3"><ScoreChangeDetail attribution={attribution} present={present} /></div>}
        {projection && <div className="order-4"><ScoreProjectionCard projection={projection} present={present} /></div>}
        <div className="order-5 empty:hidden"><TrendChart points={trend} onPoint={setPoint} /></div>

        <section aria-labelledby="how" className="order-9 rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card sm:px-t6">
          <button type="button" aria-expanded={how} aria-controls="how-body" onClick={() => setHow((v) => !v)} className="flex min-h-tap w-full items-center justify-between rounded-sm text-left hover:bg-surface2">
            <h2 id="how" className="text-card text-text sm:text-card-l">{t.howItWorks}</h2>
            <ChevronRight aria-hidden size={20} className={how ? "rotate-90 text-icon-muted" : "text-icon-muted"} />
          </button>
          <div id="how-body" hidden={!how} className="mt-t3 flex flex-col gap-t3 text-body14 text-text-secondary">
            {t.howBody.map((p) => <p key={p}>{p}</p>)}
            <p>{t.incomeMix}</p>
            <p>{t.stagesNote} <SampleTag q="Q4" present={present} /></p>
          </div>
        </section>
      </div>

      <Sheet open={!!panel} onClose={close} onBack={related ? () => setRelated(false) : undefined}
        title={related && panel?.related ? panel.related.title : panel ? `${panel.factor.name}` : ""}
        subtitle={related ? undefined : panel ? `${panel.factor.value === null ? "—" : `${panel.factor.value.toFixed(1)} / 10`}${scoredAt ? ` · ${formatUpdated(scoredAt)}` : ""}` : undefined}
        footer={panel?.related && !related ? (
          <>
            <p className="text-caption text-text-muted">{t.related}</p>
            <button type="button" onClick={() => setRelated(true)} className="flex min-h-[64px] w-full items-center gap-t3 rounded-sm bg-accent-soft px-t4 text-left text-body-strong text-accent hover:shadow-[inset_0_0_0_2px_var(--color-accent)]">
              <span className="flex-1">{panel.related.title}</span><ChevronRight aria-hidden size={20} />
            </button>
          </>
        ) : related && panel?.related ? (
          <Button full variant="secondary" onClick={() => router.push(panel.related!.action.href)}>{panel.related.action.label}</Button>
        ) : undefined}>
        {panel && !related && (
          <div className="flex flex-col gap-t6">
            <section><h3 className="text-h3 text-text">{t.measures}</h3><p className="mt-t2 text-small text-text-muted">{panel.factor.explains}.</p></section>
            <section>
              <h3 className="text-h3 text-text">{t.driving}</h3>
              <ul className="mt-t2 flex list-disc flex-col gap-t2 pl-t5 text-small text-text-muted marker:text-neutral">
                {panel.drivers.map((d) => <li key={d.text}>{d.text}{d.sample && <SampleTag q="Q2" present={present} className="ml-t2" />}</li>)}
              </ul>
            </section>
            {panel.factor.value !== null && <section><h3 className="text-h3 text-text">{t.lifts}</h3><p className="mt-t2 text-small text-text-muted">{panel.factor.lifts.replace(/\.$/, "")}.{panel.factor.key === "PRODUCTIVE_SPEND" && <SampleTag q="Q2" present={present} className="ml-t2" />}</p></section>}
          </div>
        )}
        {panel?.related && related && (
          <InsightSheetBody item={{ id: panel.related.id, context: panel.related.factor, title: panel.related.title, summary: panel.related.why, happening: panel.related.sheet.happening, wouldChange: panel.related.sheet.wouldChange, ifYouWant: panel.related.sheet.ifYouWant }} />
        )}
      </Sheet>

      <Sheet open={!!point} onClose={() => setPoint(null)} title={point ? `${formatDayMonth(point.date)}` : ""}>
        {point && <p className="tnum text-h1 font-display text-text">{point.score}</p>}
      </Sheet>
    </div>
  );
}
