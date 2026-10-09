"use client";
// Component 11: a labelled grid with roving focus. Each date is one control; markers and balance are layers
// inside it (never separate tiny buttons). Lanes, top to bottom: date · markers · end-of-day balance.
// 08/10/2026 (the timeline is now the main view; this grid is the secondary one):
// - markers: confirmed spend = a small solid dot; a predicted bill of $100 or more shows its amount in a dashed
//   chip (and its name on wide screens); smaller bills are hollow dots; payday takes the lane on its own day.
// - tints say how close the balance gets, relative to this view, never a fixed cutoff: below $0 is the soft
//   negative tint with an outline (rule 6); "close to $0" (under a fifth of the view's highest forecast balance)
//   is soft caution; the lowest point gets a dashed outline. Everything else stays plain.
// - no balance strips: the number is the balance. After the forecast ends a day shows a dash, and says why.
import { ArrowDownToLine, ChevronRight, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { calendar as t } from "@/content/components";
import { formatDate, formatShortDay, formatWhole } from "@/lib/format";
import { formatCompact } from "@/lib/format/money";
import type { CalendarDay } from "@/lib/selectors/calendar";
import { cx } from "@/components/ui/cx";

/** Predicted bills at or over this show their amount in the grid; smaller ones are dots. */
export const BIG_BILL = 100;

/** "Close to $0" for this view: under a fifth of the highest balance from today on. */
export function closeToZero(days: CalendarDay[]): number {
  const ahead = days.filter((d) => !d.outside && d.balance !== null && (d.isToday || d.isFuture)).map((d) => d.balance!);
  return ahead.length ? Math.max(0, ...ahead) * 0.2 : 0;
}

export type DayTint = "negative" | "caution" | "lowest";
export function tintFor(d: CalendarDay, close: number, lowest: string | null | undefined): DayTint | null {
  if (d.balance === null || d.outside || (!d.isToday && !d.isFuture)) return null;
  if (d.belowZero) return "negative";
  if (d.date === lowest) return "lowest";
  return d.balance < close ? "caution" : null;
}
const TINT: Record<DayTint, string> = {
  negative: "bg-negative-soft shadow-[inset_0_0_0_2px_var(--color-negative)]",
  caution: "bg-caution-soft",
  lowest: "bg-surface [outline:2px_dashed_var(--color-text-secondary)] [outline-offset:-3px]",
};

export function CalendarGrid({ days, label, nextPayday, selected, rangeFrom, rangeTo, initialFocus, onDay, onNextPayday, lowest = null }: {
  days: CalendarDay[];
  /** The view's lowest forecast balance (dashed outline). */
  lowest?: string | null;
  label: string;
  nextPayday?: string | null;
  selected?: string | null;
  /** Range selection highlight (inclusive). */
  rangeFrom?: string | null;
  rangeTo?: string | null;
  /** Date that takes the roving tab stop first (defaults to today, then the first day). */
  initialFocus?: string | null;
  onDay?: (d: CalendarDay, el: HTMLButtonElement) => void;
  onNextPayday?: () => void;
}) {
  const start = () => {
    const pick = initialFocus ?? selected;
    const i = pick ? days.findIndex((d) => d.date === pick) : -1;
    return i >= 0 ? i : Math.max(0, days.findIndex((d) => d.isToday));
  };
  const [focus, setFocus] = useState(start);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setFocus(start()), [days[0]?.date, days.length]);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const headers = days.slice(0, 7).map((d) => d.weekday);
  const [a, b] = rangeFrom && rangeTo ? (rangeFrom <= rangeTo ? [rangeFrom, rangeTo] : [rangeTo, rangeFrom]) : [rangeFrom ?? null, rangeFrom ?? null];

  const move = (i: number) => {
    const n = Math.max(0, Math.min(days.length - 1, i));
    setFocus(n);
    cells.current[n]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const map: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + 7, ArrowUp: i - 7, Home: i - (i % 7), End: i - (i % 7) + 6 };
    if (e.key in map) { e.preventDefault(); move(map[e.key]!); }
  };
  const close = closeToZero(days);
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, w) => days.slice(w * 7, w * 7 + 7));

  return (
    <div>
      <table role="grid" aria-label={label} className="w-full table-fixed border-collapse">
        <thead>
          <tr>{headers.map((h) => <th key={h} scope="col" className="pb-t2 text-meta font-semibold text-text-muted">{h}</th>)}</tr>
        </thead>
        <tbody>
          {weeks.map((week, w) => (
            <tr key={w}>
              {week.map((d, j) => {
                const i = w * 7 + j;
                const inRange = !!a && !!b && d.date >= a && d.date <= b;
                const tint = tintFor(d, close, lowest);
                const big = d.predictedBills.filter((x) => x.expected_amount >= BIG_BILL).sort((x, y) => y.expected_amount - x.expected_amount);
                const small = d.predictedBills.filter((x) => x.expected_amount < BIG_BILL);
                const parts = [
                  d.isToday && t.today,
                  d.confirmedCount ? `${t.spendCount(d.confirmedCount)} ${formatWhole(d.confirmedSpend)}` : null,
                  ...d.predictedBills.map((x) => t.billPredicted(x.merchant, formatWhole(x.expected_amount))),
                  ...d.predictedIncome.map((p) => t.incomeExpected(p.payer)),
                  d.isPayday && !d.predictedIncome.length ? t.pay : null,
                  d.balance !== null ? `${d.balancePredicted ? t.forecastBalance : t.confirmedClosing} ${formatWhole(d.balance)}` : t.balanceUnavailable,
                  tint === "lowest" ? t.lowestPoint : tint === "caution" ? t.closeToZero : null,
                  inRange ? t.inRange : null,
                ].filter(Boolean) as string[];
                return (
                  <td key={d.date} role="gridcell" aria-selected={selected === d.date || inRange} className="p-0 align-top">
                    <button
                      ref={(el) => { cells.current[i] = el; }}
                      type="button"
                      tabIndex={i === focus ? 0 : -1}
                      onKeyDown={(e) => onKey(e, i)}
                      onFocus={() => setFocus(i)}
                      onClick={(e) => onDay?.(d, e.currentTarget)}
                      aria-label={t.dayLabel(`${formatShortDay(d.date)}/${d.date.slice(0, 4)}`, parts)}
                      aria-current={d.isToday ? "date" : undefined}
                      className={cx(
                        "relative flex min-h-[88px] w-full flex-col items-center gap-t1 rounded-xs px-[2px] pb-t1 pt-t2",
                        selected === d.date ? "bg-accent-soft shadow-[inset_0_0_0_2px_var(--color-accent)]"
                          : inRange ? "bg-accent-soft" : tint ? TINT[tint] : "bg-surface hover:bg-surface2",
                      )}
                    >
                      <span aria-hidden className={cx("tnum text-small font-numeric", d.outside ? "text-text-muted" : "text-text", d.isToday && "underline decoration-2 underline-offset-4")}>
                        {Number(d.date.slice(8))}
                      </span>
                      {/* Payday sits in the marker lane (not a lane of its own), so every cell in a week stays the same height. */}
                      <span aria-hidden className="flex min-h-[18px] w-full flex-col items-center gap-[2px]">
                        {d.isPayday ? (
                          <span className="inline-flex items-center gap-[1px] text-caption font-semibold text-accent"><ArrowDownToLine size={12} strokeWidth={2.4} />{t.pay}</span>
                        ) : big.length ? (
                          <>
                            <span className="hidden w-full truncate text-center text-caption text-text-muted desktop:block">{big[0]!.merchant}</span>
                            <span className="tnum rounded-[4px] border border-dashed px-[3px] text-caption font-semibold text-text" style={{ borderColor: "var(--chart-predicted)" }}>
                              {cellAmount(big.reduce((n, x) => n + x.expected_amount, 0))}{big.length > 1 ? "+" : ""}
                            </span>
                          </>
                        ) : (
                          <span className="flex items-center gap-[3px] pt-[4px]">
                            {d.confirmedCount > 0 && <span className="h-[6px] w-[6px] rounded-pill bg-neutral" />}
                            {small.slice(0, 2).map((x) => <span key={x.merchant} className="h-[8px] w-[8px] rounded-pill border-2 bg-surface" style={{ borderColor: "var(--chart-predicted)" }} />)}
                          </span>
                        )}
                      </span>
                      <span aria-hidden className={cx("tnum mt-auto inline-flex items-center gap-[2px] text-meta",
                        d.balance === null ? "text-text-muted" : tint === "negative" ? "font-semibold text-negative" : tint === "lowest" ? "font-bold text-text" : "font-semibold text-text")}>
                        {d.balance === null ? "–" : <>{tint === "negative" && <TriangleAlert size={11} strokeWidth={2.4} />}{cellAmount(d.balance)}</>}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {nextPayday && (
        <button type="button" onClick={onNextPayday} className="mt-t3 flex min-h-tap w-full items-center gap-t2 rounded-sm bg-accent-soft py-t1 px-t3 text-small text-accent">
          <ArrowDownToLine aria-hidden size={20} />
          <span className="flex-1 text-left">{t.nextPayday(formatShortDay(nextPayday))}</span>
          <ChevronRight aria-hidden size={20} />
        </button>
      )}
    </div>
  );
}

/** Day sheet body for the component library (the Calendar screen has a fuller sheet). */
export function DayDetail({ day }: { day: CalendarDay }) {
  return (
    <div className="flex flex-col gap-t4">
      <p className="text-small text-text-muted">{formatDate(day.date)}</p>
      {day.predictedIncome.map((p) => (
        <div key={p.payer} className="flex justify-between gap-t3 text-small text-text">
          <span>{t.expectedPayday} · {p.payer}</span><span className="tnum">{formatWhole(p.amount)}</span>
        </div>
      ))}
      {day.predictedBills.map((b) => (
        <div key={b.merchant} className="rounded-sm border border-dashed p-t3" style={{ borderColor: "var(--chart-predicted)" }}>
          <div className="flex justify-between gap-t3 text-small text-text"><span>{b.merchant}</span><span className="tnum text-body-strong">{formatWhole(b.expected_amount)}</span></div>
          <p className="text-caption text-text-muted">{formatShortDay(b.date)} · {t.predicted}</p>
        </div>
      ))}
      <div>
        <p className="text-small text-text-muted">{day.balance === null ? t.balanceUnavailable : day.balancePredicted ? t.forecastBalance : t.confirmedClosing}</p>
        {day.balance !== null && <p className="tnum text-body-strong text-text">{formatWhole(day.balance)}{day.balancePredicted && <span className="ml-t2 text-caption text-text-muted">{t.forecast}</span>}</p>}
      </div>
    </div>
  );
}

// Day cells are about 50px wide on a phone: $1,000 and over shows as $1.4k (the day's label has the full figure).
function cellAmount(n: number) {
  if (Math.abs(n) < 1000) return formatCompact(n);
  const k = Math.round(Math.abs(n) / 100) / 10;
  return `${n < 0 ? "−" : ""}$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
}
