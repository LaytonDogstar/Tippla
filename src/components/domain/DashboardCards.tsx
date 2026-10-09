"use client";
// Home compositions from screens.md: compact SmartScoreCard, compact next-step card, contextual banner,
// next-bill card and the six-month spending control. Separate targets, never a card-sized button with nested controls.
import { CalendarDays, ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import { dashboard as t } from "@/content/dashboard";
import { copy } from "@/content/en-AU";
import { formatDate, formatDayMonth, formatMonthShort, formatShortDay, formatWhole } from "@/lib/format";
import type { MonthBar } from "@/lib/selectors/monthly";
import type { ScoreState } from "@/lib/selectors/score";
import type { UpcomingBill } from "@/lib/api/types";
import { ringGeometry } from "@/lib/ui/geometry";
import { Button } from "@/components/ui/Button";
import { ScoreChangeLine } from "./ScoreChange";
import type { ScoreAttribution } from "@/lib/selectors/scoreAttribution";

export function HomeBanner({ text, href }: { text: string; href: string }) {
  return (
    <Link href={href} className="flex min-h-[48px] items-center gap-t3 rounded-md bg-accent-soft px-t4 py-t3 text-body text-accent hover:shadow-[inset_0_0_0_2px_var(--color-accent)]">
      <span className="flex-1">{text}</span>
      <ChevronRight aria-hidden size={20} />
    </Link>
  );
}

export function SmartScoreCard({ state, change, attribution = null }: { state: ScoreState; change: { delta: number; since: string } | null; attribution?: ScoreAttribution | null }) {
  if (state.kind !== "scored") {
    return (
      <section className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t4" aria-labelledby="ssc">
        <h2 id="ssc" className="text-card text-text sm:text-card-l">{t.thinHeader}</h2>
        <div className="mt-t3 flex items-start gap-t3">
          <span aria-hidden className="inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-pill bg-neutral-soft text-neutral"><Info size={24} /></span>
          <div>
            <p className="text-h3 text-text">{t.thinBody}</p>
            {state.kind === "override" && state.estimatedReadyDate && <p className="mt-t1 text-small text-text-muted">{copy.score.thinFileDate(formatDate(state.estimatedReadyDate))}</p>}
          </div>
        </div>
        <Link href="/score" className="mt-t3 flex min-h-tap items-center justify-between rounded-sm text-small text-accent hover:bg-surface2">{t.seeShaping}<ChevronRight aria-hidden size={20} /></Link>
      </section>
    );
  }
  const { score, stage } = state;
  const g = ringGeometry(48, 4, stage.progress);
  return (
    <section className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t4" aria-labelledby="ssc">
      <div className="flex items-baseline justify-between gap-t3">
        <h2 id="ssc" className="text-card text-text sm:text-card-l">{t.scoreHeader(score, stage.name)}</h2>
        <span className="tnum text-caption text-text-muted">{t.scoreRange(stage.stage.min, stage.stage.max)}</span>
      </div>
      <div className="mt-t3 flex items-start gap-t4">
        <svg aria-hidden width={48} height={48} viewBox="0 0 48 48" className="mt-t1 shrink-0">
          <circle cx={24} cy={24} r={g.r} fill="none" stroke="var(--chart-ring-track)" strokeWidth={4} />
          {!g.hideArc && <circle cx={24} cy={24} r={g.r} fill="none" stroke={`var(--stage-${stage.stage.id})`} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${g.dash} ${g.circumference}`} transform="rotate(-90 24 24)" />}
        </svg>
        <div className="min-w-0">
          {stage.next ? (
            <>
              <p className="tnum text-h2 font-display text-text">{t.points(stage.next.pointsToGo)}</p>
              <p className="text-small text-text-muted">{t.toStage(stage.next.name, stage.next.at)}</p>
            </>
          ) : <p className="text-h2 font-display text-text">{t.topStage}</p>}
          <ScoreChangeLine change={change} attribution={attribution} />
        </div>
      </div>
      <Link href="/score" className="mt-t2 flex min-h-tap items-center justify-between rounded-sm text-small text-accent hover:bg-surface2">{t.seeShaping}<ChevronRight aria-hidden size={20} /></Link>
    </section>
  );
}

export function NextStepCard({ title, rationale, onSeeHow }: { title: string; rationale: string; onSeeHow: () => void }) {
  return (
    <section className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t4" aria-labelledby="nst">
      <p className="text-caption text-text-muted">{t.nextThing}</p>
      <div className="mt-t2 flex flex-wrap items-start justify-between gap-t3">
        <h2 id="nst" className="min-w-0 max-w-[218px] flex-1 text-h3 text-text">{title}</h2>
        <Button variant="outline" onClick={onSeeHow} aria-label={`${t.seeHow}: ${title}`}>{t.seeHow}</Button>
      </div>
      <p className="mt-t3 text-small text-text-muted">{rationale}</p>
    </section>
  );
}

export function NextBillCard({ bill }: { bill: UpcomingBill }) {
  return (
    <Link href={`/calendar?day=${bill.date}`} className="flex items-center gap-t3 rounded-card-s bg-surface shadow-card sm:rounded-card p-t4 hover:bg-surface2">
      <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-surface2 text-neutral"><CalendarDays size={24} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-caption text-text-muted">{t.nextBill(formatShortDay(bill.date))}</span>
        <span className="mt-t1 flex items-baseline justify-between gap-t3">
          <span className="text-h3 text-text">{bill.merchant}</span>
          <span className="tnum text-h3 font-numeric text-text">{formatWhole(bill.expected_amount)}</span>
        </span>
        <span className="mt-t1 flex items-center justify-between text-small text-text-muted">
          {t.predicted}
          <span aria-hidden className="h-[8px] w-[8px] rounded-pill border-2" style={{ borderColor: "var(--chart-predicted)" }} />
        </span>
      </span>
    </Link>
  );
}

/** Six-month spending as a control: tap a month to open Spending for it. Fixed 0–7,000 domain; Sep partial hatched. */
export function SixMonthChart({ bars, asOf, domainMax = 7000 }: { bars: MonthBar[]; asOf: string; domainMax?: number }) {
  const max = Math.max(domainMax, ...bars.map((b) => b.total ?? 0));
  const first = bars[0], last = bars.at(-1);
  const partial = last?.partial ? t.partial(formatMonthShort(last.month), formatDayMonth(asOf)) : null;
  return (
    <section className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t4" aria-labelledby="six">
      <div className="flex items-center justify-between gap-t3">
        <h2 id="six" className="text-card text-text sm:text-card-l">{t.spending}</h2>
        <Link href="/spending?period=6_months" className="inline-flex min-h-tap items-center rounded-sm px-t2 text-small text-accent hover:bg-surface2">{t.sixMonths}</Link>
      </div>
      {first && last && <p className="text-caption text-text-muted">{t.range(formatMonthShort(first.month), formatMonthShort(last.month), partial)}</p>}
      <ul className="mt-t4 grid grid-cols-6 items-end gap-t1" style={{ height: 150 }}>
        {bars.map((b) => {
          const h = b.total === null ? 0 : Math.max(2, (b.total / max) * 100);
          const label = formatMonthShort(b.month);
          return (
            <li key={b.month} className="h-full">
              <Link href={`/spending?month=${b.month}`} aria-label={b.total === null ? `${label}: ${t.noData}` : t.monthBar(label, formatWhole(b.total), b.partial)}
                className="flex h-full min-w-tap flex-col items-center justify-end rounded-sm hover:bg-surface2">
                <span aria-hidden className="tnum mb-t1 text-caption text-text">{b.total === null ? "—" : formatWhole(b.total)}</span>
                <span aria-hidden className="w-[24px] rounded-t-xs"
                  style={{ height: `${h}%`, background: b.partial ? "repeating-linear-gradient(135deg, var(--chart-hatch) 0 2px, var(--color-surface) 2px 6px)" : "var(--color-accent)", outline: b.partial ? "2px solid var(--chart-predicted)" : undefined, outlineOffset: -2 }} />
              </Link>
            </li>
          );
        })}
      </ul>
      <ul aria-hidden className="mt-t2 grid grid-cols-6 border-t border-divider pt-t2 text-center text-caption text-text-muted">
        {bars.map((b) => <li key={b.month}>{formatMonthShort(b.month)}</li>)}
      </ul>
      <p className="mt-t2 text-caption text-text-muted">{t.tapMonth}</p>
    </section>
  );
}
