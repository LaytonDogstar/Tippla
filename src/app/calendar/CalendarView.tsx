"use client";
// Calendar, month first (09/10/2026; reference: tippla-calendar-mockup.dc.html). Month arrows; the shortfall banner
// (only when a forecast day goes below $0); four stats about now; the Monday-start month grid with quick ranges and
// "Select range"; then the detail panel for the selected day or range, which updates as the selection changes.
// Every figure comes from calendarDays() (pending never counted), so the cells, stats and panel agree.
import Link from "next/link";
import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { calendarPage as t, monthLabel } from "@/content/spending";
import { addDays as addDaysIso, formatCents, formatShortDay, formatWhole } from "@/lib/format";
import { monthGrid, monthKey, rangeSummary, shiftMonth, type CalDay, type CalendarNow } from "@/lib/selectors/calendarMonth";
import { bounds, initialSelection, isSelected, select } from "@/lib/calendar/selection";
import { MonthCalendar } from "@/components/domain/MonthCalendar";
import { ButtonLink } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";

const signedCents = (n: number) => `${n > 0 ? "+" : "−"}${formatCents(Math.abs(n))}`;

export function CalendarView({ days, now, asOf, cycles, initial, range: monthBounds, stale }: {
  days: CalDay[]; now: CalendarNow; asOf: string;
  cycles: { last: [string, string]; this: [string, string] };
  /** The month shown first and the selection (today, a linked day, or the whole month). */
  initial: { month: string; start: string; end: string };
  range: { min: string; max: string };
  stale: { when: string } | null;
}) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const [month, setMonth] = useState(initial.month);
  const [sel, dispatch] = useReducer(select, initialSelection(initial.start, initial.end));
  const [lo, hi] = bounds(sel);
  const lowest = now.lowest?.date ?? null;

  // The month and selected day live in the URL (shareable, survives reload) without a server round trip.
  useEffect(() => {
    const u = new URL(window.location.href);
    ["view", "offset", "focus"].forEach((k) => u.searchParams.delete(k));
    u.searchParams.set("month", month);
    if (lo === hi) u.searchParams.set("day", lo); else u.searchParams.delete("day");
    window.history.replaceState(window.history.state, "", u.toString());
  }, [month, lo, hi]);
  // A mouse drag ends wherever the button comes up.
  useEffect(() => {
    if (!sel.dragging) return;
    const up = () => dispatch({ type: "release" });
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [sel.dragging]);

  const goMonth = (m: string) => {
    setMonth(m);
    const first = `${m}-01`, last = `${shiftMonth(m, 1)}-01`;
    if (asOf >= first && asOf < last) dispatch({ type: "set", start: asOf, end: asOf });
    else dispatch({ type: "set", start: first < days[0]!.date ? days[0]!.date : first, end: lastDayIn(m, days) });
  };
  const cells = useMemo(() => monthGrid(month), [month]);
  const monthFirst = `${month}-01`;
  const monthLast = lastDayIn(month, days);
  const quick = [
    { label: t.quick.today, a: asOf, b: asOf },
    { label: t.quick.lastCycle, a: cycles.last[0], b: cycles.last[1] },
    { label: t.quick.thisCycle, a: cycles.this[0], b: cycles.this[1] },
    { label: t.quick.month, a: monthFirst < days[0]!.date ? days[0]!.date : monthFirst, b: monthLast },
  ];
  // Days of this month past the end of the forecast (muted in the grid): say so rather than leave blanks unexplained.
  const lastDay = days.at(-1)!.date;
  const forecastEnds = monthKey(lastDay) === month && lastDay < addDaysIso(`${shiftMonth(month, 1)}-01`, -1) ? addDaysIso(lastDay, 1) : null;
  const isSel = useCallback((d: string) => isSelected(sel, d), [sel]);

  return (
    <div className="flex flex-col gap-t5 pb-t6">
      {stale && (
        <p role="status" className="flex items-start gap-t2 rounded-inset bg-caution-soft px-t4 py-t3 text-body14 text-text">
          <TriangleAlert aria-hidden size={18} className="mt-[2px] shrink-0 text-caution" />
          <span>{t.stale(stale.when)} <Link href="/account/bank" className="font-semibold text-accent underline underline-offset-2">{t.reconnect}</Link></span>
        </p>
      )}

      <div className="flex items-center justify-end gap-t3">
        <MonthArrow dir="prev" disabled={month <= monthBounds.min} onClick={() => goMonth(shiftMonth(month, -1))} />
        <h2 className="min-w-[150px] text-center text-[1.125rem] font-extrabold text-text" aria-live="polite">{monthLabel(month)}</h2>
        <MonthArrow dir="next" disabled={month >= monthBounds.max} onClick={() => goMonth(shiftMonth(month, 1))} />
      </div>

      {now.short && (
        <section aria-labelledby="short-h" className="flex flex-wrap items-center justify-between gap-t4 rounded-card-s border border-negative-soft bg-surface p-t5 shadow-card sm:rounded-card">
          <div className="flex min-w-0 flex-[1_1_420px] items-start gap-t4">
            <span aria-hidden className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[12px] bg-negative-soft text-negative"><TriangleAlert size={20} /></span>
            <div className="min-w-0">
              <h2 id="short-h" className="text-[1.0625rem] font-extrabold text-text">{t.banner.title(formatWhole(now.short.amount), formatShortDay(now.short.date))}</h2>
              <p className="mt-t1 text-body14 leading-relaxed text-text-secondary">{t.banner.body(formatWhole(now.bills.total), formatWhole(now.everydayPerDay))}</p>
            </div>
          </div>
          <ButtonLink href="/hardship" size="standard">{t.banner.options}</ButtonLink>
        </section>
      )}

      <section aria-label={t.stats.label} className="grid grid-cols-2 gap-t3 min-[900px]:grid-cols-4">
        <Stat label={t.stats.today} value={now.balanceToday === null ? "—" : formatWhole(now.balanceToday)} neg={(now.balanceToday ?? 0) < 0} note={formatShortDay(asOf)} />
        <Stat label={t.stats.lowest} value={now.lowest ? formatWhole(now.lowest.balance) : "—"} neg={(now.lowest?.balance ?? 0) < 0}
          note={now.lowest ? `${formatShortDay(now.lowest.date)}${now.lowest.dayBeforePayday ? ` · ${t.stats.dayBeforePayday}` : ""}` : t.stats.lowestNone} />
        <Stat label={t.stats.bills} value={formatWhole(now.bills.total)} note={now.bills.payees.length ? now.bills.payees.join(", ") : t.stats.billsNone} />
        <Stat label={t.stats.below} value={String(now.belowZero.days)} neg={now.belowZero.days > 0} note={t.stats.belowOf(now.belowZero.of)} />
      </section>

      <section aria-label={monthLabel(month)} className="flex flex-col gap-t4 rounded-card-s border border-line bg-surface p-t3 shadow-card sm:rounded-card min-[720px]:p-t5">
        <div className="flex flex-wrap items-center justify-between gap-t3">
          <div role="group" aria-label={t.quick.label} className="flex flex-wrap gap-t2">
            {quick.map((q) => (
              <QuickButton key={q.label} on={!sel.rangeMode && lo === q.a && hi === q.b} onClick={() => dispatch({ type: "set", start: q.a, end: q.b })}>{q.label}</QuickButton>
            ))}
          </div>
          <div className="flex items-center gap-t3">
            <span className="hidden text-meta text-text-muted min-[900px]:inline">{t.range.hint}</span>
            <QuickButton on={sel.rangeMode} onClick={() => dispatch({ type: "toggleRange" })}>
              {sel.rangeMode ? (sel.pendingStart === null ? t.range.pickStart : t.range.pickEnd) : t.range.start}
            </QuickButton>
          </div>
        </div>
        <MonthCalendar cells={cells} byDate={byDate} label={t.grid.label(monthLabel(month))} lowest={lowest} isSelected={isSel}
          handlers={{ onPress: (date, e) => dispatch({ type: "press", date, shift: e.shift, drag: e.drag }), onEnter: (date) => dispatch({ type: "enter", date }) }} />
        {forecastEnds && <p className="text-meta text-text-muted">{t.grid.forecastEnds(formatShortDay(forecastEnds))}</p>}
        <Legend />
      </section>

      <Panel days={days} from={lo} to={hi} asOf={asOf} />
    </div>
  );
}

const lastDayIn = (m: string, days: CalDay[]) => {
  const last = days.filter((d) => monthKey(d.date) === m).at(-1);
  return last?.date ?? `${m}-01`;
};

function MonthArrow({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button type="button" aria-label={dir === "prev" ? t.prevMonth : t.nextMonth} disabled={disabled} onClick={onClick}
      className="inline-flex h-tap w-tap items-center justify-center rounded-pill border border-line bg-surface text-text-secondary hover:text-text disabled:cursor-not-allowed disabled:text-text-muted disabled:opacity-60">
      <Icon aria-hidden size={18} />
    </button>
  );
}

function QuickButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cx("inline-flex min-h-tap items-center rounded-pill border px-t3 text-meta font-semibold",
        on ? "border-text bg-text text-surface" : "border-line bg-surface text-text-secondary hover:border-accent hover:text-text")}>
      {children}
    </button>
  );
}

function Stat({ label, value, note, neg = false, className }: { label: string; value: string; note?: string; neg?: boolean; className?: string }) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-[4px] rounded-[14px] border border-line bg-surface px-t4 py-[14px]", className)}>
      <span className="text-meta font-semibold text-text-secondary">{label}</span>
      <span className={cx("tnum text-[1.375rem] font-extrabold leading-tight", neg ? "text-negative" : "text-text")}>{value}</span>
      {note && <span className="text-meta text-text-muted">{note}</span>}
    </div>
  );
}

function Legend() {
  const l = t.legend;
  return (
    <ul className="flex flex-wrap items-center gap-x-t4 gap-y-t2 text-meta text-text-secondary">
      <li className="inline-flex items-center gap-[6px]"><span className="rounded-[6px] bg-positive-soft px-[6px] py-[2px] text-[0.75rem] font-semibold text-positive">{l.pay}</span>{l.payNote}</li>
      <li className="inline-flex items-center gap-[6px]"><span className="rounded-[6px] bg-caution-soft px-[6px] py-[2px] text-[0.75rem] font-semibold text-caution">{l.bill}</span>{l.billNote}</li>
      <li className="inline-flex items-center gap-[6px]"><span className="rounded-[6px] bg-[color-mix(in_srgb,var(--cat-wage-advance)_16%,var(--color-surface))] px-[6px] py-[2px] text-[0.75rem] font-semibold text-[color:color-mix(in_srgb,var(--cat-wage-advance)_62%,var(--color-text))]">{l.advance}</span>{l.advanceNote}</li>
      <li className="inline-flex items-center gap-[6px]"><span aria-hidden className="h-[14px] w-[14px] rounded-[4px] border border-negative-soft bg-negative-soft" />{l.below}</li>
      <li className="inline-flex items-center gap-[6px]"><span aria-hidden className="h-[14px] w-[14px] rounded-[4px] border border-dashed border-text-muted" />{l.forecast}</li>
      <li>{l.bold}</li>
    </ul>
  );
}

// ---- The selected day or range -----------------------------------------------------------------------------------

function Panel({ days, from, to, asOf }: { days: CalDay[]; from: string; to: string; asOf: string }) {
  const p = t.panel;
  const r = useMemo(() => rangeSummary(days, from, to), [days, from, to]);
  const sel = useMemo(() => days.filter((d) => d.date >= r.from && d.date <= r.to), [days, r.from, r.to]);
  const single = r.days === 1;
  const title = single ? `${formatShortDay(r.from)}${r.from === asOf ? ` · ${p.today}` : ""}` : `${formatShortDay(r.from)} – ${formatShortDay(r.to)}`;
  const sub = [!single && p.days(r.days), r.forecastFrom && p.includesForecast(formatShortDay(r.forecastFrom)), r.pending > 0 && p.pending(formatCents(r.pending))].filter(Boolean).join(" · ");
  const money = (n: number | null) => (n === null ? "—" : formatWhole(n));
  return (
    <section aria-labelledby="sel-h" aria-live="polite" className="flex flex-col gap-t5 rounded-card-s border border-line bg-surface p-t4 shadow-card sm:rounded-card min-[720px]:p-t6">
      <div className="flex flex-wrap items-baseline justify-between gap-t2">
        <h2 id="sel-h" className="text-[1.25rem] font-extrabold text-text">{title}</h2>
        {sub && <p className="text-meta text-text-muted">{sub}</p>}
      </div>
      <dl className="grid grid-cols-2 gap-[10px] min-[900px]:grid-cols-5">
        <PanelStat label={p.opening} value={money(r.opening)} neg={(r.opening ?? 0) < 0} />
        <PanelStat label={p.moneyIn} value={r.moneyIn ? `+${formatWhole(r.moneyIn)}` : "$0"} pos={r.moneyIn > 0} />
        <PanelStat label={p.moneyOut} value={r.moneyOut ? `−${formatWhole(r.moneyOut)}` : "$0"} />
        <PanelStat label={r.closingIsForecast ? p.closingForecast : p.closing} value={money(r.closing)} neg={(r.closing ?? 0) < 0} />
        <PanelStat label={p.lowest} value={r.lowest ? formatWhole(r.lowest.balance) : "—"} neg={(r.lowest?.balance ?? 0) < 0}
          note={r.lowest ? formatShortDay(r.lowest.date) : undefined} className="col-span-2 min-[900px]:col-span-1" />
      </dl>
      {!single && <BalanceBars days={sel} from={r.from} to={r.to} lowest={r.lowest} />}
      <div className="flex flex-col gap-t3">
        {sel.map((d) => <DayGroup key={d.date} day={d} asOf={asOf} />)}
      </div>
    </section>
  );
}

function PanelStat({ label, value, note, neg = false, pos = false, className }: { label: string; value: string; note?: string; neg?: boolean; pos?: boolean; className?: string }) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-[4px] rounded-[14px] border border-line px-t4 py-[14px]", className)}>
      <dt className="text-meta font-semibold text-text-secondary">{label}</dt>
      <dd className={cx("tnum text-[1.375rem] font-extrabold leading-tight", neg ? "text-negative" : pos ? "text-positive" : "text-text")}>{value}</dd>
      {note && <dd className="text-meta text-text-muted">{note}</dd>}
    </div>
  );
}

/** One bar per day: above the zero line when positive, below it when negative; forecast days lighter. */
function BalanceBars({ days, from, to, lowest }: { days: CalDay[]; from: string; to: string; lowest: { date: string; balance: number } | null }) {
  const p = t.panel;
  const max = Math.max(1, ...days.map((d) => Math.abs(d.balance ?? 0)));
  const hasNeg = days.some((d) => (d.balance ?? 0) < 0);
  return (
    <figure className="flex flex-col gap-[6px]">
      <figcaption className="text-meta font-bold text-text-secondary">{p.chart}</figcaption>
      <p className="sr-only">{lowest ? p.chartSr(formatShortDay(from), formatShortDay(to), formatWhole(lowest.balance), formatShortDay(lowest.date)) : ""}</p>
      <div aria-hidden className="flex h-[64px] items-stretch gap-[3px] border-b border-text-muted">
        {days.map((d) => (
          <div key={d.date} className="flex min-w-[3px] flex-1 flex-col justify-end" title={`${formatShortDay(d.date)} ${d.balance === null ? "" : formatWhole(d.balance)}`}>
            {(d.balance ?? 0) > 0 && <div className={cx("rounded-t-[3px]", d.isFuture ? "bg-[color-mix(in_srgb,var(--color-accent)_40%,var(--color-surface))]" : "bg-accent")} style={{ height: Math.max(2, Math.round((d.balance! / max) * 62)) }} />}
          </div>
        ))}
      </div>
      {hasNeg && (
        <div aria-hidden className="flex h-[40px] items-stretch gap-[3px]">
          {days.map((d) => (
            <div key={d.date} className="flex min-w-[3px] flex-1 flex-col">
              {(d.balance ?? 0) < 0 && <div className={cx("rounded-b-[3px]", d.isFuture ? "bg-[color-mix(in_srgb,var(--color-negative)_40%,var(--color-surface))]" : "bg-negative")} style={{ height: Math.max(2, Math.round((-d.balance! / max) * 38)) }} />}
            </div>
          ))}
        </div>
      )}
      <div aria-hidden className="flex justify-between text-meta text-text-muted"><span>{formatShortDay(from)}</span><span>{formatShortDay(to)}</span></div>
    </figure>
  );
}

function DayGroup({ day, asOf }: { day: CalDay; asOf: string }) {
  const p = t.panel;
  const neg = (day.balance ?? 0) < 0;
  return (
    <div className="rounded-[14px] border border-line px-t4 pb-[6px] pt-[4px]">
      <div className="flex items-center justify-between gap-t2 border-b border-line pb-t2 pt-[10px]">
        <h3 className="text-body14 font-extrabold text-text">{formatShortDay(day.date)}{day.date === asOf ? ` · ${p.today}` : ""}</h3>
        <span className={cx("tnum text-meta font-bold", neg ? "text-negative" : "text-text")}>
          {day.balance === null ? p.noBalance : (day.isFuture ? p.forecastEndOfDay : p.endOfDay)(formatWhole(day.balance))}
        </span>
      </div>
      {day.items.length === 0
        ? <p className="py-t3 text-meta text-text-muted">{day.isFuture ? p.noneForecast : p.none}</p>
        : (
          <ul>
            {day.items.map((i) => {
              const dim = i.status !== "posted";
              return (
                <li key={i.id} className="flex items-center gap-t3 border-t border-line py-[10px] first:border-t-0">
                  <span aria-hidden className={cx("flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-pill text-meta font-extrabold", dim ? "border border-dashed border-text-muted text-text-secondary" : "bg-accent-soft text-accent-strong")}>{i.name.charAt(0)}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cx("block break-words text-body14 font-bold", dim ? "text-text-secondary" : "text-text")}>{i.name}</span>
                    <span className="block text-meta text-text-muted">{i.label}{i.status === "pending" ? ` · ${p.pendingTag}` : i.status === "predicted" ? ` · ${p.predictedTag}` : ""}</span>
                  </span>
                  <span className={cx("tnum whitespace-nowrap text-body14 font-bold", dim ? "text-text-secondary" : i.amount > 0 ? "text-positive" : "text-text")}>{signedCents(i.amount)}</span>
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );
}
