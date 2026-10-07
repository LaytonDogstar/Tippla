// Spending on Today (redesign 07/10/2026). Monthly part: the month's total, six monthly bars (past months soft,
// this month in the accent) and a dashed line at the average of the complete months. A partly-over month is
// never compared with full months ("under average" would just mean "the month isn't over"), so the chip says
// the average instead until the month is complete. Category part: real category totals in seven pastel groups,
// shown next to their names and amounts; they add up to the month's total.
import { todayCopy } from "@/content/today";
import { formatDayMonth, formatMonthShort, formatWhole } from "@/lib/format";
import type { MonthBar } from "@/lib/selectors/monthly";
import { monthAverage, type SpendGroup } from "@/lib/selectors/today";
import { cx } from "@/components/ui/cx";
import { Card, Chip } from "./Card";

const t = todayCopy.spending;
const HEIGHT = 140; // px of bar area

export function SpendingSummary({ bars, asOf, groups }: {
  bars: MonthBar[]; asOf: string; groups: { group: SpendGroup; total: number; share: number }[];
}) {
  const last = bars.at(-1);
  const first = bars.find((b) => b.total !== null) ?? bars[0];
  const avg = monthAverage(bars);
  const max = Math.max(1, ...bars.map((b) => b.total ?? 0), avg?.average ?? 0);
  const h = (v: number) => Math.max(4, Math.round((v / max) * HEIGHT));
  const month = last ? formatMonthShort(last.month) : "";
  const partial = last?.partial ? t.partial(month, formatDayMonth(asOf)) : null;
  const diff = avg && last?.total != null && !last.partial ? last.total - avg.average : null;
  const sr = bars.map((b) => `${formatMonthShort(b.month)} ${b.total === null ? t.noData : formatWhole(b.total)}${b.partial ? " so far" : ""}`).join(", ");
  return (
    <Card id="spending-h" title={t.heading} action={{ href: "/spending", label: t.explore }}>
      {first && last && <p className="-mt-t2 pb-t4 text-meta text-text-muted">{t.range(formatMonthShort(first.month), month, partial)}</p>}
      <div className="flex flex-col gap-t6 desktop:flex-row desktop:gap-t7">
        {/* Monthly bars */}
        <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
          {last?.total != null && (
            <p className="flex items-baseline gap-t2">
              <span className="text-section-num text-text desktop:text-section-num-l">{formatWhole(last.total)}</span>
              <span className="text-meta text-text-muted">{last.partial ? t.soFar(month) : t.inMonth(month)}</span>
            </p>
          )}
          {avg && (diff !== null
            ? <Chip tone={diff <= 0 ? "positive" : "caution"} className="self-start">{diff <= 0 ? t.under(formatWhole(-diff), avg.months) : t.over(formatWhole(diff), avg.months)}</Chip>
            : <Chip tone="neutral" className="self-start">{t.averageChip(formatWhole(avg.average), avg.months)}</Chip>)}
          <div role="img" aria-label={t.barsSr(sr)} className="relative mt-t3" style={{ height: HEIGHT + 30 }}>
            {avg && (
              <>
                <div aria-hidden className="absolute inset-x-0 border-t border-dashed border-icon-muted" style={{ bottom: 24 + h(avg.average) }} />
                <span aria-hidden className="absolute right-0 z-10 rounded-pill bg-surface px-t1 text-[0.6875rem] font-semibold text-text-muted" style={{ bottom: 28 + h(avg.average) }}>{t.average(formatWhole(avg.average))}</span>
              </>
            )}
            <div aria-hidden className="absolute inset-x-0 bottom-[24px] top-0 grid items-end gap-[14px]" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
              {bars.map((b) => (
                <span key={b.month} className={cx("rounded-[10px]", b === last ? "bg-cta" : "bg-bar-past")} style={{ height: b.total === null ? 0 : h(b.total) }} />
              ))}
            </div>
            <div aria-hidden className="absolute inset-x-0 bottom-0 grid gap-[14px] text-center text-meta-s text-text-muted" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
              {bars.map((b) => <span key={b.month} className={b === last ? "font-bold text-text" : undefined}>{formatMonthShort(b.month)}</span>)}
            </div>
          </div>
        </div>

        {/* Where it went */}
        {groups.length > 0 && (
          <div className="flex min-w-0 flex-1 flex-col gap-[14px]">
            <p className="text-body14 font-bold text-text">{t.where(month)}</p>
            <div role="img" aria-label={t.splitSr(groups.map((g) => `${t.groups[g.group]} ${formatWhole(g.total)}`).join(", "))} className="flex h-[10px] gap-[3px] overflow-hidden rounded-pill">
              {groups.map((g) => <span key={g.group} className="rounded-[3px]" style={{ width: `${g.share * 100}%`, background: `var(--spend-${kebab(g.group)})` }} />)}
            </div>
            <ul className="grid grid-cols-1 gap-x-t5 gap-y-[10px] text-meta sm:grid-cols-2">
              {groups.map((g) => (
                <li key={g.group} className="flex items-center gap-t2">
                  <span aria-hidden className="h-[8px] w-[8px] shrink-0 rounded-pill" style={{ background: `var(--spend-${kebab(g.group)})` }} />
                  <span className="flex-1 text-text-secondary">{t.groups[g.group]}</span>
                  {/* Amounts in the normal text colour: gambling is never singled out in a warning colour. */}
                  <strong className="font-bold text-text">{formatWhole(g.total)}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

const kebab = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
