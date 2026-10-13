"use client";
// Pay cycles, "Money left the day before payday" (13/10/2026; reference: tippla-pay-cycles-mockup.dc.html, the chart,
// stats and "Each pay cycle" list). Built for this section only. Below $0 uses the soft negative tint with negative
// text and outline (never a saturated red fill); the forecast bar is dashed and striped.
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import { progressCopy } from "@/content/progress";
import { formatDayMonth, formatWhole } from "@/lib/format";
import type { SpendGroup } from "@/lib/selectors/moneyPlan";
import type { CurrentCycleForecast } from "@/lib/selectors/progress";
import { partOfMonth, type CycleBreakdown, type PayCyclesTrend, type TrendContext } from "@/lib/selectors/payCyclesTrend";
import { cx } from "@/components/ui/cx";

const t = progressCopy.cycles;
const signed = (n: number) => (Math.round(n) < 0 ? `−${formatWhole(-n)}` : formatWhole(n));
const range = (a: string, b: string) => `${formatDayMonth(a)}–${formatDayMonth(b)}`;
const when = (date: string) => { const p = partOfMonth(date); return t.context.when(p.part, t.context.months[p.month - 1]!); };
const employer = (name: string) => name.replace(/\s+(Pty\.?\s*Ltd\.?|Pty\.?|Ltd\.?)$/i, "");

function contextLine(c: TrendContext | null): string | null {
  if (!c) return null;
  switch (c.kind) {
    case "turnedBelow": return t.context.turnedBelow(when(c.until), c.little, c.advancesFrom ? when(c.advancesFrom) : null);
    case "alwaysBelow": return t.context.alwaysBelow(c.advancesFrom ? when(c.advancesFrom) : null);
    case "turnedAbove": return t.context.turnedAbove(when(c.until));
    case "alwaysAbove": return t.context.alwaysAbove(c.advancesFrom ? when(c.advancesFrom) : null);
    case "mixed": return t.context.mixed(c.advancesFrom ? when(c.advancesFrom) : null);
  }
}

/** Plot height (px) shared by both directions; the label rows above and below sit outside it, sized in rem so they
 *  grow with the text size. */
const PLOT = 170;
const LABEL = "1.75rem";

export function MoneyLeftCard({ trend, current }: { trend: PayCyclesTrend; current: CurrentCycleForecast | null }) {
  const h = trend.headline;
  const headline = h.kind === "allBelow" ? t.headline.allBelow(h.n, h.forecastBelow) : h.kind === "allAbove" ? t.headline.allAbove(h.n) : t.headline.mixed(h.below, h.of);
  const context = contextLine(trend.context);
  const [open, setOpen] = useState<Set<string>>(() => new Set(trend.rows[0] ? [trend.rows[0].start] : []));
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  if (!trend.bars.length) {
    return (
      <section aria-labelledby="cycles-h" className="rounded-card-s bg-surface p-t4 shadow-card sm:rounded-card">
        <h2 id="cycles-h" className="text-card text-text sm:text-card-l">{t.heading}</h2>
        <p className="mt-t2 text-small text-text-muted">{t.none}</p>
      </section>
    );
  }

  const done = trend.bars.filter((b) => !b.forecast);
  const fc = trend.bars.find((b) => b.forecast) ?? null;
  const chartLabel = t.chartLabel(done.map((b) => t.spoken(formatWhole(Math.abs(b.value)), b.value < 0)).join(", "), fc ? t.spoken(formatWhole(Math.abs(fc.value)), fc.value < 0) : null);
  const topH = `calc(${Math.round(trend.above * PLOT)}px + ${LABEL})`;
  const botH = trend.bars.some((b) => b.value < 0) ? `calc(${Math.round((1 - trend.above) * PLOT)}px + ${LABEL})` : `${Math.round((1 - trend.above) * PLOT)}px`;
  const s = trend.stats;

  return (
    <section aria-labelledby="cycles-h" className="flex flex-col gap-t5 rounded-card-s bg-surface p-t4 shadow-card sm:rounded-card min-[560px]:p-t5">
      <div className="flex flex-col gap-t2">
        <h2 id="cycles-h" className="text-meta font-bold text-text-muted">{t.heading}</h2>
        <p data-testid="trend-headline" className="text-[1.25rem] font-extrabold leading-tight tracking-[-0.01em] text-text">{headline}</p>
        {context && <p data-testid="trend-context" className="text-body14 leading-relaxed text-text-secondary">{context}</p>}
      </div>

      {/* Chart: one column per pay cycle, a $0 baseline, one scale for both directions. */}
      {/* At very large text sizes the columns can't all fit: the chart then scrolls sideways rather than squashing. */}
      <div tabIndex={0} role="group" aria-label={t.chartScroll} className="-mx-t2 overflow-x-auto rounded-[8px] px-t2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--color-focus)]">
      <div role="img" aria-label={chartLabel} data-testid="trend-chart" className="grid" style={{ gridTemplateColumns: `repeat(${trend.bars.length}, minmax(2.25rem, 1fr))` }}>
        {trend.bars.map((b) => {
          const px = Math.max(4, Math.round(b.height * PLOT));
          const neg = b.value < 0;
          const label = b.forecast ? t.approx(signed(b.value)) : signed(b.value);
          const tone = neg ? "negative" : "accent";
          const bar: CSSProperties = { height: px };
          // Below $0: the soft tint with a lighter outline; the forecast is striped with a dashed outline.
          if (neg) bar.borderColor = `color-mix(in srgb, var(--color-negative) ${b.forecast ? 70 : 45}%, transparent)`;
          if (b.forecast) bar.backgroundImage = `repeating-linear-gradient(135deg, var(--color-${tone}-soft) 0 5px, var(--color-surface) 5px 10px)`;
          return (
            <div key={b.start} data-testid="trend-col" className={cx("flex min-w-0 flex-col items-stretch px-[2px] pb-t2 min-[560px]:px-[6px]", b.forecast && "rounded-[12px] bg-surface2")}>
              <div className="flex flex-col items-center justify-end" style={{ height: topH }}>
                {!neg && <span className="tnum whitespace-nowrap pb-[4px] text-[0.6875rem] font-extrabold text-accent-strong min-[560px]:text-[0.8125rem]">{label}</span>}
                {!neg && <div data-bar="up" className={cx("w-[62%] max-w-[44px] shrink-0 rounded-t-[8px]", b.forecast ? "border-[1.5px] border-b-0 border-dashed border-accent" : "bg-accent")} style={bar} />}
              </div>
              <div className="-mx-[2px] flex flex-col items-center justify-start border-t-[1.5px] border-text min-[560px]:-mx-[6px]" style={{ height: botH }}>
                {neg && <div data-bar="down" className={cx("w-[62%] max-w-[44px] shrink-0 rounded-b-[8px] border-[1.5px] border-t-0", b.forecast ? "border-dashed" : "bg-negative-soft")} style={bar} />}
                {neg && <span className="tnum whitespace-nowrap pt-[4px] text-[0.6875rem] font-extrabold text-negative min-[560px]:text-[0.8125rem]">{label}</span>}
              </div>
              <div className={cx("mt-t2 text-center text-[0.6875rem] leading-snug", b.forecast ? "font-bold text-text" : "text-text-muted")}>
                {b.forecast ? <><span className="min-[560px]:hidden text-[0.625rem]">{t.thisCycleShort[0]}<br />{t.thisCycleShort[1]}</span><span className="hidden min-[560px]:inline">{t.thisCycle}</span></> : <><span className="block min-[560px]:inline">{formatDayMonth(b.start)}–</span><span className="block min-[560px]:inline">{formatDayMonth(b.end)}</span></>}
              </div>
              <div className="mt-[6px] hidden min-h-[20px] flex-col items-center gap-[3px] min-[560px]:flex">
                {b.advance && <span className="whitespace-nowrap rounded-pill px-[7px] py-[2px] text-[0.625rem] font-bold" style={{ background: "color-mix(in srgb, var(--cat-wage-advance) 16%, var(--color-surface))", color: "color-mix(in srgb, var(--cat-wage-advance) 62%, var(--color-text))" }}>{t.tags.advance}</span>}
                {b.fee && <span className="whitespace-nowrap rounded-pill bg-caution-soft px-[7px] py-[2px] text-[0.625rem] font-bold text-caution">{t.tags.fee}</span>}
              </div>
            </div>
          );
        })}
      </div>
      </div>

      <ul className="flex flex-wrap items-center gap-x-t4 gap-y-t2 text-meta-s text-text-muted">
        <li className="inline-flex items-center gap-[6px]"><span aria-hidden className="h-[12px] w-[12px] rounded-[3px] bg-accent" />{t.key.left}</li>
        <li className="inline-flex items-center gap-[6px]"><span aria-hidden className="h-[12px] w-[12px] rounded-[3px] border-[1.5px] border-negative bg-negative-soft" />{t.key.below}</li>
        {current && <li className="inline-flex items-center gap-[6px]"><span aria-hidden className={cx("h-[12px] w-[12px] rounded-[3px] border-[1.5px] border-dashed", current.withEveryday < 0 ? "border-negative bg-negative-soft" : "border-accent bg-accent-soft")} />{t.key.forecast(signed(current.billsOnly))}</li>}
      </ul>

      {/* Three stats: in a row on wider screens, stacked on a phone. */}
      <dl className="grid gap-t3 min-[560px]:grid-cols-3">
        <Stat label={t.stats.below} value={s.below.count ? t.stats.belowValue(s.below.count, s.below.of) : t.stats.belowNone} neg={s.below.count > 0}
          note={s.below.plusForecast ? t.stats.plusForecast : null} />
        <Stat label={t.stats.advances} value={s.advances ? formatWhole(s.advances.total) : t.stats.advancesNone}
          note={s.advances ? [t.stats.advancesNote(s.advances.count, s.advances.fees !== null ? formatWhole(s.advances.fees) : null, formatDayMonth(s.advances.since)), s.advances.toRepay ? t.stats.toRepay(s.advances.toRepay) : null].filter(Boolean).join(" · ") : t.stats.advancesNoneNote} />
        <Stat label={t.stats.fees} value={String(s.fees.count)} note={s.fees.count ? t.stats.feesNote(s.fees.cycles.map((c) => range(c.start, c.end)).join(" and ")) : t.stats.feesNone} />
      </dl>

      {/* Each pay cycle: newest first, the current one on top; tap to open. */}
      <div>
        <h3 className="text-body font-extrabold text-text">{t.list.heading}</h3>
        <p className="text-meta-s text-text-muted">{t.list.hint}</p>
        <ul className="mt-t2">
          {current && trend.current && (
            <Row id="now" open={open.has("now")} onToggle={() => toggle("now")} testId="cycle-current"
              title={`${range(trend.current.start, trend.current.end)} · ${t.list.thisCycle}`}
              sub={[t.list.forecastSub, ...trend.current.advances.map((a) => t.list.advanceOn(formatWhole(a.amount), formatDayMonth(a.date))), trend.current.fees ? t.list.fees(trend.current.fees) : null].filter(Boolean).join(" · ")}
              amount={current.withEveryday < 0 ? t.approx(signed(current.withEveryday)) : t.list.left(t.approx(formatWhole(current.withEveryday)))} neg={current.withEveryday < 0}>
              <p className="text-meta text-text-muted">{t.list.forecastNote(formatWhole(current.everydayPerDay), signed(current.billsOnly))}</p>
              <Links calendar={`/calendar?from=${trend.current.start}&to=${trend.current.end}`} spending="/spending" />
            </Row>
          )}
          {trend.rows.map((r) => (
            <Row key={r.start} id={r.start} open={open.has(r.start)} onToggle={() => toggle(r.start)}
              title={range(r.start, r.end)}
              sub={[r.advances ? t.list.advances(r.advances) : null, r.fees ? t.list.fees(r.fees) : null].filter(Boolean).join(" · ") || t.list.none}
              amount={r.balance < 0 ? signed(r.balance) : t.list.left(formatWhole(r.balance))} neg={r.balance < 0}>
              <Breakdown b={r.breakdown} />
              <Links calendar={`/calendar?from=${r.start}&to=${r.end}`} spending={r.ago === 1 ? "/spending?period=last_cycle" : `/spending?cycle=${r.ago}`} />
            </Row>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Stat({ label, value, note, neg = false }: { label: string; value: string; note: string | null; neg?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-[3px] rounded-[14px] border border-line px-[14px] py-t3">
      <dt className="text-meta-s font-semibold text-text-muted">{label}</dt>
      <dd className={cx("tnum text-[1.25rem] font-extrabold leading-tight", neg ? "text-negative" : "text-text")}>{value}</dd>
      {note && <dd className="text-meta-s text-text-muted">{note}</dd>}
    </div>
  );
}

function Row({ id, open, onToggle, title, sub, amount, neg, testId, children }: {
  id: string; open: boolean; onToggle: () => void; title: string; sub: string; amount: string; neg: boolean; testId?: string; children: React.ReactNode;
}) {
  const panel = `cycle-panel-${id}`;
  return (
    <li data-testid={testId} className="border-t border-divider first:border-t-0">
      <button type="button" aria-expanded={open} aria-controls={panel} onClick={onToggle}
        className="flex min-h-[56px] w-full items-center gap-t3 px-[4px] py-t3 text-left hover:bg-surface2">
        <ChevronRight aria-hidden size={16} strokeWidth={2.4} className={cx("shrink-0 text-text-muted motion-safe:transition-transform motion-safe:duration-fast", open && "rotate-90")} />
        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="text-body14 font-bold text-text">{title}</span>
          <span className="text-meta-s text-text-muted">{sub}</span>
        </span>
        <span className={cx("tnum whitespace-nowrap text-body14 font-extrabold", neg ? "text-negative" : "text-positive")}>{amount}</span>
      </button>
      {open && <div id={panel} className="flex flex-col gap-t3 pb-t4 pl-[4px] pr-[4px] min-[560px]:pl-[32px]">{children}</div>}
    </li>
  );
}

function Links({ calendar, spending }: { calendar: string; spending: string }) {
  const cls = "inline-flex min-h-tap items-center text-meta font-bold text-accent underline-offset-2 hover:underline";
  return (
    <div className="flex flex-wrap gap-x-t4">
      <Link href={calendar} className={cls}>{t.list.seeCalendar}</Link>
      <Link href={spending} className={cls}>{t.list.seeTransactions}</Link>
    </div>
  );
}

// ---- Money in and money out for one pay cycle, on one scale -----------------------------------------------------------

const OUT_TOKEN: Record<SpendGroup, string> = {
  rent: "var(--cat-housing)", everyday: "var(--cat-food)", gambling: "var(--cat-gambling)",
  loans: "var(--cat-loan-repayment)", advance: "var(--cat-wage-advance)", bills: "var(--cat-bills)",
};
const ADVANCE_STRIPE = "repeating-linear-gradient(135deg, var(--cat-wage-advance) 0 6px, var(--cat-dim-wage-advance) 6px 12px)";
const b = t.breakdown;
/** Label widths (rem) the container queries in globals.css know about. */
const SEG_STEPS = [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 10, 12];

function Breakdown({ b: d }: { b: CycleBreakdown }) {
  const pct = (n: number) => `${(n / d.scale) * 100}%`;
  // A label goes inside a segment over 10% of the scale, and only shows when the segment is wide enough for it
  // (globals.css .seg-label: a container query in rem, so it holds at large text sizes too).
  const need = (text: string) => String(SEG_STEPS.find((w) => w >= text.length * 0.4 + 0.7) ?? 12);
  const payAt = d.paid / d.scale;
  const spentAt = d.spent / d.scale;
  const over = Math.round(d.over);
  const outName = (g: SpendGroup, merchants: string[]) => (g === "advance" && merchants.length === 1 ? merchants[0]! : b.legend[g]);
  const outShort = (g: SpendGroup, merchants: string[]) => (g === "advance" && merchants.length === 1 ? merchants[0]! : b.short[g]);
  const label = b.label(
    formatWhole(d.inTotal), d.moneyIn.map((m) => `${m.kind === "advance" ? `${m.label} advance` : employer(m.label)} ${formatWhole(m.amount)}`).join(", "),
    formatWhole(d.spent), d.moneyOut.map((m) => `${outName(m.group, m.merchants)} ${formatWhole(m.amount)}`).join(", "),
    over > 0 ? b.overSpoken(formatWhole(over)) : b.leftSpoken(formatWhole(-over)),
  );
  // The stretch between your pay and what went out: past the pay line when over, short of it when there was some left.
  const gapFrom = Math.min(payAt, spentAt), gapTo = Math.max(payAt, spentAt);
  const first = d.advances[0];
  const covered = over > 0 ? (first ? b.coveredBy(formatWhole(over), formatWhole(first.amount), first.provider, formatDayMonth(first.date)) : b.coveredByBalance(formatWhole(over))) : null;
  const ROW = "relative flex items-center gap-[10px]";
  const LBL = "w-[82px] shrink-0 text-meta-s font-bold text-text";
  return (
    <div data-testid="cycle-breakdown" className="flex flex-col gap-t3">
      <div className="flex flex-wrap items-baseline justify-between gap-t2 text-body14">
        <span className="font-bold text-text">{over > 0 ? b.over(formatWhole(over)) : over < 0 ? b.under(formatWhole(-over)) : b.even}</span>
        <span className="text-meta-s text-text-muted">{b.paidSpent(formatWhole(d.paid), formatWhole(d.spent))}</span>
      </div>
      <div role="img" aria-label={label} className="relative flex flex-col gap-t2 pt-[22px]">
        {/* The band up to your pay, labelled, behind both bars. */}
        <div aria-hidden className="pointer-events-none absolute bottom-[30px] left-[92px] right-0 top-0">
          <div className="absolute bottom-0 left-0 top-0 rounded-[8px] bg-accent-soft" style={{ width: `${payAt * 100}%` }} />
          <span className="absolute left-t2 top-[3px] whitespace-nowrap text-[0.6875rem] font-extrabold text-accent-strong">{b.yourPay(formatWhole(d.paid))}</span>
        </div>
        <div className={ROW}>
          <span className={LBL}>{b.moneyIn}</span>
          <div className="flex h-[22px] min-w-0 flex-1 gap-[2px]">
            {d.moneyIn.map((m, i) => (
              <div key={i} className="seg-fit flex h-full min-w-0 items-center overflow-hidden rounded-[6px] text-[0.6875rem] font-bold text-white"
                style={{ width: pct(m.amount), background: m.kind === "advance" ? ADVANCE_STRIPE : m.kind === "centrelink" ? "var(--cat-centrelink)" : "var(--cat-income)" }}>
                {m.amount / d.scale > 0.06 && (() => { const text = m.kind === "advance" ? b.advance : employer(m.label); return <span aria-hidden className="seg-label whitespace-nowrap px-[8px]" data-need={need(text)}>{text}</span>; })()}
              </div>
            ))}
          </div>
        </div>
        <div className={ROW}>
          <span className={LBL}>{b.moneyOut}</span>
          <div className="flex h-[30px] min-w-0 flex-1 gap-[2px]">
            {d.moneyOut.map((m) => (
              <div key={m.group} className="seg-fit flex h-full min-w-0 items-center justify-center overflow-hidden rounded-[6px] text-[0.6875rem] font-bold text-white"
                style={{ width: pct(m.amount), background: OUT_TOKEN[m.group] }}>
                {m.amount / d.scale > 0.06 && <span aria-hidden className="seg-label whitespace-nowrap px-[6px]" data-need={need(outShort(m.group, m.merchants))}>{outShort(m.group, m.merchants)}</span>}
              </div>
            ))}
          </div>
        </div>
        {/* Under the bars: a bracket over the stretch past your pay (or the pay left), labelled at its end. */}
        <div aria-hidden className="relative ml-[92px] h-[24px]">
          {over !== 0 && (
            <>
              <div className={cx("absolute top-0 h-[7px] rounded-b-[4px] border-x-2 border-b-2", over > 0 ? "border-negative" : "border-positive")}
                style={{ left: `${gapFrom * 100}%`, width: `${(gapTo - gapFrom) * 100}%` }} />
              <span className={cx("absolute top-[9px] whitespace-nowrap rounded-[4px] px-[5px] text-[0.6875rem] font-extrabold", over > 0 ? "bg-negative-soft text-negative" : "bg-positive-soft text-positive")}
                style={{ right: `${(1 - gapTo) * 100}%` }}>
                {over > 0 ? b.overBy(formatWhole(over)) : b.leftOver(formatWhole(-over))}
              </span>
            </>
          )}
        </div>
        {/* The dashed line at your pay, on top of both bars. */}
        <div aria-hidden className="pointer-events-none absolute bottom-[24px] left-[92px] right-0 top-[18px] z-[1]">
          <div className="absolute bottom-0 top-0 -ml-px border-l-2 border-dashed border-text" style={{ left: `${payAt * 100}%` }} />
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-x-t4 gap-y-[10px] min-[560px]:grid-cols-3">
        {d.moneyOut.map((m) => (
          <li key={m.group} className="flex min-w-0 items-start gap-t2 text-meta">
            <span aria-hidden className="mt-[4px] h-[10px] w-[10px] shrink-0 rounded-[3px]" style={{ background: OUT_TOKEN[m.group] }} />
            <span className="min-w-0 text-text"><b className="tnum font-extrabold">{formatWhole(m.amount)}</b> {outName(m.group, m.merchants)}</span>
          </li>
        ))}
      </ul>
      {covered && <p data-testid="breakdown-covered" className="text-meta text-text-muted">{covered}</p>}
    </div>
  );
}
