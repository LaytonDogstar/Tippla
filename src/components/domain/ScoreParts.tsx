"use client";
// SmartScore screen parts (screens.md §5): summary with embedded stage path, fortnightly trend (0–1,000),
// list-density factor rows with icons.
import { ArrowDownToLine, Banknote, BanknoteArrowUp, CalendarCheck, ChartNoAxesColumn, Check, ChevronRight, Layers, Wallet, type LucideIcon } from "lucide-react";
import type { FactorKey } from "@/lib/api/types";
import { scorePage as t } from "@/content/factors";
import { copy } from "@/content/en-AU";
import { formatDayMonth } from "@/lib/format";
import type { Factor, ScoreState } from "@/lib/selectors/score";
import { ringGeometry } from "@/lib/ui/geometry";
import { StageScale } from "./StageScale";
import { cx } from "@/components/ui/cx";

export const factorIcons: Record<FactorKey, LucideIcon> = {
  LOAN_AMOUNT_AND_TYPE: BanknoteArrowUp, ADVERSE_SPEND: Layers, DISPOSABLE_INCOME: Wallet, MISSED_PAYMENT: Check,
  PRODUCTIVE_SPEND: ChartNoAxesColumn, CASH_SPEND: Banknote, RELIABLE_PAYMENT_HISTORY: CalendarCheck, INCOME: ArrowDownToLine, GOVERNMENT_RELIANCE: ArrowDownToLine,
};

export function ScoreSummary({ state, onStage }: { state: Extract<ScoreState, { kind: "scored" }>; onStage?: (id: string) => void }) {
  const { score, stage } = state;
  const g = ringGeometry(112, 8, stage.progress);
  return (
    <section aria-label={t.title} className="rounded-lg bg-surface p-t4">
      <div className="flex items-center gap-t5">
        <div role="meter" aria-label="SmartScore" aria-valuemin={stage.stage.min} aria-valuemax={stage.next?.at ?? 1000} aria-valuenow={score}
          aria-valuetext={stage.next ? `SmartScore ${score}. ${stage.name}. ${stage.next.pointsToGo} points to ${stage.next.name}.` : `SmartScore ${score}. ${stage.name}.`}
          className="relative h-[112px] w-[112px] shrink-0">
          <svg aria-hidden width={112} height={112} viewBox="0 0 112 112">
            <circle cx={56} cy={56} r={g.r} fill="none" stroke="var(--chart-ring-track)" strokeWidth={8} />
            {!g.hideArc && <circle cx={56} cy={56} r={g.r} fill="none" stroke={`var(--stage-${stage.stage.id})`} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${g.dash} ${g.circumference}`} transform="rotate(-90 56 56)" />}
          </svg>
          <span aria-hidden className="tnum absolute inset-0 flex items-center justify-center text-h1 font-numeric text-text">{score}</span>
        </div>
        <div aria-hidden className="min-w-0">
          <p className="text-h3 text-text">{stage.name}</p>
          {stage.next ? (
            <>
              <p className="tnum mt-t2 text-h2 font-display text-text">{t.points(stage.next.pointsToGo)}</p>
              <p className="text-small text-text-muted">{t.toStageShort(stage.next.name)}</p>
              <p className="tnum mt-t1 text-caption text-text-muted">{t.range(stage.stage.min, stage.next.at)}</p>
            </>
          ) : <p className="mt-t2 text-small text-text-muted">{copy.score.topStage}</p>}
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
    <section aria-labelledby="trend-h" className="rounded-lg bg-surface p-t4">
      <h2 id="trend-h" className="text-h3 text-text">{t.trend}</h2>
      <div className="mt-t1 flex justify-between text-caption text-text-muted">
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
      className="flex min-h-[80px] w-full items-start gap-t3 rounded-md bg-surface p-t4 text-left hover:bg-surface2">
      <Icon aria-hidden size={20} className="mt-[2px] shrink-0 text-text-muted" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-t3">
          <span className="text-h3 text-text">{factor.name}</span>
          <span className={cx("tnum ml-auto text-small font-numeric", isNull ? "text-text-muted" : "text-text")}>{isNull ? "—" : `${factor.value!.toFixed(1)} / 10`}</span>
        </span>
        {(explanation || isNull) && <span className="mt-t2 block text-small text-text-muted">{isNull ? copy.score.factorNull : explanation}</span>}
      </span>
      <ChevronRight aria-hidden size={20} className="mt-[2px] shrink-0 text-text-muted" />
    </button>
  );
}
