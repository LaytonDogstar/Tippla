// SmartScore on Today (redesign 07/10/2026). Phones and tablets: a compact card (gauge, band, change, points to the
// next band) that opens the SmartScore page. Desktop: the full card with the band bar, what moved it (estimated)
// and the trend line. No score yet (thin file): says so, with the expected date.
import Link from "next/link";
import { ChevronRight, Info, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { todayCopy } from "@/content/today";
import { dashboard as d } from "@/content/dashboard";
import { copy, stageNames } from "@/content/en-AU";
import { STAGES } from "@/config/stages";
import { formatDate, formatDayMonth } from "@/lib/format";
import type { ScoreState } from "@/lib/selectors/score";
import type { ScoreAttribution } from "@/lib/selectors/scoreAttribution";
import { cx } from "@/components/ui/cx";
import { Card, IconBubble } from "./Card";

const t = todayCopy.score;
// Bands and names from the one source (config/stages, content/en-AU), never repeated here.
const BANDS = STAGES.map((s) => ({ ...s, name: stageNames[s.id] }));
const ARC = Math.PI * 90; // semicircle radius 90

export function Gauge({ score, band, size, decorative }: { score: number; band: string; size: "full" | "compact"; decorative?: boolean }) {
  const w = size === "full" ? 220 : 120;
  const dash = (Math.max(0, Math.min(1000, score)) / 1000) * ARC;
  const id = `g-${size}`;
  return (
    <div className="relative shrink-0" style={{ width: w, height: w * 118 / 220 }}>
      <svg role={decorative ? undefined : "img"} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : t.gaugeSr(score, band)} width={w} height={w * 118 / 220} viewBox="0 0 220 118">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" style={{ stopColor: "var(--color-accent-brand)" }} />
            <stop offset="1" style={{ stopColor: "var(--color-accent)" }} />
          </linearGradient>
        </defs>
        <path d="M20 110 A90 90 0 0 1 200 110" fill="none" style={{ stroke: "var(--color-chip)" }} strokeWidth={14} strokeLinecap="round" />
        <path d="M20 110 A90 90 0 0 1 200 110" fill="none" stroke={`url(#${id})`} strokeWidth={14} strokeLinecap="round" strokeDasharray={`${dash} 400`} />
      </svg>
      <div aria-hidden className="absolute inset-x-0 bottom-0 text-center">
        <div className={cx("font-bold leading-none text-text", size === "full" ? "text-[2.5rem] tracking-[-0.03em]" : "text-section-num")}>{score}</div>
      </div>
    </div>
  );
}

export function bandTone(id: string) { return id === "building" || id === "steadying" ? "text-caution" : "text-positive"; }

function Spark({ points, down }: { points: number[]; down: boolean }) {
  if (points.length < 2) return null;
  const min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * 120, 4 + (1 - (p - min) / span) * 26] as const);
  const last = xy.at(-1)!;
  const colour = down ? "var(--color-negative-mark)" : "var(--color-positive-mark)";
  return (
    <svg aria-hidden width={96} height={36} viewBox="0 0 124 36" className="shrink-0">
      <polyline points={xy.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" style={{ stroke: colour }} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={3.5} style={{ fill: "var(--color-surface)", stroke: colour }} strokeWidth={2} />
    </svg>
  );
}

export function SmartScoreCard({ state, change, attribution, trend }: {
  state: ScoreState; change: { delta: number; since: string } | null; attribution: ScoreAttribution | null; trend: { date: string; score: number }[];
}) {
  if (state.kind !== "scored") {
    return (
      <Card id="ss" title={t.heading} action={{ href: "/score", label: t.details }}>
        <div className="flex items-start gap-t3">
          <IconBubble icon={Info} tone="neutral" />
          <div>
            <p className="text-row text-text">{d.thinBody}</p>
            {state.kind === "override" && state.estimatedReadyDate && <p className="mt-t1 text-meta text-text-muted">{copy.score.thinFileDate(formatDate(state.estimatedReadyDate))}</p>}
          </div>
        </div>
      </Card>
    );
  }
  const { score, stage } = state;
  const delta = attribution?.delta ?? change?.delta ?? null;
  const since = attribution ? attribution.from.date : change?.since ?? null;
  const down = (delta ?? 0) < 0;
  const deltaText = delta === null || since === null ? null : delta === 0 ? t.steady(formatDayMonth(since)) : t.since(`${delta > 0 ? "+" : "–"}${Math.abs(delta)}`, formatDayMonth(since));
  const DeltaIcon = !delta ? Minus : down ? TrendingDown : TrendingUp;
  const deltaTone = !delta ? "text-text-secondary" : down ? "text-negative" : "text-positive";
  const next = stage.next ? t.toNext(stage.next.pointsToGo, stage.next.name, stage.next.at) : t.top;
  const parts = attribution?.parts.filter((p) => p.points !== 0).map((p) => `${p.short ? p.short[0]!.toUpperCase() + p.short.slice(1) : p.name} ${p.points > 0 ? "+" : "–"}${Math.abs(p.points)}`).join(" · ");
  const band = BANDS.find((b) => b.id === stage.stage.id) ?? BANDS[0]!;

  return (
    <>
      {/* Phones and tablets: compact; the whole card opens the SmartScore page. */}
      <Link href="/score" aria-label={`${t.open}: ${t.gaugeSr(score, stage.name)}. ${deltaText ?? ""} ${next}`}
        className="pressable flex items-center gap-t4 rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card desktop:hidden">
        <Gauge score={score} band={stage.name} size="compact" />
        <div aria-hidden className="min-w-0 flex-1">
          <p className="text-meta font-semibold text-text-muted">{t.heading}</p>
          <p className={cx("text-row", bandTone(band.id))}>{stage.name}</p>
          {deltaText && <p className={cx("mt-t1 inline-flex items-center gap-t1 text-meta font-bold", deltaTone)}><DeltaIcon size={14} strokeWidth={2} />{deltaText}</p>}
          <p className="text-meta text-text-secondary">{next}</p>
        </div>
        <ChevronRight aria-hidden size={20} className="shrink-0 text-icon-muted" />
      </Link>

      {/* Desktop: full card. */}
      <Card id="ss" title={t.heading} action={{ href: "/score", label: t.details }} className="hidden desktop:block">
        <div className="flex flex-col gap-t4">
          <div className="flex flex-col items-center">
            <Gauge score={score} band={stage.name} size="full" />
            <p className={cx("mt-t1 text-meta font-semibold", bandTone(band.id))}>{stage.name}</p>
          </div>
          <BandBar score={score} bandId={band.id} />
          {deltaText && (
            <div className="flex items-center gap-t3 rounded-inset bg-surface2 px-[14px] py-t3">
              <div className="min-w-0 flex-1">
                <p className={cx("flex items-center gap-[6px] text-body14 font-bold", deltaTone)}><DeltaIcon aria-hidden size={16} strokeWidth={2} />{deltaText}</p>
                {parts && <p className="mt-[2px] text-meta-s text-text-muted">{parts} <span className="sr-only">({t.estimated})</span></p>}
              </div>
              <Spark points={trend.slice(-6).map((p) => p.score)} down={down} />
            </div>
          )}
          <p className="text-meta text-text-secondary">{stage.next ? <><strong className="font-bold text-text">{stage.next.pointsToGo} points</strong> to {stage.next.name} at {stage.next.at}</> : t.top}</p>
        </div>
      </Card>
    </>
  );
}

/** The four bands with a marker at the score (Today's SmartScore and Your progress cards). */
export function BandBar({ score, bandId }: { score: number; bandId: string }) {
  return (
    <ol aria-label={t.bandsLabel} className="grid grid-cols-4 gap-[4px]">
      {BANDS.map((b) => {
        const here = b.id === bandId;
        const at = here ? Math.round(((score - b.min) / (b.max - b.min + 1)) * 100) : null;
        return (
          <li key={b.id} aria-current={here ? "step" : undefined} className="relative flex flex-col gap-[6px]">
            <span aria-hidden className="h-[5px] rounded-pill" style={{ background: `var(--band-${b.id})` }} />
            {at !== null && <span aria-hidden className="absolute -top-[4px] h-[13px] w-[13px] rounded-pill border-[3px] border-accent bg-surface" style={{ left: `calc(${at}% - 6px)` }} />}
            <span className={cx("text-meta-s", here ? "font-bold text-text" : "text-text-muted")}>{b.name}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** "−17 since 11/09" and what moved it ("New pay advance −9 · …"), from the attribution when there is one. */
export function scoreChangeText(change: { delta: number; since: string } | null, attribution: ScoreAttribution | null) {
  const delta = attribution?.delta ?? change?.delta ?? null;
  const since = attribution ? attribution.from.date : change?.since ?? null;
  const text = delta === null || since === null ? null : delta === 0 ? t.steady(formatDayMonth(since)) : t.since(`${delta > 0 ? "+" : "–"}${Math.abs(delta)}`, formatDayMonth(since));
  const parts = attribution?.parts.filter((p) => p.points !== 0).map((p) => `${p.short ? p.short[0]!.toUpperCase() + p.short.slice(1) : p.name} ${p.points > 0 ? "+" : "–"}${Math.abs(p.points)}`) ?? [];
  return { delta, text, parts };
}
