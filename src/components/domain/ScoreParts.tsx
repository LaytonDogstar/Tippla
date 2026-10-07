"use client";
// SmartScore screen parts (screens.md §5): summary with embedded stage path, fortnightly trend (0–1,000),
// list-density factor rows with icons.
import { ArrowDownToLine, Banknote, BanknoteArrowUp, CalendarCheck, ChartNoAxesColumn, Check, ChevronRight, Layers, Wallet, type LucideIcon } from "lucide-react";
import type { FactorKey } from "@/lib/api/types";
import { scorePage as t } from "@/content/factors";
import { copy } from "@/content/en-AU";
import { formatDayMonth } from "@/lib/format";
import type { Factor, ScoreState } from "@/lib/selectors/score";
import { Gauge, bandTone } from "@/components/today/SmartScoreCard";
import { StageScale } from "./StageScale";
import { cx } from "@/components/ui/cx";

export const factorIcons: Record<FactorKey, LucideIcon> = {
  LOAN_AMOUNT_AND_TYPE: BanknoteArrowUp, ADVERSE_SPEND: Layers, DISPOSABLE_INCOME: Wallet, MISSED_PAYMENT: Check,
  PRODUCTIVE_SPEND: ChartNoAxesColumn, CASH_SPEND: Banknote, RELIABLE_PAYMENT_HISTORY: CalendarCheck, INCOME: ArrowDownToLine, GOVERNMENT_RELIANCE: ArrowDownToLine,
};

export function ScoreSummary({ state, onStage }: { state: Extract<ScoreState, { kind: "scored" }>; onStage?: (id: string) => void }) {
  const { score, stage } = state;
  return (
    <section aria-label={t.title} className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card sm:p-t6">
      <div className="flex flex-col items-center gap-t4 sm:flex-row sm:items-center sm:gap-t6">
        <div role="meter" aria-label="SmartScore" aria-valuemin={stage.stage.min} aria-valuemax={stage.next?.at ?? 1000} aria-valuenow={score}
          aria-valuetext={stage.next ? `SmartScore ${score}. ${stage.name}. ${stage.next.pointsToGo} points to ${stage.next.name}.` : `SmartScore ${score}. ${stage.name}.`}>
          <Gauge score={score} band={stage.name} size="full" decorative />
        </div>
        <div aria-hidden className="min-w-0 text-center sm:text-left">
          <p className={cx("text-row", bandTone(stage.stage.id))}>{stage.name}</p>
          {stage.next ? (
            <>
              <p className="tnum mt-t1 text-section-num text-text">{t.points(stage.next.pointsToGo)}</p>
              <p className="text-body14 text-text-secondary">{t.toStageShort(stage.next.name)}</p>
              <p className="tnum mt-t1 text-meta text-text-muted">{t.range(stage.stage.min, stage.next.at)}</p>
            </>
          ) : <p className="mt-t2 text-body14 text-text-secondary">{copy.score.topStage}</p>}
        </div>
      </div>
      <div className="mt-t5"><StageScale embedded score={score} stage={stage} onStage={onStage} /></div>
    </section>
  );
}

export function TrendChart({ points, onPoint }: { points: { date: string; score: number }[]; onPoint?: (p: { date: string; score: number }) => void }) {
  if (points.length < 2) return null;
  const W = 318, H = 72;
  // Points sit at the centre of equal columns, so each has a ≥44 px hit zone.
  const x = (i: number) => ((i + 0.5) * W) / points.length;
  const y = (v: number) => H - (v / 1000) * H; // fixed 0–1,000: a 49-point change is not exaggerated
  return (
    <section aria-labelledby="trend-h" className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card sm:p-t6">
      <h2 id="trend-h" className="text-card text-text sm:text-card-l">{t.trend}</h2>
      <div className="mt-t1 flex justify-between text-meta text-text-muted">
        <span>{formatDayMonth(points[0]!.date)} → {formatDayMonth(points.at(-1)!.date)}</span><span>{t.trendScale}</span>
      </div>
      <div className="relative mt-t3" style={{ height: H + 28 }}>
        <svg aria-hidden width="100%" height={H + 28} viewBox={`0 0 ${W} ${H + 28}`} preserveAspectRatio="none" className="absolute inset-0">
          <polyline fill="none" stroke="var(--color-accent)" strokeWidth={2} points={points.map((p, i) => `${x(i)},${y(p.score) + 24}`).join(" ")} vectorEffect="non-scaling-stroke" />
          <line x1={0} x2={W} y1={H + 24} y2={H + 24} stroke="var(--color-line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>
        <ol className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
          {points.map((p) => (
            <li key={p.date} className="relative">
              <button type="button" onClick={() => onPoint?.(p)} aria-label={t.trendPoint(formatDayMonth(p.date), p.score)}
                className="absolute inset-0 flex min-w-tap flex-col items-center rounded-sm hover:bg-surface2">
                <span aria-hidden className="tnum text-caption text-text">{p.score}</span>
                <span aria-hidden className="absolute h-[8px] w-[8px] rounded-pill border-2 border-accent bg-surface"
                  style={{ top: y(p.score) + 24 - 4, left: "calc(50% - 4px)" }} />
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div aria-hidden className="mt-t2 flex justify-between text-caption text-text-muted">
        <span>{formatDayMonth(points[0]!.date)}</span><span>{formatDayMonth(points.at(-1)!.date)}</span>
      </div>
    </section>
  );
}

export function FactorRow({ factor, explanation, onOpen }: { factor: Factor; explanation?: string; onOpen: () => void }) {
  const Icon = factorIcons[factor.key];
  const isNull = factor.value === null;
  return (
    <button type="button" onClick={onOpen}
      className="pressable flex min-h-[80px] w-full items-start gap-t3 rounded-card-s bg-surface p-t4 text-left shadow-card hover:bg-surface2 sm:rounded-card sm:px-t5">
      <span aria-hidden className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-pill bg-accent-soft text-accent"><Icon size={18} strokeWidth={1.8} /></span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-t3">
          <span className="text-row text-text">{factor.name}</span>
          <span className={cx("tnum ml-auto text-[0.9375rem] font-bold", isNull ? "text-text-muted" : "text-text")}>{isNull ? "—" : `${factor.value!.toFixed(1)} / 10`}</span>
        </span>
        {/* Out of 10, in the brand colour only: never red or green for a factor (no "good" or "bad" fill). */}
        {!isNull && (
          <span aria-hidden className="mt-t2 block h-[6px] overflow-hidden rounded-pill bg-chip">
            <span className="block h-full rounded-pill bg-accent" style={{ width: `${Math.max(2, Math.min(100, factor.value! * 10))}%` }} />
          </span>
        )}
        {(explanation || isNull) && <span className="mt-t2 block text-meta text-text-secondary">{isNull ? copy.score.factorNull : explanation}</span>}
      </span>
      <ChevronRight aria-hidden size={20} className="mt-[10px] shrink-0 text-icon-muted" />
    </button>
  );
}
