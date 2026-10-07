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

export function PlanCard({ plan, action, projection, goalSlot, progress, onSeeHow }: {
  plan: { progress: PlanProgress; title: string } | null;
  /** The next useful action when there's no plan yet (the top recommendation). */
  action: { title: string; summary: string } | null;
  projection: ScoreProjection | null;
  /** The member's goal with Change / Pick a goal (spec 04), as a line in the card. */
  goalSlot?: React.ReactNode;
  /** "Your progress" summary (goal progress), linking to the progress page. */
  progress?: string | null;
  onSeeHow: () => void;
}) {
  if (!plan && !action) return null;
  const steps = plan?.progress.steps ?? [];
  const current = plan?.progress.current ?? null;
  const step = current !== null ? steps[current] : null;
  // The next action leads (mockup: "Skip the next pay advance"); the plan step's goal sits under it.
  const heading = action?.title ?? step?.label ?? "";
  const line = step && action ? t.stepGoal(step.label) : plan ? plan.title : action?.summary ?? "";
  return (
    <section aria-labelledby="plan-h" className="flex flex-col gap-[14px] rounded-card-s bg-accent-soft p-t5 sm:rounded-card sm:p-t6">
      <div className="flex items-center gap-t2">
        {plan && current !== null
          ? <Link href="/savings" aria-label={`${t.planName(plan.title)} · ${t.step(current + 1, steps.length).replace(/^Your plan · /, "")}: ${step?.label ?? ""}`}
              className="inline-flex min-h-tap flex-1 items-center text-meta-s font-semibold text-accent-strong underline-offset-2 hover:underline">{t.step(current + 1, steps.length)}</Link>
          : <span className="flex-1 text-meta-s font-semibold text-accent-strong">{t.nextStep}</span>}
      </div>
      {plan && steps.length > 0 && (
        <div aria-hidden className="grid gap-[6px]" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((s, i) => <span key={i} className={cx("h-[5px] rounded-pill", s.status === "upcoming" ? "bg-accent-tint2" : "bg-accent-brand")} />)}
        </div>
      )}
      <h2 id="plan-h" className="text-card text-text sm:text-card-l">{heading}</h2>
      <p className="text-body14 leading-relaxed text-text-secondary">{line}</p>
      {goalSlot}
      {projection && (
        <div className="flex flex-wrap items-center gap-x-t3 gap-y-t1 rounded-inset bg-surface px-[14px] py-t3">
          <span className="flex-1 text-meta text-text-secondary">{t.estimateLabel}</span>
          <span className="text-card-l font-bold text-positive">~{projection.to}</span>
          <span className="text-meta-s text-text-muted">{t.estimateBy(formatDayMonth(projection.by))}</span>
        </div>
      )}
      {action
        ? <button type="button" onClick={onSeeHow} aria-label={`${t.seeHow}: ${heading}`} className="pressable flex h-[46px] items-center justify-center rounded-pill bg-cta text-body14 font-bold text-hero-on shadow-cta">{t.seeHow}</button>
        : <Link href="/savings" className="pressable flex h-[46px] items-center justify-center rounded-pill bg-cta text-body14 font-bold text-hero-on shadow-cta">{t.seePlan}</Link>}
      {progress && (
        <Link href="/progress" className="flex min-h-tap items-center justify-between gap-t2 rounded-md text-meta text-text-secondary hover:text-text">
          <span><strong className="font-semibold text-accent">{t.progress}</strong> · {progress}</span><span aria-hidden>›</span>
        </Link>
      )}
    </section>
  );
}
