// Calendar timeline (08/10/2026; the main view): every money event in date order, grouped by day, with the
// end-of-day balance once per day on the day's last line. Predicted items are labelled. The lowest point is
// highlighted; a day below $0 gets the soft negative tint with an icon (rule 6). Each day is one button that
// opens the day drawer. Days with nothing happening are left out.
import { ArrowDownToLine, ChevronRight, TriangleAlert } from "lucide-react";
import { calendarPage as c } from "@/content/spending";
import { formatCents, formatShortDay, formatWhole } from "@/lib/format";
import type { TimelineDay, TimelineEvent } from "@/lib/selectors/calendar";
import { cx } from "@/components/ui/cx";

const t = c.timeline;
const money = (n: number) => (Number.isInteger(n) ? formatWhole(n) : formatCents(n));
const signed = (n: number) => `${n < 0 ? "−" : "+"}${money(Math.abs(n))}`;

export function MoneyTimeline({ days, forecastEnds, onDay, next, label }: {
  days: TimelineDay[]; forecastEnds: string | null; onDay: (date: string) => void; label: string;
  /** The payday just after the view: a last row that opens the next fortnight. */
  next?: { date: string; amount: number | null; onOpen: (() => void) | null } | null;
}) {
  return (
    <section aria-labelledby="tl-h" className="overflow-hidden rounded-card-s bg-surface shadow-card sm:rounded-card">
      <h3 id="tl-h" className="px-t4 pb-t2 pt-t4 text-body14 font-bold text-text sm:px-t5">{t.heading}</h3>
      {days.length === 0 && !forecastEnds ? <p className="px-t4 pb-t4 text-body14 text-text-muted sm:px-t5">{t.empty}</p> : (
        <ol aria-label={label}>
          {days.map((d) => <Day key={d.date} day={d} onOpen={() => onDay(d.date)} />)}
          {next && (
            <li className="border-t border-divider">
              <button type="button" disabled={!next.onOpen} onClick={() => next.onOpen?.()}
                className="flex min-h-[56px] w-full items-center gap-t3 px-t4 text-left hover:bg-surface2 disabled:hover:bg-transparent sm:px-t5">
                <DateCol date={next.date} />
                <span className="sr-only">{formatShortDay(next.date)}/{next.date.slice(0, 4)}. </span>
                <span className="inline-flex min-w-0 flex-1 items-center gap-t2 text-body14 font-semibold text-accent"><ArrowDownToLine aria-hidden size={16} />{t.nextPayday}</span>
                {next.amount !== null && <span className="tnum text-body14 text-text-secondary">+{formatWhole(next.amount)} <span className="text-meta text-text-muted">{t.expected}</span></span>}
                {next.onOpen && <><span className="sr-only">. {t.opensNext}</span><ChevronRight aria-hidden size={18} className="shrink-0 text-icon-muted" /></>}
              </button>
            </li>
          )}
          {forecastEnds && (
            <li className="border-t border-divider bg-surface2 px-t4 py-t3 text-body14 text-text-muted sm:px-t5">{t.forecastEnds(formatShortDay(forecastEnds))}</li>
          )}
        </ol>
      )}
    </section>
  );
}

function DateCol({ date }: { date: string }) {
  const [wd, dm] = formatShortDay(date).split(" ");
  return (
    <span aria-hidden className="tnum w-[48px] shrink-0 self-start pt-[2px] leading-tight">
      <span className="block text-meta font-semibold text-text-muted">{wd}</span>
      <span className="block text-body14 font-semibold text-text">{dm}</span>
    </span>
  );
}

function Day({ day, onOpen }: { day: TimelineDay; onOpen: () => void }) {
  return (
    <li className={cx("border-t border-divider", day.belowZero ? "bg-negative-soft" : day.isLowest && "bg-accent-soft")}>
      <button type="button" onClick={onOpen} aria-current={day.isToday ? "date" : undefined}
        className={cx("flex w-full items-start gap-t3 px-t4 py-t3 text-left sm:px-t5", !day.belowZero && !day.isLowest && "hover:bg-surface2")}>
        <DateCol date={day.date} />
        <span className="sr-only">{formatShortDay(day.date)}/{day.date.slice(0, 4)}. </span>
        <span className="min-w-0 flex-1">
          {(day.isToday || day.isLowest || day.belowZero) && (
            <span className="mb-t1 flex flex-wrap gap-t1">
              {day.isToday && <Tag>{t.today}</Tag>}
              {day.isLowest && !day.belowZero && <Tag>{t.lowest}</Tag>}
              {day.belowZero && <Tag negative><TriangleAlert aria-hidden size={12} strokeWidth={2.4} />{t.below}{day.isLowest ? ` · ${t.lowest}` : ""}</Tag>}
            </span>
          )}
          {day.events.map((e, i) => <Event key={e.key} e={e} last={i === day.events.length - 1} day={day} />)}
        </span>
        <ChevronRight aria-hidden size={18} className="mt-[2px] shrink-0 text-icon-muted" />
      </button>
    </li>
  );
}

function Event({ e, last, day }: { e: TimelineEvent; last: boolean; day: TimelineDay }) {
  const name = e.kind === "spending" ? t.spending(e.count ?? 0) : e.kind === "balance" ? t.noMovement : e.label;
  return (
    <span className="flex flex-col py-[3px]">
      <span className="flex items-baseline gap-t2">
        <span className="min-w-0 flex-1 text-body14 text-text">
          {e.kind === "income" && <span className="font-semibold">{t.pay} · </span>}
          {name}
          {e.predicted && <span className="ml-t1 whitespace-nowrap rounded-[4px] border border-dashed px-[4px] text-meta text-text-muted" style={{ borderColor: "var(--chart-predicted)" }}>{e.kind === "income" ? t.expected : t.predicted}</span>}
        </span>
        {e.kind !== "balance" && <span className="tnum shrink-0 text-body14 font-semibold text-text">{signed(e.amount)}</span>}
      </span>
      {last && day.balance !== null && (
        <span className={cx("tnum self-end text-meta", day.belowZero ? "font-bold text-negative" : day.isLowest ? "font-bold text-text" : "text-text-muted")}>
          <span aria-hidden>→ </span>{formatWhole(day.balance)}<span className="sr-only">. {t.balanceSr(formatWhole(day.balance), day.balancePredicted)}</span>
        </span>
      )}
    </span>
  );
}

function Tag({ children, negative }: { children: React.ReactNode; negative?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-[3px] rounded-pill px-t2 text-meta font-semibold", negative ? "bg-surface text-negative" : "bg-chip text-text-secondary")}>{children}</span>
  );
}
