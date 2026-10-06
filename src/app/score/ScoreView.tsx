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

  return (
    <div className="flex flex-col gap-t3">
      {state.kind === "scored" ? (
        <ScoreSummary state={state} />
      ) : (
        <section className="rounded-lg bg-surface p-t4">
          <div className="flex items-center gap-t3">
            <span aria-hidden className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-md bg-neutral-soft text-neutral"><Info size={24} /></span>
            <h2 className="text-h2 font-display text-text">{copy.score.factorNull}</h2>
          </div>
          <p className="mt-t3 text-body text-text-muted">{state.kind === "override" && state.override === "thin_file" ? copy.score.thinFile : copy.score.unavailable}</p>
          {state.kind === "override" && state.estimatedReadyDate && <p className="mt-t2 text-small text-text-muted">{copy.score.thinFileDate(formatDate(state.estimatedReadyDate))}</p>}
        </section>
      )}
      {stagesSample && state.kind === "scored" && <SampleTag q="Q4 stage bands" present={present} className="self-start" />}

      {attribution && <ScoreChangeDetail attribution={attribution} present={present} />}
      {projection && <ScoreProjectionCard projection={projection} present={present} />}

      <TrendChart points={trend} onPoint={setPoint} />

      {strongest && <p className="rounded-md bg-accent-soft p-t4 text-small text-text">{t.strongestNote(strongest.name, strongest.value!.toFixed(1))}</p>}

      {top.length > 0 && (
        <section aria-labelledby="room" className="mt-t3">
          <h2 id="room" className="mb-t3 text-h2 font-display text-text">{t.roomToMove}</h2>
          <ul className="flex flex-col gap-t2">{top.map((f) => <li key={f.key}><FactorRow factor={f} explanation={panels[f.key as Key].explanation} onOpen={() => show(f.key as Key)} /></li>)}</ul>
        </section>
      )}
      <section aria-labelledby="other" className="mt-t3">
        <h2 id="other" className="mb-t3 text-h2 font-display text-text">{top.length ? t.other : t.roomToMove}</h2>
        <ul className="flex flex-col gap-t2">{others.map((f) => <li key={f.key}><FactorRow factor={f} onOpen={() => show(f.key as Key)} /></li>)}</ul>
      </section>

      <section aria-labelledby="how" className="mt-t3 rounded-lg bg-surface p-t4">
        <button type="button" aria-expanded={how} aria-controls="how-body" onClick={() => setHow((v) => !v)} className="flex min-h-tap w-full items-center justify-between rounded-sm text-left hover:bg-surface2">
          <h2 id="how" className="text-h3 text-text">{t.howItWorks}</h2>
          <ChevronRight aria-hidden size={20} className={how ? "rotate-90 text-text-muted" : "text-text-muted"} />
        </button>
        <div id="how-body" hidden={!how} className="mt-t3 flex flex-col gap-t3 text-small text-text-muted">
          {t.howBody.map((p) => <p key={p}>{p}</p>)}
          <p>{t.incomeMix}</p>
          <p>{t.stagesNote} <SampleTag q="Q4" present={present} /></p>
        </div>
      </section>

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
            {panel.factor.value !== null && <section><h3 className="text-h3 text-text">{t.lifts}</h3><p className="mt-t2 text-small text-text-muted">{panel.factor.lifts.replace(/\.$/, "")}.</p></section>}
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
