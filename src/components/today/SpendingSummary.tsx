// Spending on Today. Same time frame and categories as the Spending page (UX round 2, 1.1): this pay cycle so far,
// the last six pay cycles as bars (the current one in the accent) with a dashed line at the average of the complete
// ones, and where it went by category (the one category list, colours as on the Spending donut). The current
// cycle is only part-way through, so it's never called "under" or "over" the average (Q45). Each category opens
// its transactions; Other opens the full category list.
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { todayCopy } from "@/content/today";
import { categoryNames } from "@/content/en-AU";
import { daysBetween, formatDayMonth, formatWhole } from "@/lib/format";
import { cycleAverage, type CycleBar, type TopCategories } from "@/lib/selectors/today";
import { catVar } from "@/components/icons";
import { cx } from "@/components/ui/cx";
import { Card, Chip } from "./Card";

const t = todayCopy.spending;
const HEIGHT = 140; // px of bar area

export function SpendingSummary({ bars, asOf, groups }: { bars: CycleBar[]; asOf: string; groups: TopCategories }) {
  const now = bars.at(-1);
  const avg = cycleAverage(bars);
  const max = Math.max(1, ...bars.map((b) => b.total ?? 0), avg?.average ?? 0);
  const h = (v: number) => Math.max(4, Math.round((v / max) * HEIGHT));
  const day = now ? Math.min(14, daysBetween(now.start, asOf) + 1) : 0;
  const sr = bars.map((b) => `${b.current ? t.now : formatDayMonth(b.start)} ${b.total === null ? t.noData : formatWhole(b.total)}`).join(", ");
  const parts = [...groups.items.map((g) => ({ key: g.category, name: categoryNames[g.category], total: g.total, share: g.share, colour: catVar(g.category) })),
    ...(groups.other ? [{ key: "other", name: t.other, total: groups.other.total, share: groups.other.share, colour: "var(--color-icon-muted)" }] : [])];
  return (
    <Card id="spending-h" title={t.heading} action={{ href: "/spending", label: t.explore }}>
      {now && <p className="-mt-t2 pb-t4 text-meta text-text-muted">{t.cycle(formatDayMonth(now.start), formatDayMonth(now.end), day, 14)}</p>}
      <div className="flex flex-col gap-t6 desktop:flex-row desktop:gap-t7">
        {/* Pay-cycle bars */}
        <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
          {now?.total != null && (
            <p className="flex flex-wrap items-baseline gap-x-t2">
              <span className="tnum text-section-num text-text desktop:text-section-num-l">{formatWhole(now.total)}</span>
              <span className="text-meta text-text-muted">{t.soFar}</span>
            </p>
          )}
          {avg && <Chip tone="neutral" wrap className="self-start">{t.averageChip(formatWhole(avg.average), avg.cycles)}</Chip>}
          <div role="img" aria-label={t.barsSr(sr)} className="relative mt-t3" style={{ height: HEIGHT + 30 }}>
            {avg && (
              <>
                <div aria-hidden className="absolute inset-x-0 border-t border-dashed border-icon-muted" style={{ bottom: 24 + h(avg.average) }} />
                <span aria-hidden className="tnum absolute right-0 z-10 rounded-pill bg-surface px-t1 text-meta font-semibold text-text-muted" style={{ bottom: 28 + h(avg.average) }}>{t.average(formatWhole(avg.average))}</span>
              </>
            )}
            <div aria-hidden className="absolute inset-x-0 bottom-[24px] top-0 grid items-end gap-[14px]" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
              {bars.map((b) => <span key={b.start} className={cx("rounded-[10px]", b.current ? "bg-cta" : "bg-bar-past")} style={{ height: b.total === null ? 0 : h(b.total) }} />)}
            </div>
            <div aria-hidden className="tnum absolute inset-x-0 bottom-0 grid gap-[6px] text-center text-meta text-text-muted" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
              {bars.map((b) => <span key={b.start} className={b.current ? "font-bold text-text" : undefined}>{b.current ? t.now : t.barLabel(formatDayMonth(b.start))}</span>)}
            </div>
          </div>
        </div>

        {/* Where it went: the top five categories and Other */}
        {parts.length > 0 && (
          <div className="flex min-w-0 flex-1 flex-col gap-[14px]">
            <p className="text-body14 font-bold text-text">{t.where}</p>
            <div role="img" aria-label={t.splitSr(parts.map((g) => `${g.name} ${formatWhole(g.total)}`).join(", "))} className="flex h-[10px] gap-[3px] overflow-hidden rounded-pill">
              {parts.map((g) => <span key={g.key} className="rounded-[3px]" style={{ width: `${g.share * 100}%`, background: g.colour }} />)}
            </div>
            <ul className="-mx-t2 flex flex-col">
              {parts.map((g) => (
                <li key={g.key}>
                  <Link href={g.key === "other" ? "/spending?tab=categories" : `/spending?category=${g.key}`}
                    aria-label={g.key === "other" ? `${t.otherSr(groups.other!.categories.length)}, ${formatWhole(g.total)}` : `${t.openCategory(g.name)}, ${formatWhole(g.total)}`}
                    className="flex min-h-tap items-center gap-t2 rounded-md px-t2 text-body14 hover:bg-surface2">
                    <span aria-hidden className="h-[10px] w-[10px] shrink-0 rounded-pill" style={{ background: g.colour }} />
                    <span className="flex-1 text-text-secondary">{g.name}</span>
                    {/* Amounts in the normal text colour: gambling is never singled out in a warning colour. */}
                    <strong className="tnum font-bold text-text">{formatWhole(g.total)}</strong>
                    <ChevronRight aria-hidden size={16} className="shrink-0 text-icon-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
