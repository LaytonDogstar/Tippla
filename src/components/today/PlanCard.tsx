// Your plan on Today (redesign 07/10/2026): replaces the goal row, "Your progress" and "Next thing to do".
// Step N of 3 with a progress bar, the next action, the plan's goal, the estimated SmartScore (always labelled an
// estimate) and one primary action. "Pick a goal" / "Change goal" opens the goal on the progress page.
import Link from "next/link";
import { todayCopy } from "@/content/today";
import { formatDayMonth } from "@/lib/format";
import type { PlanProgress } from "@/lib/selectors/plans";
import type { ScoreProjection } from "@/lib/scoring/estimate";
import { cx } from "@/components/ui/cx";

const t = todayCopy.plan;

export function PlanCard({ plan, action, projection, goal, onSeeHow }: {
  plan: { progress: PlanProgress; title: string } | null;
  /** The next useful action when there's no plan yet (the top recommendation). */
  action: { title: string; summary: string } | null;
  projection: ScoreProjection | null;
  goal: { label: string } | null;
  onSeeHow: () => void;
}) {
  if (!plan && !action) return null;
  const steps = plan?.progress.steps ?? [];
  const current = plan?.progress.current ?? null;
  const step = current !== null ? steps[current] : null;
  const heading = step?.label ?? action?.title ?? "";
  const line = plan ? plan.title : action?.summary ?? "";
  return (
    <section aria-labelledby="plan-h" className="flex flex-col gap-[14px] rounded-card-s bg-accent-soft p-t5 sm:rounded-card sm:p-t6">
      <div className="flex items-center gap-t2">
        <span className="flex-1 text-meta-s font-semibold text-accent-strong">{plan && current !== null ? t.step(current + 1, steps.length) : t.nextStep}</span>
        <Link href="/progress" className="inline-flex min-h-tap items-center rounded-md px-t1 text-meta font-semibold text-accent hover:text-accent-strong">{goal ? t.changeGoal : t.pickGoal}</Link>
      </div>
      {plan && steps.length > 0 && (
        <div aria-hidden className="grid gap-[6px]" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((s, i) => <span key={i} className={cx("h-[5px] rounded-pill", s.status === "upcoming" ? "bg-accent-tint2" : "bg-accent-brand")} />)}
        </div>
      )}
      <h2 id="plan-h" className="text-card text-text sm:text-card-l">{heading}</h2>
      <p className="text-body14 leading-relaxed text-text-secondary">{goal ? `${t.goalLine(goal.label)} · ` : ""}{line}</p>
      {projection && (
        <div className="flex flex-wrap items-center gap-x-t3 gap-y-t1 rounded-inset bg-surface px-[14px] py-t3">
          <span className="flex-1 text-meta text-text-secondary">{t.estimateLabel}</span>
          <span className="text-card-l font-bold text-positive">~{projection.to}</span>
          <span className="text-meta-s text-text-muted">{t.estimateBy(formatDayMonth(projection.by))}</span>
        </div>
      )}
      {plan
        ? <Link href="/savings" className="pressable flex h-[46px] items-center justify-center rounded-pill bg-cta text-body14 font-bold text-hero-on shadow-cta">{t.seeHow}</Link>
        : <button type="button" onClick={onSeeHow} className="pressable flex h-[46px] items-center justify-center rounded-pill bg-cta text-body14 font-bold text-hero-on shadow-cta">{t.seeHow}</button>}
    </section>
  );
}
