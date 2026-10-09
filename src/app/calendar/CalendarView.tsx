"use client";
// P5 Calendar: fortnight (default) or month, a day sheet, and tap-tap range totals. Confirmed and predicted
// figures are never mixed: predicted bills and forecast balances are labelled as such everywhere.
// 08/10/2026: the answer first (a headline: covered until payday, or how short and when), a slim balance chart,
// then the timeline of money events as the main view, with the grid one tap away. No rail: nothing repeats, and
// a selected day shows in the drawer only.
import { ArrowDownToLine, CalendarDays, TrendingUp, ChevronLeft, ChevronRight, CircleCheck, Info, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CategoryId } from "@/lib/api/types";
import { calendarPage as t } from "@/content/spending";
import { calendar as cal, transaction as txCopy } from "@/content/components";
import { categoryNames } from "@/content/en-AU";
import { formatCents, formatShortDay, formatWhole } from "@/lib/format";
import { calendarHeadline, calendarTimeline, rangeTotals, type CalendarDay, type CalendarHeadline } from "@/lib/selectors/calendar";
import { BIG_BILL, CalendarGrid, closeToZero, tintFor } from "@/components/domain/Calendar";
import { MoneyTimeline } from "@/components/domain/MoneyTimeline";
import { cx } from "@/components/ui/cx";
import { BalanceChart } from "@/components/domain/BalanceChart";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/Chips";
import { Sheet } from "@/components/ui/Sheet";

export interface DayTx { id: string; merchant: string; amount: number; category: CategoryId; status: "posted" | "pending"; subcategory: string | null }
interface Nav { label: string; prev: string | null; next: string | null; prevLabel: string; nextLabel: string }

const withYear = (d: string) => `${formatShortDay(d)}/${d.slice(0, 4)}`;
const money = (n: number) => (Number.isInteger(n) ? formatWhole(n) : formatCents(n));

export function CalendarInfoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label={t.info} onClick={() => setOpen(true)}
        className="inline-flex h-tap w-tap shrink-0 items-center justify-center rounded-pill bg-surface text-text-secondary shadow-card hover:text-text desktop:h-[48px] desktop:w-[48px]">
        <Info aria-hidden size={20} strokeWidth={1.8} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t.info}>
        <div className="flex flex-col gap-t3">{t.infoBody.map((p) => <p key={p} className="text-body text-text-muted">{p}</p>)}</div>
      </Sheet>
    </>
  );
}

export function CalendarView({ view, days, asOf, nav, monthHref, fortnightHref, nextPayday, nextPaydayHref, nextIncome = null, focus, txByDay, openDay, isShort }: {
  view: "fortnight" | "month"; days: CalendarDay[]; asOf: string; nav: Nav; monthHref: string; fortnightHref: string;
  nextPayday: string | null; nextPaydayHref: string | null; nextIncome?: number | null; focus: string | null; txByDay: Record<string, DayTx[]>; openDay: string | null; isShort: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // The view switch answers at once (the new view loads behind it), so a tap never seems to do nothing.
  const [shownView, setShownView] = useState(view);
  const [sheetDay, setSheetDay] = useState<string | null>(openDay);
  const [mode, setMode] = useState<"list" | "calendar">(focus ? "calendar" : "list");
  const [rangeMode, setRangeMode] = useState(false);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const rangeCard = useRef<HTMLElement>(null);
  const totals = from && to ? rangeTotals(days, from, to) : null;
  const sheet = days.find((d) => d.date === sheetDay) ?? null;
  useEffect(() => { if (totals) rangeCard.current?.focus(); }, [totals?.from, totals?.to]); // eslint-disable-line react-hooks/exhaustive-deps

  // One set of numbers for the headline, chart, timeline and grid.
  const inView = useMemo(() => days.filter((d) => !d.outside), [days]);
  const headline = useMemo(() => calendarHeadline(days, asOf, nextPayday), [days, asOf, nextPayday]);
  const lowest = headline.kind === "none" ? null : headline.date;
  const timeline = useMemo(() => calendarTimeline(days, asOf, lowest), [days, asOf, lowest]);

  const onDay = (d: CalendarDay) => {
    if (!rangeMode) { setSheetDay(d.date); return; }
    if (!from || to) { setFrom(d.date); setTo(null); return; }
    setTo(d.date);
    setRangeMode(false);
  };
  const clearRange = () => { setFrom(null); setTo(null); setRangeMode(false); };
  const switchView = (v: "fortnight" | "month") => {
    setShownView(v);
    startTransition(() => router.push(v === "month" ? monthHref : fortnightHref));
  };

  // Legend for the grid: only what this view shows.
  const close = closeToZero(days);
  const tints = new Set(inView.map((d) => tintFor(d, close, lowest)));
  const has = {
    spend: inView.some((d) => !d.isPayday && d.highSpend && !d.predictedBills.some((b) => b.expected_amount >= BIG_BILL)),
    bill: inView.some((d) => !d.isPayday && d.predictedBills.some((b) => b.expected_amount < BIG_BILL) && !d.predictedBills.some((b) => b.expected_amount >= BIG_BILL)),
    bigBill: inView.some((d) => !d.isPayday && d.predictedBills.some((b) => b.expected_amount >= BIG_BILL)),
    payday: inView.some((d) => d.isPayday),
  };

  return (
    <div className="pb-t6 desktop:max-w-[760px]">
      <SegmentedControl label={t.viewLabel} value={shownView} onChange={switchView}
        options={[{ value: "fortnight", label: t.views.fortnight }, { value: "month", label: t.views.month }]} />

      <div aria-busy={pending} className={cx("transition-opacity duration-fast", pending && "opacity-60")}>
        <div className="mt-t4 flex items-center justify-between gap-t2">
          {nav.prev ? (
            <Link href={nav.prev} aria-label={nav.prevLabel} className="inline-flex h-tap w-tap items-center justify-center rounded-pill text-accent hover:bg-surface2"><ChevronLeft aria-hidden size={20} strokeWidth={1.8} /></Link>
          ) : <span className="h-tap w-tap" />}
          <h2 className="text-card text-text sm:text-card-l">{nav.label}</h2>
          {nav.next ? (
            <Link href={nav.next} aria-label={nav.nextLabel} className="inline-flex h-tap w-tap items-center justify-center rounded-pill text-accent hover:bg-surface2"><ChevronRight aria-hidden size={20} strokeWidth={1.8} /></Link>
          ) : <span className="h-tap w-tap" />}
        </div>

        <Headline h={headline} />

        <div className="mt-t3"><BalanceChart days={inView.filter((d) => d.balance !== null)} lowest={lowest} /></div>

        <div className="mt-t4 flex items-center justify-between gap-t3">
          <span className="text-body14 font-semibold text-text-secondary" aria-hidden>{t.showAs}</span>
          <div className="w-[220px]">
            <SegmentedControl label={t.showAs} value={mode} onChange={setMode}
              options={[{ value: "list", label: t.showAsOptions.list }, { value: "calendar", label: t.showAsOptions.calendar }]} />
          </div>
        </div>

        <div className="mt-t3">
          {mode === "list" ? (
            <MoneyTimeline days={timeline.days} forecastEnds={timeline.forecastEnds} label={`${t.timeline.heading}, ${nav.label}`}
              onDay={(date) => setSheetDay(date)}
              next={nextPayday ? { date: nextPayday, amount: nextIncome, onOpen: nextPaydayHref ? () => router.push(nextPaydayHref) : null } : null} />
          ) : (
            <>
              <div className="rounded-card-s bg-surface py-t3 shadow-card sm:rounded-card">
                <CalendarGrid days={days} label={nav.label} selected={rangeMode || totals ? null : sheetDay} rangeFrom={from} rangeTo={to ?? from}
                  initialFocus={focus ?? openDay} nextPayday={null} onDay={onDay} lowest={lowest} />
              </div>
              {timeline.forecastEnds && <p className="mt-t2 text-meta text-text-muted">{t.gridForecastEnds(formatShortDay(timeline.forecastEnds))}</p>}
              <ul className="mt-t3 flex flex-wrap items-center gap-x-t5 gap-y-t2 text-meta text-text-secondary">
                {has.spend && <li className="inline-flex items-center gap-t2"><TrendingUp aria-hidden size={14} strokeWidth={2.4} className="text-text-secondary" />{t.legend.spend}</li>}
                {has.bill && <li className="inline-flex items-center gap-t2"><span aria-hidden className="h-[8px] w-[8px] rounded-pill border-2" style={{ borderColor: "var(--chart-predicted)" }} />{t.legend.bill}</li>}
                {has.bigBill && <li className="inline-flex items-center gap-t2"><span aria-hidden className="tnum rounded-[4px] border border-dashed px-[3px] text-caption" style={{ borderColor: "var(--chart-predicted)" }}>−$</span>{t.legend.bigBill}</li>}
                {has.payday && <li className="inline-flex items-center gap-t2"><ArrowDownToLine aria-hidden size={14} className="text-accent" />{t.legend.payday}</li>}
                {tints.has("negative") && <li className="inline-flex items-center gap-t2"><span aria-hidden className="h-[14px] w-[18px] rounded-[4px] bg-negative-soft shadow-[inset_0_0_0_2px_var(--color-negative)]" />{t.legend.below}</li>}
                {tints.has("caution") && <li className="inline-flex items-center gap-t2"><span aria-hidden className="h-[14px] w-[18px] rounded-[4px] bg-caution-soft" />{t.legend.close}</li>}
                {tints.has("lowest") && <li className="inline-flex items-center gap-t2"><span aria-hidden className="h-[14px] w-[18px] rounded-[4px] [outline:2px_dashed_var(--color-text-secondary)] [outline-offset:-2px]" />{t.legend.lowest}</li>}
                <li className="w-full text-text-muted">{t.legend.note}</li>
              </ul>
              <div className="mt-t4 flex flex-wrap items-center gap-t3">
                <Button variant="secondary" aria-pressed={rangeMode} onClick={() => (rangeMode ? clearRange() : (setRangeMode(true), setFrom(null), setTo(null)))}>
                  {rangeMode ? t.cancelRange : t.selectRange}
                </Button>
                <p role="status" className="text-small text-text-muted">{rangeMode ? (from ? t.rangeHintEnd : t.rangeHint) : ""}</p>
              </div>
              {totals && (
                <section ref={rangeCard} tabIndex={-1} aria-labelledby="range-h" className="mt-t3 rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
                  <h3 id="range-h" className="text-card text-text sm:text-card-l">{t.rangeTitle(formatShortDay(totals.from), formatShortDay(totals.to))}</h3>
                  <p className="text-caption text-text-muted">{t.rangeDays(totals.days)}</p>
                  <dl className="mt-t3 grid grid-cols-2 gap-t3">
                    <Fig label={t.rangeSpent} value={formatWhole(totals.spent)} />
                    <Fig label={t.rangeIncome} value={formatWhole(totals.paidIn)} />
                    {totals.bills > 0 && <Fig label={t.rangeBills} value={formatWhole(totals.bills)} predicted />}
                    {totals.expectedIncome > 0 && <Fig label={t.rangeExpected} value={formatWhole(totals.expectedIncome)} predicted />}
                  </dl>
                  <Button variant="tertiary" className="mt-t3" onClick={clearRange}>{t.clearRange}</Button>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <DaySheet day={sheet} days={days} asOf={asOf} tx={sheet ? txByDay[sheet.date] ?? [] : []} isShort={isShort} onClose={() => setSheetDay(null)} />
    </div>
  );
}

/** The answer, first: covered until payday (and the lowest point) or how short and when, with a way forward. */
function Headline({ h }: { h: CalendarHeadline }) {
  const hl = t.headline;
  if (h.kind === "none") return <p className="mt-t3 rounded-card-s bg-surface p-t4 text-body14 text-text-muted shadow-card sm:rounded-card">{hl.none}</p>;
  const short = h.kind === "short";
  const text = h.kind === "short" ? hl.short(formatWhole(h.amount), formatShortDay(h.date), h.daysBefore)
    : h.kind === "covered" ? hl.covered(formatWhole(h.balance), formatShortDay(h.date), h.payday ? formatShortDay(h.payday) : null)
    : hl.past(formatWhole(h.balance), formatShortDay(h.date), formatWhole(h.closing));
  const sub = h.kind === "past" ? hl.spent(formatWhole(h.spent), h.count)
    : h.billCount ? hl.bills(formatWhole(h.bills), h.billCount, !!h.payday) : hl.noBills(!!h.payday);
  const Icon = short ? TriangleAlert : h.kind === "covered" ? CircleCheck : CalendarDays;
  return (
    <section aria-label={text} className={cx("mt-t3 rounded-card-s p-t4 shadow-card sm:rounded-card sm:p-t5", short ? "bg-negative-soft" : "bg-surface")}>
      <div className="flex items-start gap-t3">
        <Icon aria-hidden size={22} strokeWidth={2} className={cx("mt-[2px] shrink-0", short ? "text-negative" : "text-accent")} />
        <div className="min-w-0 flex-1">
          <p className="tnum text-[1.0625rem] font-bold leading-6 text-text">{text}</p>
          <p className="tnum mt-t1 text-body14 text-text-secondary">{sub}</p>
          {h.kind !== "past" && <p className="mt-t1 text-meta text-text-muted">{hl.estimate}</p>}
        </div>
      </div>
      {short && <ButtonLink href="/hardship" variant="link" className="mt-t3">{hl.options}</ButtonLink>}
    </section>
  );
}

function Fig({ label, value, predicted }: { label: string; value: string; predicted?: boolean }) {
  return (
    <div className={predicted ? "rounded-sm border border-dashed p-t3" : "rounded-sm bg-surface2 p-t3"} style={predicted ? { borderColor: "var(--chart-predicted)" } : undefined}>
      <dt className="text-caption text-text-muted">{label}{predicted ? ` · ${cal.predicted}` : ""}</dt>
      <dd className="tnum mt-t1 text-body-strong text-text">{value}</dd>
    </div>
  );
}

function DaySheet({ day, days, asOf, tx, isShort, onClose }: { day: CalendarDay | null; days: CalendarDay[]; asOf: string; tx: DayTx[]; isShort: boolean; onClose: () => void }) {
  const eq = useMemo(() => {
    if (!day?.balancePredicted || day.balance === null) return null;
    const i = days.findIndex((d) => d.date === day.date);
    const prev = days[i - 1];
    if (!prev || prev.balance === null) return null;
    const items = [...day.predictedBills.map((b) => `− ${money(b.expected_amount)}`), ...day.predictedIncome.map((p) => `+ ${formatWhole(p.amount)}`)];
    if (!items.length) return null;
    return t.day.equation(formatWhole(prev.balance), items.join(" "), formatWhole(day.balance));
  }, [day, days]);
  const spend = tx.filter((x) => x.amount < 0 && x.category !== "transfer");
  return (
    <Sheet open={!!day} onClose={onClose} title={day ? withYear(day.date) : ""}
      footer={day ? (
        <>
          <ButtonLink full variant="secondary" href="/spending">{t.day.seeSpending}</ButtonLink>
          {(day.belowZero || isShort) && <ButtonLink full variant="link" href="/hardship">{t.day.hardship}</ButtonLink>}
        </>
      ) : undefined}>
      {day && (
        <div className="flex flex-col gap-t5">
          {day.date > asOf ? null : (
            <section>
              <div className="flex items-baseline justify-between gap-t3">
                <h3 className="text-h3 text-text">{t.day.spent}</h3>
                <span className="tnum text-h3 text-text">{formatWhole(day.confirmedSpend)}</span>
              </div>
              {spend.length ? (
                <ul className="mt-t2">
                  {spend.map((x) => (
                    <li key={x.id} className="flex min-h-[48px] items-center justify-between gap-t3 border-t border-divider">
                      <span className="min-w-0">
                        <span className="block text-small text-text">{x.merchant}</span>
                        <span className="block text-caption text-text-muted">{categoryNames[x.category]}{x.status === "pending" ? ` · ${txCopy.pending}` : ""}</span>
                      </span>
                      <span className="tnum text-small text-text">−{formatCents(-x.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-t2 text-small text-text-muted">{t.day.noSpend}</p>}
              {day.paidIn > 0 && <p className="tnum mt-t3 text-small text-text">{t.day.paidIn}: {formatWhole(day.paidIn)}</p>}
            </section>
          )}
          {day.date > asOf && <p className="text-small text-text-muted">{t.day.future}</p>}
          {day.predictedBills.length > 0 && (
            <section>
              <h3 className="text-h3 text-text">{t.day.bills}</h3>
              <ul className="mt-t2 flex flex-col gap-t2">
                {day.predictedBills.map((b) => (
                  <li key={b.merchant} className="rounded-sm border border-dashed p-t3" style={{ borderColor: "var(--chart-predicted)" }}>
                    <div className="flex justify-between gap-t3 text-small text-text"><span>{b.merchant}</span><span className="tnum text-body-strong">{money(b.expected_amount)}</span></div>
                    <p className="text-caption text-text-muted">{t.day.predictedNote}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {day.predictedIncome.length > 0 && (
            <section>
              <h3 className="text-h3 text-text">{t.day.income}</h3>
              <ul className="mt-t2">
                {day.predictedIncome.map((p) => (
                  <li key={p.payer} className="flex justify-between gap-t3 text-small text-text"><span>{p.payer}</span><span className="tnum">{p.exact ? "" : "~"}{formatWhole(p.amount)}</span></li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h3 className="text-h3 text-text">{t.day.balance}</h3>
            {day.balance === null ? <p className="mt-t1 text-small text-text-muted">{t.noBalance}</p> : (
              <p className="mt-t1 flex items-center gap-t3">
                <span className="tnum text-h2 font-display text-text">{formatWhole(day.balance)}</span>
                <span className="text-small text-text-muted">{day.balancePredicted ? t.forecast : t.confirmed}</span>
              </p>
            )}
            {eq && <p className="tnum mt-t2 text-small text-text-muted">{eq}</p>}
          </section>
        </div>
      )}
    </Sheet>
  );
}
