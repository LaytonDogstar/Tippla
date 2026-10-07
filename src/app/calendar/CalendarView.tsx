"use client";
// P5 Calendar: fortnight (default) or month, a day sheet, and tap-tap range totals. Confirmed and predicted
// figures are never mixed: predicted bills and forecast balances are labelled as such everywhere.
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CategoryId } from "@/lib/api/types";
import { calendarPage as t } from "@/content/spending";
import { calendar as cal, transaction as txCopy } from "@/content/components";
import { categoryNames } from "@/content/en-AU";
import { formatCents, formatShortDay, formatWhole } from "@/lib/format";
import { rangeTotals, type CalendarDay } from "@/lib/selectors/calendar";
import { BalanceStrip, CalendarGrid, LOW_BALANCE } from "@/components/domain/Calendar";
import { BalanceChart } from "@/components/domain/BalanceChart";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/Chips";
import { Sheet } from "@/components/ui/Sheet";
import { PageColumns } from "@/components/shell/PageColumns";

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

export function CalendarView({ view, days, asOf, nav, monthHref, fortnightHref, nextPayday, nextPaydayHref, focus, txByDay, openDay, isShort }: {
  view: "fortnight" | "month"; days: CalendarDay[]; asOf: string; nav: Nav; monthHref: string; fortnightHref: string;
  nextPayday: string | null; nextPaydayHref: string | null; focus: string | null; txByDay: Record<string, DayTx[]>; openDay: string | null; isShort: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(openDay ?? days.find((d) => d.isToday)?.date ?? null);
  const [sheetDay, setSheetDay] = useState<string | null>(openDay);
  const [rangeMode, setRangeMode] = useState(false);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const rangeCard = useRef<HTMLElement>(null);
  // At large text sizes seven columns can't fit: default to the list (Astra: a labelled list alternative).
  const [list, setList] = useState(false);
  useEffect(() => { if (parseFloat(getComputedStyle(document.documentElement).fontSize) >= 24) setList(true); }, []);
  const totals = from && to ? rangeTotals(days, from, to) : null;
  const sel = days.find((d) => d.date === selected) ?? null;
  const sheet = days.find((d) => d.date === sheetDay) ?? null;
  useEffect(() => { if (totals) rangeCard.current?.focus(); }, [totals?.from, totals?.to]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDay = (d: CalendarDay) => {
    if (!rangeMode) { setSelected(d.date); setSheetDay(d.date); return; }
    if (!from || to) { setFrom(d.date); setTo(null); return; }
    setTo(d.date);
    setRangeMode(false);
  };
  const clearRange = () => { setFrom(null); setTo(null); setRangeMode(false); };

  const upcoming = days.filter((d) => d.date > asOf && !d.outside).flatMap((d) => d.predictedBills.map((b) => ({ ...b, date: d.date })));
  const main = (
    <div>
      <SegmentedControl label={t.viewLabel} value={view} onChange={(v) => router.push(v === "month" ? monthHref : fortnightHref)}
        options={[{ value: "fortnight", label: t.views.fortnight }, { value: "month", label: t.views.month }]} />

      <div className="mt-t4 flex items-center justify-between gap-t2">
        {nav.prev ? (
          <Link href={nav.prev} aria-label={nav.prevLabel} className="inline-flex h-tap w-tap items-center justify-center rounded-pill text-accent hover:bg-surface2"><ChevronLeft aria-hidden size={20} strokeWidth={1.8} /></Link>
        ) : <span className="h-tap w-tap" />}
        <h2 className="text-card text-text sm:text-card-l">{nav.label}</h2>
        {nav.next ? (
          <Link href={nav.next} aria-label={nav.nextLabel} className="inline-flex h-tap w-tap items-center justify-center rounded-pill text-accent hover:bg-surface2"><ChevronRight aria-hidden size={20} strokeWidth={1.8} /></Link>
        ) : <span className="h-tap w-tap" />}
      </div>

      {view === "fortnight" && <BalanceChart days={days.filter((d) => !d.outside)} />}

      <div className="mt-t2 flex justify-end">
        <Button variant="tertiary" aria-pressed={list} onClick={() => setList((v) => !v)}>{list ? t.showGrid : t.showList}</Button>
      </div>
      {list ? (
        <ul aria-label={`${t.listLabel}, ${nav.label}`} className="mt-t1 overflow-hidden rounded-card-s bg-surface shadow-card sm:rounded-card">
          {days.filter((d) => !d.outside).map((d) => (
            <li key={d.date} className="border-b border-divider last:border-b-0">
              <button type="button" onClick={() => onDay(d)} aria-current={d.isToday ? "date" : undefined}
                className={`flex min-h-[64px] w-full flex-col items-start gap-t1 p-t4 text-left hover:bg-surface2 ${from && to && d.date >= (from < to ? from : to) && d.date <= (from < to ? to : from) ? "bg-accent-soft" : ""}`}>
                <span className="text-body-strong text-text">{withYear(d.date)}{d.isToday ? ` · ${cal.today}` : ""}{d.isPayday ? ` · ${cal.pay}` : ""}</span>
                {d.confirmedCount > 0 && <span className="tnum text-small text-text">{t.listSpent(formatWhole(d.confirmedSpend))}</span>}
                {d.predictedBills.length > 0 && <span className="tnum text-small text-text-muted">{t.listBills(d.predictedBills.length, money(d.predictedBills.reduce((a, b) => a + b.expected_amount, 0)))}</span>}
                {d.balance !== null && <span className="tnum flex items-center gap-t2 text-small text-text-muted"><BalanceStrip day={d} />{t.listBalance(formatWhole(d.balance), d.balancePredicted)}</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-t1 rounded-card-s bg-surface shadow-card sm:rounded-card py-t3">
          <CalendarGrid days={days} label={nav.label} selected={rangeMode || totals ? null : selected} rangeFrom={from} rangeTo={to ?? from}
            initialFocus={focus ?? openDay} nextPayday={null} onDay={onDay} />
        </div>
      )}

      {nextPayday && (
        <button type="button" disabled={!nextPaydayHref} onClick={() => nextPaydayHref && router.push(nextPaydayHref)}
          className="mt-t3 flex min-h-tap w-full items-center gap-t2 rounded-sm bg-accent-soft py-t1 px-t3 text-small text-accent disabled:text-text-muted">
          <span className="flex-1 text-left">{cal.nextPayday(formatShortDay(nextPayday))}</span>
          {nextPaydayHref && <ChevronRight aria-hidden size={20} />}
        </button>
      )}

      <div className="mt-t4 flex flex-wrap items-center gap-x-t5 gap-y-t2 text-meta text-text-secondary">
        <span className="inline-flex items-center gap-t2"><span aria-hidden className="h-[6px] w-[6px] rounded-pill bg-neutral" />{t.legend.confirmed}</span>
        <span className="inline-flex items-center gap-t2"><span aria-hidden className="h-[8px] w-[8px] rounded-pill border-2" style={{ borderColor: "var(--chart-predicted)" }} />{t.legend.predicted}</span>
        {/* Day tints: forecast balance, soft tints only (UX round 2, 5.1). */}
        <span className="inline-flex items-center gap-t2"><span aria-hidden className="h-[14px] w-[18px] rounded-[4px] bg-positive-soft" />{t.legend.ok(formatWhole(LOW_BALANCE))}</span>
        <span className="inline-flex items-center gap-t2"><span aria-hidden className="h-[14px] w-[18px] rounded-[4px] bg-caution-soft" />{t.legend.low(formatWhole(LOW_BALANCE))}</span>
        <span className="inline-flex items-center gap-t2"><span aria-hidden className="h-[14px] w-[18px] rounded-[4px] bg-negative-soft shadow-[inset_0_0_0_2px_var(--color-negative)]" />{t.legend.below}</span>
        <span className="w-full text-text-muted">{t.legend.note}</span>
      </div>

      <div className="mt-t4 flex flex-wrap items-center gap-t3">
        <Button variant="secondary" aria-pressed={rangeMode} onClick={() => (rangeMode ? clearRange() : (setRangeMode(true), setFrom(null), setTo(null)))}>
          {rangeMode ? t.cancelRange : t.selectRange}
        </Button>
        <p role="status" className="text-small text-text-muted">{rangeMode ? (from ? t.rangeHintEnd : t.rangeHint) : ""}</p>
      </div>

    </div>
  );
  const rail = (
    <>
      {totals ? (
        <section ref={rangeCard} tabIndex={-1} aria-labelledby="range-h" className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
          <h2 id="range-h" className="text-card text-text sm:text-card-l">{t.rangeTitle(formatShortDay(totals.from), formatShortDay(totals.to))}</h2>
          <p className="text-caption text-text-muted">{t.rangeDays(totals.days)}</p>
          <dl className="mt-t3 grid grid-cols-2 gap-t3">
            <Fig label={t.rangeSpent} value={formatWhole(totals.spent)} />
            <Fig label={t.rangeIncome} value={formatWhole(totals.paidIn)} />
            {totals.bills > 0 && <Fig label={t.rangeBills} value={formatWhole(totals.bills)} predicted />}
            {totals.expectedIncome > 0 && <Fig label={t.rangeExpected} value={formatWhole(totals.expectedIncome)} predicted />}
          </dl>
          <Button variant="tertiary" className="mt-t3" onClick={clearRange}>{t.clearRange}</Button>
        </section>
      ) : sel && (
        <section aria-label={t.selected(withYear(sel.date))} className="flex min-h-[88px] items-center gap-t3 rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
          <div className="min-w-0 flex-1">
            <p className="text-caption text-text-muted">{sel.isToday ? t.today(formatShortDay(sel.date)) : formatShortDay(sel.date)}</p>
            <p className="mt-t1 text-small text-text">
              {sel.balance === null ? t.noBalance : <><span className="tnum text-h2 font-display">{formatWhole(sel.balance)}</span> <span className="text-text-muted">{sel.balancePredicted ? t.forecast : t.confirmed}</span></>}
            </p>
          </div>
          <Button variant="secondary" onClick={() => setSheetDay(sel.date)}>{t.viewDay}</Button>
        </section>
      )}

      {/* Rail: what's coming out of the account in this view (UX round 2, 4.1). */}
      <section aria-labelledby="cal-bills-h" className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
        <h2 id="cal-bills-h" className="text-card text-text sm:text-card-l">{t.upcomingBills}</h2>
        {upcoming.length ? (
          <ul className="mt-t2 flex flex-col">
            {upcoming.map((b) => (
              <li key={`${b.merchant}-${b.date}`} className="flex min-h-[52px] items-center justify-between gap-t3 border-t border-divider first:border-t-0">
                <span className="min-w-0">
                  <span className="block text-body14 font-semibold text-text">{b.merchant}</span>
                  <span className="block text-meta text-text-muted">{formatShortDay(b.date)} · {cal.predicted}</span>
                </span>
                <span className="tnum text-row text-text">{money(b.expected_amount)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-t2 text-body14 text-text-muted">{t.noUpcomingBills}</p>}
      </section>
    </>
  );

  return (
    <div className="pb-t6">
      <PageColumns main={main} rail={rail} railLabel={t.railLabel} />
      <DaySheet day={sheet} days={days} asOf={asOf} tx={sheet ? txByDay[sheet.date] ?? [] : []} isShort={isShort} onClose={() => setSheetDay(null)} />
    </div>
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
          {(day.belowZero || isShort) && <ButtonLink full variant="tertiary" href="/hardship">{t.day.hardship}</ButtonLink>}
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
                <BalanceStrip day={day} />
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
