"use client";
// Component 11: a labelled grid with roving focus. Each date is one control; markers and balance are layers
// inside it (never separate tiny buttons). Lanes, top to bottom: date · spend/bill markers · payday · balance.
// Confirmed spend = one solid neutral dot (presence, not a count). Predicted bills = hollow outlined circles.
// Balance strips encode status, not size: confirmed = solid neutral, forecast = outline, below $0 = neutral
// hatch (confirmed dense, forecast open + dashed). Never a saturated red.
// UX round 2, 5.1: today and future cells are tinted by their forecast balance, soft tints only (rule 6): below $0
// soft negative with a warning icon and an outline (the shortfall day can't be missed), under $100 soft caution,
// otherwise soft positive.
import { ArrowDownToLine, ChevronRight, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { calendar as t } from "@/content/components";
import { formatDate, formatShortDay, formatWhole } from "@/lib/format";
import { formatCompact } from "@/lib/format/money";
import type { CalendarDay } from "@/lib/selectors/calendar";
import { cx } from "@/components/ui/cx";

const HATCH_FORECAST = { background: "repeating-linear-gradient(45deg, var(--chart-hatch) 0 2px, var(--color-surface) 2px 10px)", outline: "2px dashed var(--chart-predicted)", outlineOffset: -2 };
const HATCH_CONFIRMED = { background: "repeating-linear-gradient(45deg, var(--chart-hatch) 0 2px, var(--color-neutral-soft) 2px 6px)" };

export function BalanceStrip({ day }: { day: Pick<CalendarDay, "balance" | "balancePredicted" | "belowZero"> }) {
  if (day.balance === null) return null;
  const style = day.belowZero
    ? day.balancePredicted ? HATCH_FORECAST : HATCH_CONFIRMED
    : day.balancePredicted ? { outline: "2px solid var(--chart-predicted)", outlineOffset: -2, background: "var(--color-surface)" } : { background: "var(--color-neutral)" };
  return <span aria-hidden className="block h-[14px] w-[36px] rounded-[4px]" style={style} />;
}

/** Under this (but not below $0) a forecast balance is "low" in the calendar tint. */
export const LOW_BALANCE = 100;
const tintFor = (d: CalendarDay) => (d.balance === null || d.outside || (!d.isToday && !d.isFuture) ? null
  : d.belowZero ? "negative" : d.balance < LOW_BALANCE ? "caution" : "positive");
const TINT = { negative: "bg-negative-soft shadow-[inset_0_0_0_2px_var(--color-negative)]", caution: "bg-caution-soft", positive: "bg-positive-soft" } as const;

export function CalendarGrid({ days, label, nextPayday, selected, rangeFrom, rangeTo, initialFocus, onDay, onNextPayday }: {
  days: CalendarDay[];
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
                const parts = [
                  d.isToday && t.today,
                  d.confirmedCount ? `${t.spendCount(d.confirmedCount)} ${formatWhole(d.confirmedSpend)}` : null,
                  ...d.predictedBills.map((x) => t.billPredicted(x.merchant, formatWhole(x.expected_amount))),
                  ...d.predictedIncome.map((p) => t.incomeExpected(p.payer)),
                  d.isPayday && !d.predictedIncome.length ? t.pay : null,
                  d.balance !== null ? `${d.balancePredicted ? t.forecastBalance : t.confirmedClosing} ${formatWhole(d.balance)}` : t.balanceUnavailable,
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
                        "relative flex min-h-[106px] w-full flex-col items-center gap-t1 rounded-xs pb-t1 pt-t2",
                        selected === d.date ? "bg-accent-soft shadow-[inset_0_0_0_2px_var(--color-accent)]"
                          : inRange ? "bg-accent-soft" : tintFor(d) ? TINT[tintFor(d)!] : "bg-surface hover:bg-surface2",
                      )}
                    >
                      <span aria-hidden className={cx("tnum text-small font-numeric", d.outside ? "text-text-muted" : "text-text", d.isToday && "underline decoration-2 underline-offset-4")}>
                        {Number(d.date.slice(8))}
                      </span>
                      <span aria-hidden className="flex min-h-[10px] items-center gap-[3px]">
                        {d.confirmedCount > 0 && <span className="h-[6px] w-[6px] rounded-pill bg-neutral" />}
                        {d.predictedBills.slice(0, 2).map((x) => <span key={x.merchant} className="h-[8px] w-[8px] rounded-pill border-2 bg-surface" style={{ borderColor: "var(--chart-predicted)" }} />)}
                      </span>
                      {d.isPayday && (
                        <span aria-hidden className="flex flex-col items-center text-accent">
                          <ArrowDownToLine size={16} />
                          <span className="text-caption">{t.pay}</span>
                        </span>
                      )}
                      {d.balance !== null && (
                        <span aria-hidden className="mt-auto flex flex-col items-center gap-[2px]">
                          <BalanceStrip day={d} />
                          <span className={cx("tnum inline-flex items-center gap-[2px] text-meta font-semibold", d.belowZero && tintFor(d) ? "text-negative" : "text-text")}>
                            {d.belowZero && tintFor(d) && <TriangleAlert size={11} strokeWidth={2.4} />}{formatCompact(d.balance)}
                          </span>
                        </span>
                      )}
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
