"use client";
import { CalendarDays, Info } from "lucide-react";
import { useState } from "react";
import { onboarding } from "@/content/onboarding";
import { copy, weekdayLong } from "@/content/en-AU";
import { formatDate, formatDayMonth, formatWhole } from "@/lib/format";
import type { Period } from "@/lib/selectors/periods";
import type { Factor, ScoreState } from "@/lib/selectors/score";
import type { FirstAction } from "@/lib/selectors/recommendations";
import { ScoreRing } from "@/components/domain/ScoreRing";
import { FactorTile } from "@/components/domain/FactorTile";
import { InsightSheetBody } from "@/components/domain/Insight";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

const t = onboarding.reveal;

export function RevealView({ state, topFactor, loansOpen, action, cycle, pattern, historyDays }: {
  state: ScoreState; topFactor: Factor | null; allFactors: Factor[]; loansOpen: number; action: FirstAction | null;
  cycle: Period; pattern: { typicalAmount: number; everyDays: number | null; weekday: string | null }; historyDays: number;
}) {
  const [sheet, setSheet] = useState<"factor" | "action" | null>(null);

  if (state.kind === "scored") {
    const reason = topFactor?.key === "LOAN_AMOUNT_AND_TYPE" ? t.loansOpen(loansOpen) : topFactor?.explains;
    return (
      <>
        <h1 className="mt-t2 text-h1 font-display text-text">{t.headline(state.score)}</h1>
        <p className="mt-t3 text-body text-text-muted">{t.line(state.stage.name)}</p>
        <div className="brand-surface on-brand mt-t5 rounded-lg p-t5"><ScoreRing state={state} brand /></div>
        {topFactor && (
          <section className="mt-t5" aria-labelledby="bf">
            <h2 id="bf" className="mb-t2 text-caption text-text-muted">{t.biggestFactor}</h2>
            <FactorTile factor={topFactor} explanation={reason} onOpen={() => setSheet("factor")} />
          </section>
        )}
        {action && (
          <section className="mt-t3 rounded-md bg-surface p-t4" aria-labelledby="ft">
            <p className="text-caption text-text-muted">{t.firstThing}</p>
            <h2 id="ft" className="mt-t2 text-h2 font-display text-text">{action.title}</h2>
            <p className="mt-t3 text-small text-text-muted">{action.summary}</p>
            <Button variant="secondary" full className="mt-t4" onClick={() => setSheet("action")}>{t.seeHow}</Button>
          </section>
        )}
        {topFactor && (
          <Sheet open={sheet === "factor"} onClose={() => setSheet(null)} title={topFactor.name} subtitle={`${topFactor.value!.toFixed(1)} / 10`}>
            <div className="flex flex-col gap-t5">
              <section><h3 className="text-h3">{t.measures}</h3><p className="mt-t2 text-body text-text-muted">{topFactor.explains}.</p></section>
              {reason && <section><h3 className="text-h3">{t.driving}</h3><p className="mt-t2 text-body text-text-muted">{reason}</p></section>}
              <section><h3 className="text-h3">{t.lifts}</h3><p className="mt-t2 text-body text-text-muted">{topFactor.lifts}.</p></section>
            </div>
          </Sheet>
        )}
        {action && (
          <Sheet open={sheet === "action"} onClose={() => setSheet(null)} title={action.title}>
            <InsightSheetBody item={{ id: action.id, context: action.factor, title: action.title, summary: action.summary, happening: action.happening, wouldChange: action.wouldChange, ifYouWant: action.ifYouWant }} />
          </Sheet>
        )}
      </>
    );
  }

  if (state.kind === "override" && state.override === "thin_file") {
    return (
      <>
        <div className="mt-t2 flex items-center gap-t4">
          <span aria-hidden className="inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-md bg-neutral-soft text-neutral"><Info size={24} /></span>
          <h1 className="text-h2 font-display text-text">{t.thinTitle}</h1>
        </div>
        <p className="mt-t4 text-body text-text-muted">{copy.score.thinFile}</p>
        {state.estimatedReadyDate && (
          <p className="mt-t4 flex gap-t3 rounded-md bg-info-soft p-t4 text-small text-info">
            <CalendarDays aria-hidden size={20} className="shrink-0" />
            {copy.score.thinFileDate(formatDate(state.estimatedReadyDate))}
          </p>
        )}
        <h2 className="mt-t6 text-h2 font-display text-text">{t.canSee}</h2>
        <dl className="mt-t3 divide-y divide-line rounded-md bg-surface px-t4">
          <div className="flex justify-between gap-t3 py-t4"><dt className="text-small text-text-muted">{t.payCycle}</dt><dd className="tnum text-body-strong text-text">{formatDayMonth(cycle.start)} – {formatDayMonth(cycle.end)}</dd></div>
          {pattern.typicalAmount > 0 && (
            <div className="flex justify-between gap-t3 py-t4">
              <dt className="text-small text-text-muted">{t.pay}</dt>
              <dd className="text-right">
                <span className="tnum block text-body-strong text-text">{t.payAmount(formatWhole(pattern.typicalAmount))}</span>
                {pattern.everyDays === 14 && pattern.weekday && <span className="block text-small text-text-muted">{t.payEvery(weekdayLong[pattern.weekday] ?? pattern.weekday)}</span>}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-t3 py-t4"><dt className="text-small text-text-muted">{t.history}</dt><dd className="tnum text-body-strong text-text">{t.historyDays(historyDays)}</dd></div>
        </dl>
      </>
    );
  }

  // Other overrides or a failed score request: plain explanation, never a zero.
  const msg = state.kind === "override"
    ? ({ no_activity: copy.score.noActivity, no_income: copy.score.noIncome, bureau_overdue: copy.score.bureauOverdue, other: copy.score.unavailable, thin_file: copy.score.thinFile } as const)[state.override]
    : copy.score.unavailable;
  return (
    <div className="mt-t2 flex flex-col items-start gap-t4">
      <ScoreRing state={state} size="medium" />
      <p className="text-body text-text-muted">{msg}</p>
    </div>
  );
}
