"use client";
// Calendar fortnight: the end-of-day balance as a line (UX round 2, 5.1). Confirmed days solid, forecast days
// dashed; the part below $0 sits on the soft negative tint (never a saturated fill, rule 6) with a label; bill and
// payday markers on the line, each a button that says what's due. The day grid below stays the way to pick a day,
// and the list view is the text alternative. Every number here comes from the calendar selector.
import { useState } from "react";
import { ArrowDown, ReceiptText, TriangleAlert } from "lucide-react";
import { calendarPage as t } from "@/content/spending";
import { formatShortDay, formatWhole } from "@/lib/format";
import type { CalendarDay } from "@/lib/selectors/calendar";
import { cx } from "@/components/ui/cx";

const W = 640, H = 180, PAD_T = 16, PAD_B = 22, PAD_X = 12;

export function BalanceChart({ days }: { days: CalendarDay[] }) {
  const [tip, setTip] = useState<string | null>(null);
  const pts = days.map((d, i) => ({ d, i })).filter((p) => p.d.balance !== null);
  if (pts.length < 2) return null;
  const vals = pts.map((p) => p.d.balance!);
  const lo = Math.min(0, ...vals), hi = Math.max(...vals, 1);
  const span = hi - lo || 1;
  const pad = span * 0.08;
  const y0 = lo - pad, y1 = hi + pad;
  const x = (i: number) => PAD_X + (i * (W - 2 * PAD_X)) / Math.max(1, days.length - 1);
  const y = (v: number) => PAD_T + ((y1 - v) / (y1 - y0)) * (H - PAD_T - PAD_B);
  const zero = y(0);
  const line = (list: typeof pts) => list.map((p) => `${x(p.i).toFixed(1)},${y(p.d.balance!).toFixed(1)}`).join(" ");
  const lastConfirmed = pts.filter((p) => !p.d.balancePredicted).at(-1);
  const confirmed = pts.filter((p) => !p.d.balancePredicted);
  const forecast = pts.filter((p) => p.d.balancePredicted);
  // The dashed forecast starts from the last confirmed point so the line is continuous.
  const forecastLine = lastConfirmed ? [lastConfirmed, ...forecast] : forecast;
  const area = `M${x(pts[0]!.i)},${zero} L${line(pts).replace(/ /g, " L")} L${x(pts.at(-1)!.i)},${zero} Z`;
  const firstBelow = pts.find((p) => p.d.belowZero);
  const today = days.findIndex((d) => d.isToday);
  const markers = days.flatMap((d, i) => [
    ...(d.isPayday || d.predictedIncome.length ? [{ key: `pay-${d.date}`, i, d, kind: "pay" as const, label: t.chart.payday(formatShortDay(d.date), d.predictedIncome.map((p) => formatWhole(p.amount)).join(" + ")) }] : []),
    ...(d.predictedBills.length ? [{ key: `bill-${d.date}`, i, d, kind: "bill" as const, label: t.chart.bills(formatShortDay(d.date), d.predictedBills.map((b) => `${b.merchant} ${formatWhole(b.expected_amount)}`).join(", ")) }] : []),
  ]).filter((m) => m.d.balance !== null);
  const summary = t.chart.summary(formatWhole(vals[0]!), formatWhole(vals.at(-1)!), firstBelow ? formatShortDay(firstBelow.d.date) : null, formatWhole(Math.min(...vals)));

  return (
    <section aria-labelledby="bal-h" className="mt-t3 rounded-card-s bg-surface p-t4 shadow-card sm:rounded-card sm:p-t5">
      <div className="flex flex-wrap items-center justify-between gap-t2">
        <h3 id="bal-h" className="text-row text-text">{t.chart.heading}</h3>
        {firstBelow && (
          <span className="tnum inline-flex items-center gap-t1 rounded-pill bg-negative-soft px-t3 py-[3px] text-meta font-bold text-negative">
            <TriangleAlert aria-hidden size={14} strokeWidth={2} />{t.chart.below(formatShortDay(firstBelow.d.date), formatWhole(firstBelow.d.balance!))}
          </span>
        )}
      </div>
      <div className="relative mt-t3">
        <svg role="img" aria-label={summary} viewBox={`0 0 ${W} ${H}`} className="block h-[180px] w-full" preserveAspectRatio="none">
          <defs>
            <clipPath id="bal-above"><rect x="0" y="0" width={W} height={zero} /></clipPath>
            <clipPath id="bal-below"><rect x="0" y={zero} width={W} height={H - zero} /></clipPath>
          </defs>
          {/* Below $0: the soft negative band across the chart, then the area under the line in it. */}
          {lo < 0 && <rect x="0" y={zero} width={W} height={y(y0) - zero} fill="var(--color-negative-soft)" />}
          <path d={area} fill="var(--color-accent-soft)" clipPath="url(#bal-above)" />
          <path d={area} fill="var(--color-negative-soft)" stroke="none" clipPath="url(#bal-below)" />
          <line x1="0" x2={W} y1={zero} y2={zero} stroke="var(--color-icon-muted)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          {today >= 0 && <line x1={x(today)} x2={x(today)} y1={PAD_T - 8} y2={H - PAD_B} stroke="var(--color-icon-muted)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
          {confirmed.length > 1 && <polyline points={line(confirmed)} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
          {forecastLine.length > 1 && <polyline points={line(forecastLine)} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeDasharray="6 5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        </svg>
        {/* Labels and markers in HTML, so they stay round and readable at any width or text size. */}
        <span aria-hidden className="tnum absolute left-0 text-meta text-text-muted" style={{ top: `calc(${(zero / H) * 100}% - 18px)` }}>$0</span>
        {today >= 0 && <span aria-hidden className="absolute -translate-x-1/2 text-meta font-semibold text-text-muted" style={{ left: `${(x(today) / W) * 100}%`, top: -6 }}>{t.chart.today}</span>}
        {firstBelow && (
          <span aria-hidden className="absolute h-[12px] w-[12px] -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-surface bg-negative" style={{ left: `${(x(firstBelow.i) / W) * 100}%`, top: `${(y(firstBelow.d.balance!) / H) * 100}%` }} />
        )}
        {markers.map((m) => {
          const top = (y(m.d.balance!) / H) * 100;
          const Icon = m.kind === "pay" ? ArrowDown : ReceiptText;
          return (
            <span key={m.key} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${(x(m.i) / W) * 100}%`, top: `${top}%` }}>
              <button type="button" aria-label={m.label} aria-expanded={tip === m.key}
                onClick={() => { setTip(tip === m.key ? null : m.key); }}
                onMouseEnter={() => setTip(m.key)} onMouseLeave={() => setTip((v) => (v === m.key ? null : v))}
                className="flex h-tap w-tap items-center justify-center rounded-pill">
                <span aria-hidden className={cx("flex h-[22px] w-[22px] items-center justify-center rounded-pill border-2 border-surface shadow-card",
                  m.kind === "pay" ? "bg-positive-soft text-positive" : "bg-surface text-text-secondary")}>
                  <Icon size={12} strokeWidth={2.4} />
                </span>
              </button>
              {tip === m.key && (
                <span role="status" className="absolute bottom-full left-1/2 z-10 mb-t1 w-max max-w-[220px] -translate-x-1/2 rounded-md bg-text px-t3 py-t2 text-meta font-semibold text-surface shadow-card">{m.label}</span>
              )}
            </span>
          );
        })}
      </div>
      <div aria-hidden className="tnum mt-t1 flex justify-between text-meta text-text-muted">
        <span>{formatShortDay(days[0]!.date)}</span><span>{formatShortDay(days.at(-1)!.date)}</span>
      </div>
      <ul className="mt-t3 flex flex-wrap gap-x-t5 gap-y-t2 text-meta text-text-secondary">
        <li className="inline-flex items-center gap-t2"><span aria-hidden className="h-[3px] w-[18px] rounded-pill bg-accent" />{t.chart.confirmed}</li>
        <li className="inline-flex items-center gap-t2"><span aria-hidden className="h-0 w-[18px] border-t-[3px] border-dashed border-accent" />{t.chart.forecast}</li>
        <li className="inline-flex items-center gap-t2"><span aria-hidden className="h-[12px] w-[18px] rounded-[3px] bg-negative-soft" />{t.chart.belowLegend}</li>
        <li className="inline-flex items-center gap-t2"><ReceiptText aria-hidden size={14} />{t.chart.billLegend}</li>
        <li className="inline-flex items-center gap-t2"><ArrowDown aria-hidden size={14} />{t.chart.payLegend}</li>
      </ul>
    </section>
  );
}
