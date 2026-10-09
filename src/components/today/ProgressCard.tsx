// Your progress (single-column Today, 09/10/2026): the SmartScore and the plan in one longer-term card, on the soft
// brand tint with white inner panels. Score, band and points to the next band; the four-band bar with a marker;
// what changed (estimated); then the plan: step N of M, the step, its goal, the estimate, and one "See how".
// Goals are set from "See how" (the sheet) or Details. No score yet (thin file): says so, then the plan.
import Link from "next/link";
import { Info, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { todayCopy } from "@/content/today";
import { dashboard as dash } from "@/content/dashboard";
import { copy } from "@/content/en-AU";
import { formatDate, formatDayMonth } from "@/lib/format";
import type { ScoreState } from "@/lib/selectors/score";
import type { ScoreAttribution } from "@/lib/selectors/scoreAttribution";
import type { PlanProgress } from "@/lib/selectors/plans";
import type { ScoreProjection } from "@/lib/scoring/estimate";
import { cx } from "@/components/ui/cx";
import { BandBar, bandTone, scoreChangeText } from "./SmartScoreCard";

const t = todayCopy.score;
const pl = todayCopy.plan;
const pr = todayCopy.progress;

export function ProgressCard({ state, change, attribution, plan, action, projection, onSeeHow }: {
  state: ScoreState; change: { delta: number; since: string } | null; attribution: ScoreAttribution | null;
  plan: { progress: PlanProgress; title: string } | null;
  /** The next useful action (the top recommendation), which "See how" opens. */
  action: { title: string; summary: string } | null;
  projection: ScoreProjection | null;
  onSeeHow: () => void;
}) {
  const steps = plan?.progress.steps ?? [];
  const current = plan?.progress.current ?? null;
  const step = current !== null ? steps[current] : null;
  const heading = action?.title ?? step?.label ?? null;
  const goal = step && action ? pl.stepGoal(step.label) : plan ? plan.title : action?.summary ?? null;
  return (
    <section aria-labelledby="progress-h" className="flex flex-col gap-t4 rounded-card-s bg-accent-soft p-t5 sm:rounded-card sm:p-t6">
      <div className="flex items-center gap-t3">
        <h2 id="progress-h" className="flex-1 text-card text-text sm:text-card-l">{pr.heading}</h2>
        {/* Details: the progress page (streaks, goal, score timeline); the score itself opens the SmartScore page. */}
        <Link href="/progress" className="inline-flex min-h-tap items-center rounded-md px-t1 text-body14 font-semibold text-accent hover:text-accent-strong">{pr.details}<span className="sr-only">{pr.detailsSr}</span></Link>
      </div>

      {state.kind === "scored" ? <Score state={state} change={change} attribution={attribution} /> : (
        <div className="flex items-start gap-t3 rounded-inset bg-surface p-t4">
          <Info aria-hidden size={20} className="mt-[2px] shrink-0 text-text-secondary" />
          <div>
            <p className="text-body14 text-text">{dash.thinBody}</p>
            {state.kind === "override" && state.estimatedReadyDate && <p className="mt-t1 text-meta text-text-muted">{copy.score.thinFileDate(formatDate(state.estimatedReadyDate))}</p>}
          </div>
        </div>
      )}

      {/* No plan and nothing suggested: a way in, now there's no "Pick a goal" button on the card. */}
      {!plan && !action && (
        <Link href="/savings" className="flex min-h-tap items-center justify-between gap-t3 rounded-inset bg-surface px-t4 py-t3">
          <span className="min-w-0"><strong className="block text-body14 font-bold text-text">{pr.choosePlan}</strong><span className="block text-meta text-text-muted">{pr.choosePlanBody}</span></span>
          <span aria-hidden className="text-accent">›</span>
        </Link>
      )}
      {(plan || action) && (
        <div className="flex flex-col gap-t3 border-t border-accent-tint2 pt-t4">
          {plan && current !== null
            ? <Link href="/savings" aria-label={`${pl.planName(plan.title)} · ${pl.step(current + 1, steps.length).replace(/^Your plan · /, "")}: ${step?.label ?? ""}`}
                className="inline-flex min-h-tap items-center self-start text-meta-s font-semibold text-accent-strong underline-offset-2 hover:underline">{pl.step(current + 1, steps.length)}</Link>
            : <p className="text-meta-s font-semibold text-accent-strong">{pl.nextStep}</p>}
          {plan && steps.length > 0 && (
            <div aria-hidden className="grid gap-[6px]" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
              {steps.map((s, i) => <span key={i} className={cx("h-[5px] rounded-pill", s.status === "upcoming" ? "bg-accent-tint2" : "bg-accent-brand")} />)}
            </div>
          )}
          {heading && <h3 className="text-row text-text">{heading}</h3>}
          {goal && <p className="text-body14 leading-relaxed text-text-secondary">{goal}</p>}
          {projection && (
            <div className="flex flex-wrap items-center gap-x-t3 gap-y-t1 rounded-inset bg-surface px-[14px] py-t3">
              <span className="flex-1 text-meta text-text-secondary">{pl.estimateLabel}</span>
              <span className="text-card-l font-bold text-positive">~{projection.to}</span>
              <span className="text-meta-s text-text-muted">{pl.estimateBy(formatDayMonth(projection.by))}</span>
            </div>
          )}
          {action
            ? <button type="button" onClick={onSeeHow} aria-label={`${pl.seeHow}: ${heading ?? ""}`} className="pressable flex h-[46px] items-center justify-center rounded-pill bg-surface text-body14 font-bold text-accent shadow-[inset_0_0_0_1.5px_var(--color-accent)] hover:bg-accent-soft">{pl.seeHow}</button>
            : <Link href="/savings" className="pressable flex h-[46px] items-center justify-center rounded-pill bg-surface text-body14 font-bold text-accent shadow-[inset_0_0_0_1.5px_var(--color-accent)] hover:bg-accent-soft">{pl.seeHow}</Link>}
        </div>
      )}
    </section>
  );
}

function Score({ state, change, attribution }: { state: Extract<ScoreState, { kind: "scored" }>; change: { delta: number; since: string } | null; attribution: ScoreAttribution | null }) {
  const { score, stage } = state;
  const c = scoreChangeText(change, attribution);
  const down = (c.delta ?? 0) < 0;
  const Icon = !c.delta ? Minus : down ? TrendingDown : TrendingUp;
  return (
    <>
      <Link href="/score" className="-m-t1 flex flex-wrap items-baseline gap-x-t3 gap-y-t1 rounded-md p-t1 hover:bg-accent-tint2">
        <span className="sr-only">{t.open}: {t.gaugeSr(score, stage.name)}</span>
        <span aria-hidden className="tnum text-[2.5rem] font-bold leading-none tracking-[-0.03em] text-text">{score}</span>
        <span aria-hidden className={cx("text-row", bandTone(stage.stage.id))}>{stage.name}</span>
        <span className="w-full text-meta text-text-secondary">{stage.next ? t.toNext(stage.next.pointsToGo, stage.next.name, stage.next.at) : t.top}</span>
      </Link>
      <BandBar score={score} bandId={stage.stage.id} />
      {c.text && (
        <div className="rounded-inset bg-surface px-[14px] py-t3">
          <p className="tnum text-body14 text-text-secondary">
            <span className={cx("inline-flex items-center gap-[6px] font-bold", !c.delta ? "text-text-secondary" : down ? "text-negative" : "text-positive")}><Icon aria-hidden size={16} strokeWidth={2} />{c.text}</span>
            {c.parts.map((p) => <span key={p}> · {p}</span>)}
            {c.parts.length > 0 && <span className="text-text-muted"> ({pr.estimated})</span>}
          </p>
        </div>
      )}
    </>
  );
}
