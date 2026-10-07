// Component 04. Brand summary (fixed gradient, both themes) + neutral body with separate controls.
// Headline: available balance − bills due before payday. Short state uses caution (blue-grey), never red.
import { ArrowDownToLine, ChevronRight } from "lucide-react";
import { dashboard } from "@/content/dashboard";
import { payCycleHero as t } from "@/content/components";
import { copy } from "@/content/en-AU";
import { formatDayMonth, formatShortDay, formatWhole } from "@/lib/format";
import type { PayCycleSummary } from "@/lib/selectors/payCycle";
import { coverage } from "@/lib/ui/geometry";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";

export interface PayCycleHeroProps {
  summary: PayCycleSummary;
  onForecast?: () => void;
  onSpent?: () => void;
  onPaidIn?: () => void;
  onAdvance?: () => void;
  onDue?: () => void;
  onHardship?: () => void;
}

export function PayCycleHero({ summary: s, onForecast, onSpent, onPaidIn, onAdvance, onDue, onHardship }: PayCycleHeroProps) {
  const cov = coverage(Math.round(s.balance * 100), Math.round(s.dueTotal * 100));
  const headline = s.isShort ? copy.payCycle.short(formatWhole(-s.leftAfterBills)) : t.leftHeadline(formatWhole(s.leftAfterBills));
  const advance = s.payAdvances[0];
  return (
    <section aria-label={t.label} className="overflow-hidden rounded-card-s bg-surface shadow-card sm:rounded-card">
      <div className="brand-surface on-brand p-t5">
        <p className="text-small">{t.label}</p>
        <p className="mt-t3 text-h1 font-display">{headline}</p>
        <p className="mt-t5 text-small">{copy.payCycle.range(formatDayMonth(s.cycle.start), formatDayMonth(s.cycle.end))}</p>
        <p className="mt-t2 text-caption">{copy.payCycle.daysToPayday(s.daysToPayday, formatShortDay(s.nextPayday))}</p>
      </div>
      <div className="p-t5 pt-t4">
        <button
          type="button"
          onClick={onForecast}
          className={cx(
            "block min-h-[80px] w-full rounded-sm p-t3 text-left",
            s.isShort ? "bg-caution-soft text-caution active:shadow-[inset_0_0_0_2px_var(--color-caution)]" : "bg-surface2 text-text active:shadow-[inset_0_0_0_2px_var(--color-neutral)]",
          )}
        >
          <span className="sr-only">{t.forecastButton}. </span>
          <span className="tnum block text-small">{t.forecast(formatWhole(s.balance), formatWhole(s.dueTotal))}</span>
          <span aria-hidden className="mt-t1 flex h-t2 w-full overflow-hidden rounded-pill" style={{ background: "var(--chart-ring-track)" }}>
            <span className="h-full bg-accent" style={{ width: `${cov.covered * 100}%` }} />
            {cov.remainder > 0 && (
              <span
                className="h-full"
                style={{
                  width: `${cov.remainder * 100}%`,
                  background: s.isShort
                    ? "repeating-linear-gradient(135deg, var(--chart-hatch) 0 1px, var(--color-caution-soft) 1px 6px)"
                    : "var(--chart-ring-track)",
                }}
              />
            )}
          </span>
          <span className={cx("mt-t2 flex justify-between text-caption", s.isShort ? "text-caution" : "text-text-muted")}>
            <span>{s.isShort ? t.covered : t.billsCovered}</span>
            <span>{s.isShort ? t.short : t.left}</span>
          </span>
        </button>

        <div className="mt-t3 grid grid-cols-2 gap-t3">
          <button type="button" onClick={onSpent} className="min-h-tap rounded-sm px-t1 text-left text-body-strong text-text hover:bg-surface2">
            <span className="tnum">{copy.payCycle.spent(formatWhole(s.spent))}</span>
          </button>
          <button type="button" onClick={onPaidIn} className="min-h-tap rounded-sm px-t1 text-left text-body-strong text-text hover:bg-surface2">
            <span className="tnum">{copy.payCycle.paidIn(formatWhole(s.paidIn))}</span>
          </button>
        </div>

        {/* More than one income source (wages + Centrelink): equal rows, same icon, type and colour. */}
        {s.incomeLines.length > 1 && (
          <>
            <ul className="mt-t2 border-t border-divider">
              {s.incomeLines.map((l) => (
                <li key={`${l.payer}-${l.date}`} className="flex min-h-tap items-center gap-t3 text-small text-text">
                  <ArrowDownToLine aria-hidden size={20} className="shrink-0 text-neutral" />
                  <span className="tnum">{dashboard.incomeRow(l.payer, formatWhole(l.amount), formatShortDay(l.date))}</span>
                </li>
              ))}
            </ul>
            {s.expectedIncome.length > 0 && (
              <>
                <h3 className="mt-t3 text-h3 text-text">{dashboard.comingIn}</h3>
                <ul>
                  {dedupeNext(s.expectedIncome).map((i) => (
                    <li key={`${i.payer}-${i.date}`} className="flex min-h-tap items-center gap-t3 text-small text-text">
                      <ArrowDownToLine aria-hidden size={20} className="shrink-0 text-neutral" />
                      <span className="tnum">{(i.exact ? dashboard.incomeRow : dashboard.incomeRowAbout)(i.payer, formatWhole(i.amount), formatShortDay(i.date))}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        {advance && advance.repayAmount !== null && advance.repayDate && (
          <>
            <hr aria-hidden className="my-t3 border-divider" />
            <button type="button" onClick={onAdvance} className="flex min-h-[64px] w-full items-center gap-t3 rounded-sm px-t1 text-left hover:bg-surface2">
              <span className="flex-1">
                <span className="block text-small text-text">{copy.payCycle.advanceLine(formatWhole(advance.amount))}</span>
                <span className="tnum block text-caption text-text-muted">
                  {copy.payCycle.advanceRepay(formatWhole(advance.repayAmount), formatDayMonth(advance.repayDate), formatWhole(advance.amount), formatWhole(advance.fee ?? 0))}
                </span>
              </span>
              <ChevronRight aria-hidden size={20} className="text-text-muted" />
            </button>
          </>
        )}

        <Button full className="mt-t3" onClick={onDue}>{t.seeWhatsDue}</Button>
        <button type="button" onClick={onHardship} className="mt-t2 min-h-tap w-full rounded-sm text-small text-accent hover:bg-surface2">{t.moneyTight}</button>
      </div>
    </section>
  );
}

/** The next date for each income source. */
function dedupeNext<T extends { payer: string; date: string }>(xs: T[]): T[] {
  const seen = new Set<string>();
  return xs.filter((x) => (seen.has(x.payer) ? false : (seen.add(x.payer), true)));
}
