// The homepage feature visuals, built as markup (not screenshots) from content/siteExamples so they stay crisp and
// easy to change. Each is labelled "Example". Negative states follow CLAUDE.md rule 6: magenta for text, outlines and
// hatching, a soft tint for fills, never a saturated "bad" fill.
import { site } from "@/content/site";
import { siteExamples as ex } from "@/content/siteExamples";
import { cx } from "@/components/ui/cx";
import { daysBetween, formatDayMonth, formatMonthShort, formatShortDay } from "@/lib/format/dates";
import { formatWhole } from "@/lib/format/money";
import { largestRemainder } from "@/lib/selectors/payCycleCard";

const t = site.home;

function Tag({ dark }: { dark?: boolean }) {
  return (
    <p className={cx("shrink-0 rounded-pill px-t2 py-[3px] text-[0.6875rem] font-bold",
      dark ? "bg-site-navy-chip text-site-navy-on" : "border border-site-line text-site-muted")}>{t.example}</p>
  );
}

/** "−$53 short before payday": the pay cycle so far, the balance against what's due. */
export function CycleCard() {
  const c = ex.cycle;
  const days = daysBetween(c.from, c.to) + 1;
  const today = daysBetween(c.from, c.asOf) + 1;
  const left = daysBetween(c.asOf, c.payday);
  const covered = Math.round((c.balance / c.due) * 100);
  const bills = c.bills.map((b) => `${b.merchant} ${formatWhole(b.amount)}`).join(" and ");
  return (
    <div className="w-full max-w-[400px] rounded-[26px] bg-site-navy p-t5 text-site-navy-on shadow-[0_30px_60px_rgba(39,47,126,0.28)] min-[480px]:p-t6">
      <div className="flex items-center justify-between gap-t2">
        <p className="text-[0.8125rem] font-semibold text-site-navy-muted">{t.cycleCard.period(formatDayMonth(c.from), formatDayMonth(c.to))}</p>
        <Tag dark />
      </div>
      <p className="mt-t3 inline-flex items-center gap-[6px] rounded-pill bg-site-surface px-[10px] py-[5px] text-[0.75rem] font-extrabold text-site-magenta">
        <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-site-magenta" />{t.cycleCard.flag}
      </p>
      <p className="mt-t2 text-[3.25rem] font-extrabold leading-none tracking-[-0.04em] min-[480px]:text-[4rem]">−{formatWhole(c.short)}</p>
      <p className="mt-t2 text-[0.875rem] text-site-navy-muted">{t.cycleCard.detail(formatShortDay(c.payday))}</p>
      <div className="mt-t5 flex justify-between text-[0.8125rem] font-bold"><span>{t.cycleCard.days}</span><span>{t.cycleCard.daysLeft(left)}</span></div>
      <div role="img" aria-label={t.cycleCard.daysLabel(today, days)} className="mt-t2 grid gap-[4px]" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
        {Array.from({ length: days }, (_, i) => (
          <span key={i} className={cx("h-[8px] rounded-[4px]", i + 1 < today ? "bg-site-navy-past" : i + 1 === today ? "bg-site-navy-on" : "bg-site-navy-chip")} />
        ))}
      </div>
      <div className="mt-t5 rounded-[16px] bg-site-surface p-t4 text-site-text">
        <div className="flex justify-between gap-t2 text-[0.875rem] font-extrabold"><span>{t.cycleCard.balance(formatWhole(c.balance))}</span><span>{t.cycleCard.due(formatWhole(c.due))}</span></div>
        <div role="img" aria-label={t.cycleCard.covered(covered)} className="mt-t2 h-[10px] overflow-hidden rounded-[5px] bg-site-pink-hatch">
          <div className="h-full bg-site-navy" style={{ width: `${covered}%` }} />
        </div>
        <p className="mt-t2 text-[0.8125rem] text-site-muted">{t.cycleCard.bills(bills)}</p>
      </div>
    </div>
  );
}

const SQUARE: Record<(typeof ex.plan.groups)[number]["id"], string> = {
  essentials: "bg-site-square-essentials",
  gambling: "bg-site-square-gambling",
  debt: "bg-site-square-debt",
};

/** "Where your pay went": one square per 1% of pay; past 100 the pay had run out, so those squares are hatched. */
export function PlanCard() {
  const p = ex.plan;
  const spent = p.groups.reduce((s, g) => s + g.total, 0);
  const total = Math.round((spent / p.paid) * 100);
  const counts = largestRemainder(p.groups.map((g) => g.total), total);
  const squares = p.groups.flatMap((g, i) => Array.from({ length: counts[i]! }, () => g.id));
  const pct = (n: number) => Math.round((n / p.paid) * 100);
  const label = t.planCard.label(p.groups.map((g) => t.planCard.share(g.name, pct(g.total))).join(", "), Math.max(0, total - 100));
  const grid = "grid grid-cols-10 gap-[4px]";
  return (
    <div className="w-full max-w-[400px] rounded-[26px] bg-site-surface p-t5 text-site-text shadow-[0_30px_60px_rgba(120,30,80,0.16)] min-[480px]:p-t6">
      <div className="flex items-center justify-between gap-t2">
        <p className="text-[1.0625rem] font-extrabold">{t.planCard.title}</p>
        <Tag />
      </div>
      <p className="mt-t1 text-[0.8125rem] text-site-muted">{t.planCard.sub}</p>
      <div role="img" aria-label={label} className="mt-t4">
        <div className={grid}>{squares.slice(0, 100).map((id, i) => <span key={i} className={cx("aspect-square rounded-[4px]", SQUARE[id])} />)}</div>
        {squares.length > 100 && (
          <>
            <p aria-hidden className="my-t3 flex items-center gap-t2 text-[0.75rem] font-extrabold text-site-magenta">
              <span className="flex-1 border-t-2 border-dashed border-site-magenta" />{t.planCard.ranOut}<span className="flex-1 border-t-2 border-dashed border-site-magenta" />
            </p>
            <div className={grid}>
              {squares.slice(100).map((_, i) => (
                <span key={i} className="aspect-square rounded-[4px] border border-site-pink" style={{ background: "repeating-linear-gradient(45deg, var(--site-pink-hatch) 0 3px, var(--site-surface) 3px 6px)" }} />
              ))}
            </div>
          </>
        )}
      </div>
      <ul aria-hidden className="mt-t4 grid grid-cols-1 gap-x-t4 gap-y-t2 text-[0.8125rem] font-semibold min-[360px]:grid-cols-2">
        {p.groups.map((g) => (
          <li key={g.id} className="flex items-center gap-t2"><span className={cx("h-[12px] w-[12px] shrink-0 rounded-[3px]", SQUARE[g.id])} />{t.planCard.share(g.name, pct(g.total))}</li>
        ))}
      </ul>
    </div>
  );
}

/** "How each pay cycle ended": one scale for both directions, the $0 line, and this cycle's forecast hatched. */
export function TrendCard() {
  const bars = ex.trend.bars;
  const up = Math.max(0, ...bars.map((b) => b.value));
  const down = Math.max(0, ...bars.map((b) => -b.value));
  const H = 200; // px for the bars themselves; labels get their own room
  const span = up + down || 1;
  const above = (up / span) * H;
  const below = (down / span) * H;
  const label = t.trendCard.label(bars.map((b) => t.trendCard.spoken(formatWhole(Math.abs(b.value)), b.value < 0)).join(", "));
  const cols = { gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` };
  return (
    <div className="w-full max-w-[400px] rounded-[26px] bg-site-surface p-t5 text-site-text shadow-[0_30px_60px_rgba(15,90,80,0.16)] min-[480px]:p-t6">
      <div className="flex items-center justify-between gap-t2">
        <p className="text-[1.0625rem] font-extrabold">{t.trendCard.title}</p>
        <Tag />
      </div>
      <p className="mt-t1 text-[0.8125rem] text-site-muted">{t.trendCard.sub}</p>
      <div role="img" aria-label={label} className="mt-t5">
        <div aria-hidden className="grid gap-[6px] min-[420px]:gap-[8px]" style={cols}>
          {bars.map((b) => {
            const h = Math.max(3, (Math.abs(b.value) / span) * H);
            const neg = b.value < 0;
            const forecast = "forecast" in b && b.forecast;
            const value = <span className={cx("whitespace-nowrap text-[0.625rem] font-extrabold", neg ? "text-site-magenta" : "text-site-indigo")}>{neg ? "−" : ""}{formatWhole(Math.abs(b.value))}</span>;
            return (
              <div key={b.end} className="flex min-w-0 flex-col items-center">
                <div className="flex w-full flex-col items-center justify-end" style={{ height: above + 16 }}>
                  {!neg && <>{value}<span className="w-full rounded-t-[5px] bg-site-bar-up" style={{ height: h }} /></>}
                </div>
                <div className="flex w-full flex-col items-center border-t-2 border-site-text" style={{ height: below + 18 }}>
                  {neg && <>
                    <span className={cx("w-full rounded-b-[5px] border-[1.5px] border-t-0 border-site-magenta", forecast ? "border-dashed" : "bg-site-pink-hatch")}
                      style={{ height: h, ...(forecast ? { background: "repeating-linear-gradient(45deg, var(--site-pink-hatch) 0 4px, var(--site-surface) 4px 8px)" } : {}) }} />
                    {value}
                  </>}
                </div>
              </div>
            );
          })}
        </div>
        <div aria-hidden className="mt-t1 grid gap-[6px] text-center text-[0.625rem] font-semibold text-site-muted min-[420px]:gap-[8px]" style={cols}>
          {bars.map((b) => ("forecast" in b && b.forecast
            ? <span key={b.end} className="font-extrabold text-site-magenta">{t.trendCard.now}</span>
            : <span key={b.end}>{formatMonthShort(b.end)}</span>))}
        </div>
      </div>
      <p className="mt-t4 rounded-[14px] bg-site-lilac px-[14px] py-t3 text-[0.8125rem] font-semibold leading-relaxed">{ex.trend.note}</p>
    </div>
  );
}
