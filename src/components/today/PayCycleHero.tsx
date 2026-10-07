"use client";
// Today hero (redesign 07/10/2026): the one headline figure for this pay cycle, in three states.
//   short   → "–$53 short of what's due before payday"   (soft negative dot)
//   tight   → "$12 left after bills, with nothing spare"    (caution dot)
//   onTrack → "$141 a day safe to spend until payday"       (positive dot)
// Then the days-to-payday strip, balance against what's due, paid in / spent / pay advance (never income),
// and two actions: what's due, and options if money's tight (always next to a short state).
import Link from "next/link";
import { ArrowDown, ArrowUp, CreditCard, Unplug } from "lucide-react";
import { todayCopy } from "@/content/today";
import { cx } from "@/components/ui/cx";
import { formatShortDay, formatDayMonth, formatWhole } from "@/lib/format";
import type { PayCycleSummary } from "@/lib/selectors/payCycle";
import type { SafeToSpend } from "@/lib/selectors/safeToSpend";
import { cycleDays, dueCoverage, heroState, type HeroState } from "@/lib/selectors/today";

const t = todayCopy.hero;
const DOT: Record<HeroState, string> = { short: "bg-hero-negative-mark", tight: "bg-hero-caution-mark", onTrack: "bg-hero-positive-mark" };

export function PayCycleHero({ pc, safe, asOf, stsPaused, movement, disconnected, onDue, onSafe, onAdvance }: {
  pc: PayCycleSummary; safe: SafeToSpend; asOf: string;
  /** Data too old for safe to spend: show what's left after bills instead (spec 05). */
  stsPaused?: boolean;
  movement?: string | null;
  /** The bank is disconnected: the figures stopped at the last refresh. */
  disconnected?: { href: string } | null;
  onDue: () => void; onSafe: () => void; onAdvance: () => void;
}) {
  const state = heroState(pc, safe);
  const payday = formatShortDay(pc.nextPayday);
  const cov = dueCoverage(pc);
  const days = cycleDays(pc, asOf);
  const advance = pc.payAdvances[0];
  const advanceTotal = pc.payAdvances.reduce((s, a) => s + a.amount, 0);
  // Headline: the shortfall, what's left after bills, or the daily safe-to-spend figure.
  const showLeft = state === "tight" || (state === "onTrack" && (stsPaused || safe.sevenDayMode));
  const amount = state === "short" ? formatWhole(cov.short) : showLeft ? formatWhole(Math.max(0, pc.leftAfterBills)) : formatWhole(safe.perDay);
  const [line, sr] = state === "short" ? [t.shortLine, t.shortSr(amount, payday)]
    : state === "tight" ? [t.tightLine, t.tightSr(amount, payday)]
    : showLeft ? [t.leftLine, t.leftSr(amount, payday)]
    : [t.onTrackLine, t.onTrackSr(amount, payday)];
  const due = pc.dueBeforePayday;
  const dueList = due.slice(0, 2).map((b) => `${b.merchant} ${formatWhole(b.expected_amount)}`).join(" · ") + (due.length > 2 ? ` ${t.more(due.length - 2)}` : "");

  return (
    <section aria-labelledby="hero-h" className="on-brand flex flex-col gap-t4 rounded-hero-s bg-hero p-t4 text-hero-on shadow-hero sm:gap-t6 sm:p-t6 desktop:rounded-hero desktop:px-t7 desktop:py-[28px]">
      <h2 id="hero-h" className="sr-only">{t.label}</h2>
      {disconnected && (
        <Link href={disconnected.href} className="flex min-h-tap items-center gap-t2 rounded-inset bg-hero-glass px-t3 py-t2 text-meta font-semibold">
          <Unplug aria-hidden size={16} strokeWidth={1.8} /><span className="flex-1">{todayCopy.disconnected}</span><span className="underline">{todayCopy.reconnect}</span>
        </Link>
      )}
      <div className="flex flex-wrap items-center gap-t3">
        <span className="text-body14 text-hero-on-muted">{t.cycle(formatDayMonth(pc.cycle.start), formatDayMonth(pc.cycle.end))}</span>
        <span className="inline-flex items-center gap-t2 rounded-pill bg-hero-glass px-t3 py-[5px] text-meta font-semibold" data-testid="hero-pill">
          <span aria-hidden className={cx("h-[8px] w-[8px] rounded-pill", DOT[state])} />{t.pill[state]}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-t5 desktop:gap-t7">
        <div className="min-w-0 flex-[1_1_280px]">
          <p data-testid="hero-amount">
            <span aria-hidden className="block text-hero-num desktop:text-hero-num-l">{state === "short" ? `–${amount}` : amount}</span>
            <span aria-hidden className="mt-t2 block text-[0.9375rem] leading-[1.375rem] text-hero-on-muted sm:text-[1rem] sm:leading-6">{line} <strong className="font-bold text-hero-on">{payday}</strong></span>
            <span className="sr-only">{sr}</span>
          </p>
          {state !== "short" && (
            <button type="button" onClick={onSafe} className="mt-t2 inline-flex min-h-tap items-center text-meta font-semibold text-hero-on underline underline-offset-2">
              {movement ?? (state === "onTrack" && !showLeft ? t.estimate : null) ? <span className="mr-t2 rounded-pill bg-hero-glass px-t2 py-[2px] no-underline">{movement ?? t.estimate}</span> : null}
              {t.how}
            </button>
          )}
        </div>
        <div className="flex w-full flex-col gap-t2 sm:w-auto sm:flex-[0_1_260px]">
          <div className="flex justify-between text-meta text-hero-on-muted">
            <span>{t.daysToPayday}</span>
            <strong className="text-[0.9375rem] font-bold text-hero-on">{pc.daysToPayday === 0 ? t.paydayToday : t.daysLeft(pc.daysToPayday)}</strong>
          </div>
          <div role="img" aria-label={t.daysSr(pc.daysToPayday, days.length)} className="grid gap-[4px]" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {days.map((d, i) => <span key={i} className={cx("h-[8px] rounded-pill", d === "past" ? "bg-hero-past" : d === "today" ? "bg-hero-on" : "bg-hero-future")} />)}
          </div>
        </div>
      </div>

      {/* Balance against what's due before payday */}
      <div className="flex flex-col gap-t3 rounded-inset bg-hero-inset px-t4 py-t3 sm:px-t5 sm:py-t4">
        <div className="flex flex-wrap justify-between gap-t2 text-body14 text-hero-on">
          <span>{t.balance} <strong className="text-[1rem] font-bold">{formatWhole(pc.balance)}</strong></span>
          <span>{t.due} <strong className="text-[1rem] font-bold">{formatWhole(pc.dueTotal)}</strong></span>
        </div>
        <div role="img" aria-label={t.barSr(formatWhole(cov.covered), formatWhole(pc.dueTotal), formatWhole(state === "short" ? cov.short : cov.left), state === "short")}
          className="flex h-[10px] overflow-hidden rounded-pill bg-hero-future">
          <span className="bg-hero-on" style={{ width: `${Math.round(cov.coveredShare * 1000) / 10}%` }} />
          {state === "short" && <span className="flex-1" style={{ background: "repeating-linear-gradient(135deg, var(--hero-negative-mark) 0 4px, var(--hero-inset) 4px 8px)" }} />}
        </div>
        <div className="flex flex-wrap gap-x-t5 gap-y-t2 text-meta text-hero-on">
          <span className="inline-flex items-center gap-[6px]"><span aria-hidden className="h-[8px] w-[8px] rounded-pill bg-hero-on" />{t.covered(formatWhole(cov.covered))}</span>
          {state === "short"
            ? <span className="inline-flex items-center gap-[6px]"><span aria-hidden className="h-[8px] w-[8px] rounded-pill bg-hero-negative-mark" />{t.short(formatWhole(cov.short))}</span>
            : <span>{t.left(formatWhole(cov.left))}</span>}
          <span className="hidden flex-1 sm:block" />
          {/* On phones the list is one tap away in "See what's due". */}
          <span className="hidden sm:inline">{due.length ? dueList : t.nothingDue}</span>
        </div>
      </div>

      {/* Paid in · Spent · Pay advance (never income, never celebrated) */}
      <ul className={cx("grid gap-t3", advance ? "grid-cols-3" : "grid-cols-2")}>
        <li><Stat icon={<ArrowDown size={16} strokeWidth={2} />} label={t.paidIn} value={formatWhole(pc.paidIn)} /></li>
        <li><Stat icon={<ArrowUp size={16} strokeWidth={2} />} label={t.spent} value={formatWhole(pc.spent)} /></li>
        {advance && (
          <li>
            <button type="button" onClick={onAdvance} className="w-full rounded-md text-left">
              <Stat icon={<CreditCard size={16} strokeWidth={2} />} label={t.advance} value={formatWhole(advanceTotal)}
                extra={advance.repayAmount !== null && advance.repayDate ? t.advanceBack(formatWhole(advance.repayAmount), formatDayMonth(advance.repayDate)) : null} />
            </button>
          </li>
        )}
      </ul>

      <div className="flex flex-col items-stretch gap-t2 sm:flex-row sm:gap-t3">
        <button type="button" onClick={onDue} className="pressable flex h-[48px] items-center justify-center rounded-pill bg-hero-on px-t5 text-[0.9375rem] font-bold text-hero-from sm:flex-1">{t.seeWhatsDue}</button>
        <Link href="/hardship" className="flex min-h-[48px] items-center justify-center rounded-pill px-t5 text-[0.9375rem] font-semibold text-hero-on underline underline-offset-2 sm:flex-1 sm:border sm:border-hero-outline sm:no-underline">{t.moneyTight}</Link>
      </div>
    </section>
  );
}

function Stat({ icon, label, value, extra }: { icon: React.ReactNode; label: string; value: string; extra?: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-t3">
      <span aria-hidden className="hidden h-[36px] w-[36px] shrink-0 items-center justify-center rounded-pill bg-hero-glass sm:flex">{icon}</span>
      <div className="min-w-0">
        <span className="block text-meta-s text-hero-on-muted">{label}</span>
        <span className="block text-[1.0625rem] font-bold leading-6">{value}{extra && <span className="block text-meta-s font-medium text-hero-on-muted sm:ml-t1 sm:inline">{extra}</span>}</span>
      </div>
    </div>
  );
}
