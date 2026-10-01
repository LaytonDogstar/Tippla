"use client";
// Component 11: a labelled grid with roving focus. Each date is one control; markers and balance are layers.
// Predicted bills = hollow outlined circles. Below $0 = neutral hatch (confirmed dense, forecast open + dashed). Never red.
import { ArrowDownToLine, ChevronRight } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { calendar as t } from "@/content/components";
import { formatDate, formatShortDay, formatWhole } from "@/lib/format";
import type { CalendarDay } from "@/lib/selectors/calendar";
import { catVar } from "@/components/icons";
import { cx } from "@/components/ui/cx";

const WEEKDAYS_FROM = (first: string) => {
  const order = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const i = order.indexOf(first);
  return [...order.slice(i), ...order.slice(0, i)];
};

export function CalendarGrid({ days, label, nextPayday, spendCategories, onDay, onNextPayday }: {
  days: CalendarDay[];
  label: string;
  nextPayday?: string | null;
  /** Categories of confirmed spend per day (for dots). */
  spendCategories?: Record<string, string[]>;
  onDay?: (d: CalendarDay) => void;
  onNextPayday?: () => void;
}) {
  const [focus, setFocus] = useState(() => Math.max(0, days.findIndex((d) => d.isToday)));
  const [selected, setSelected] = useState<string | null>(null);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const headers = WEEKDAYS_FROM(days[0]?.weekday ?? "Mon");

  const move = (i: number) => {
    const n = Math.max(0, Math.min(days.length - 1, i));
    setFocus(n);
    cells.current[n]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const map: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + 7, ArrowUp: i - 7, Home: i - (i % 7), End: i - (i % 7) + 6 };
    if (e.key in map) { e.preventDefault(); move(map[e.key]!); }
  };
  const rows = [days.slice(0, 7), days.slice(7, 14)];

  return (
    <div>
      <table role="grid" aria-label={label} className="w-full table-fixed border-collapse">
        <thead>
          <tr>{headers.map((h) => <th key={h} scope="col" className="pb-t2 text-caption font-medium text-text-muted">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((week, w) => (
            <tr key={w}>
              {week.map((d, j) => {
                const i = w * 7 + j;
                const cats = spendCategories?.[d.date] ?? [];
                const parts = [
                  d.isToday && t.today,
                  d.confirmedCount ? `${t.spendCount(d.confirmedCount)} ${formatWhole(d.confirmedSpend)}` : null,
                  ...d.predictedBills.map((b) => t.billPredicted(b.merchant, formatWhole(b.expected_amount))),
                  ...d.predictedIncome.map((p) => t.incomeExpected(p.payer)),
                  d.isPayday && !d.predictedIncome.length ? t.pay : null,
                  d.balance !== null ? `${d.balancePredicted ? t.forecastBalance : t.confirmedClosing} ${formatWhole(d.balance)}` : t.balanceUnavailable,
                ].filter(Boolean) as string[];
                return (
                  <td key={d.date} role="gridcell" aria-selected={selected === d.date} className="p-0 align-top">
                    <button
                      ref={(el) => { cells.current[i] = el; }}
                      type="button"
                      tabIndex={i === focus ? 0 : -1}
                      onKeyDown={(e) => onKey(e, i)}
                      onFocus={() => setFocus(i)}
                      onClick={() => { setSelected(d.date); onDay?.(d); }}
                      aria-label={t.dayLabel(formatShortDay(d.date), parts)}
                      aria-current={d.isToday ? "date" : undefined}
                      className={cx(
                        "relative flex min-h-[72px] w-full flex-col items-center rounded-xs pb-t1 pt-t1",
                        selected === d.date ? "bg-accent-soft shadow-[inset_0_0_0_2px_var(--color-accent)]" : "bg-surface hover:bg-surface2",
                      )}
                    >
                      <span aria-hidden className={cx("tnum text-small font-numeric text-text", d.isToday && "underline decoration-2 underline-offset-4")}>
                        {Number(d.date.slice(8))}
                      </span>
                      <span aria-hidden className="mt-t1 flex min-h-[10px] items-center gap-[2px]">
                        {cats.slice(0, cats.length > 3 ? 2 : 3).map((c, k) => <span key={k} className="h-[6px] w-[6px] rounded-pill" style={{ background: catVar(c) }} />)}
                        {cats.length > 3 && <span className="text-caption text-text-muted">{t.more(cats.length - 2)}</span>}
                        {d.predictedBills.map((b) => <span key={b.merchant} className="h-[8px] w-[8px] rounded-pill border-2 bg-surface" style={{ borderColor: "var(--chart-predicted)" }} />)}
                      </span>
                      {d.isPayday && (
                        <span aria-hidden className="flex flex-col items-center text-accent">
                          <ArrowDownToLine size={16} />
                          <span className="text-caption">{t.pay}</span>
                        </span>
                      )}
                      {d.belowZero && (
                        <span
                          aria-hidden
                          className="mt-auto h-[14px] w-[36px] rounded-[4px]"
                          style={d.balancePredicted
                            ? { background: "repeating-linear-gradient(45deg, var(--chart-hatch) 0 2px, var(--color-surface) 2px 10px)", outline: "2px dashed var(--chart-predicted)", outlineOffset: -2 }
                            : { background: "repeating-linear-gradient(45deg, var(--chart-hatch) 0 2px, var(--color-neutral-soft) 2px 6px)" }}
                        />
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
        <button type="button" onClick={onNextPayday} className="mt-t3 flex h-tap w-full items-center gap-t2 rounded-sm bg-accent-soft px-t3 text-small text-accent">
          <ArrowDownToLine aria-hidden size={20} />
          <span className="flex-1 text-left">{t.nextPayday(formatShortDay(nextPayday))}</span>
          <ChevronRight aria-hidden size={20} />
        </button>
      )}
    </div>
  );
}

/** Day sheet body: observed spend, predicted bills, expected income, balance source. */
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
          <p className="text-caption text-text-muted">{formatShortDay(b.date)} · predicted</p>
        </div>
      ))}
      <div>
        <p className="text-small text-text-muted">{day.balance === null ? t.balanceUnavailable : day.balancePredicted ? t.forecastBalance : t.confirmedClosing}</p>
        {day.balance !== null && <p className="tnum text-body-strong text-text">{formatWhole(day.balance)}{day.balancePredicted && <span className="ml-t2 text-caption text-text-muted">{t.forecast}</span>}</p>}
      </div>
    </div>
  );
}
