// The spending summary (Spending v5 and Today, 09/10/2026): one component and one selector (spendingView), so both
// pages always show the same numbers. "$1,832 spent by day 9 of 14", the everyday comparison with the same day of
// the last cycle (rent and repayments landing on other days don't swing it), and the usual full cycle. The large
// version (Spending) adds pending and the Paid in / Pay advance / Pending stats.
import { formatWhole } from "@/lib/format";
import type { SpendingView } from "@/lib/selectors/spendingCycle";
import { spending } from "@/content/spending";
import { cx } from "@/components/ui/cx";

const t = spending.v5.summary;

export function SpendSummary({ v, size = "compact" }: { v: SpendingView; size?: "compact" | "large" }) {
  const large = size === "large";
  const cycle = v.kind === "cycle";
  const ch = v.everyday.change;
  const n = ch === null ? null : Math.round(ch);
  const comparison = n === null ? null : n === 0 ? t.same
    : n > 0 ? (cycle ? t.more : t.morePeriod)(formatWhole(n)) : (cycle ? t.less : t.lessPeriod)(formatWhole(-n));
  return (
    <div>
      <p className="tnum flex flex-wrap items-baseline gap-x-t2">
        <span className={cx("font-extrabold tracking-[-0.03em] text-text", large ? "text-[2.25rem] leading-[2.5rem] sm:text-[2.5rem]" : "text-section-num desktop:text-section-num-l")}>{formatWhole(v.total)}</span>
        <span className="text-body14 font-semibold text-text-muted">{cycle ? t.spentByDay(v.day, v.of) : t.spentPeriod}</span>
      </p>
      {comparison && (
        <p className="tnum mt-t1 text-body14 font-bold text-text">
          {n !== 0 && <span aria-hidden>{n! > 0 ? "↑ " : "↓ "}</span>}{comparison}
        </p>
      )}
      {(v.usual || (large && v.pending > 0)) && (
        <p className="tnum mt-t1 text-meta text-text-muted">
          {v.usual && t.usual(formatWhole(v.usual.amount), v.usual.cycles)}
          {v.usual && large && v.pending > 0 && " · "}
          {large && v.pending > 0 && t.plusPending(formatWhole(v.pending))}
        </p>
      )}
      {large && (
        <dl className="tnum mt-t4 grid grid-cols-2 gap-t2 sm:grid-cols-3">
          <Stat label={t.paidIn} value={formatWhole(v.paidIn)} />
          <Stat label={t.payAdvance} value={formatWhole(v.payAdvances)} note={v.payAdvances > 0 ? t.payAdvanceNote : undefined} />
          <Stat label={t.pending} value={formatWhole(v.pending)} className="col-span-2 sm:col-span-1" />
        </dl>
      )}
    </div>
  );
}

function Stat({ label, value, note, className }: { label: string; value: string; note?: string; className?: string }) {
  return (
    <div className={cx("rounded-inset bg-surface2 px-t3 py-t2", className)}>
      <dt className="text-meta-s font-semibold text-text-muted">{label}{note && <span className="font-normal"> ({note})</span>}</dt>
      <dd className="text-[1rem] font-extrabold text-text">{value}</dd>
    </div>
  );
}
