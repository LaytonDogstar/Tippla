// Calendar balance (08/10/2026): a slim supporting chart under the headline. End-of-day balance as a line,
// confirmed solid and forecast dashed; a labelled lowest point with a reference line; paydays marked. The y-axis
// has a rounded top and a bottom label; it only reaches down to $0 when the balance gets near it, so a real drop
// isn't flattened. Bills aren't drawn here: the timeline below lists them. The legend lists only what's shown.
import { calendarPage as t } from "@/content/spending";
import { formatShortDay, formatWhole } from "@/lib/format";
import type { CalendarDay } from "@/lib/selectors/calendar";

const W = 640, H = 120, PAD_T = 22, PAD_B = 10, PAD_L = 8, PAD_R = 8;

/** Round outwards to a tidy step (100, 200, 500, 1,000 …) for the axis labels. */
function niceStep(span: number) {
  const raw = Math.max(1, span) / 3;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw)!;
}

export function BalanceChart({ days, lowest }: { days: CalendarDay[]; lowest: string | null }) {
  const pts = days.map((d, i) => ({ d, i })).filter((p) => p.d.balance !== null);
  if (pts.length < 2) return null;
  const vals = pts.map((p) => p.d.balance!);
  const min = Math.min(...vals), max = Math.max(...vals);
  // Down to $0 only when the balance comes near it (or below); otherwise start just under the lowest point.
  const nearZero = min < 0 || min < max * 0.25;
  const step = niceStep(max - (nearZero ? Math.min(0, min) : min));
  // Below $0, the axis only reaches a little under the lowest point (labelled $0 at the zero line).
  const y0 = nearZero ? (min < 0 ? min - step * 0.2 : 0) : Math.floor(min / step) * step;
  const y1 = Math.max(Math.ceil(max / step) * step, y0 + step);
  const x = (i: number) => PAD_L + (i * (W - PAD_L - PAD_R)) / Math.max(1, days.length - 1);
  const y = (v: number) => PAD_T + ((y1 - v) / (y1 - y0)) * (H - PAD_T - PAD_B);
  const line = (list: typeof pts) => list.map((p) => `${x(p.i).toFixed(1)},${y(p.d.balance!).toFixed(1)}`).join(" ");
  const confirmed = pts.filter((p) => !p.d.balancePredicted);
  const forecast = pts.filter((p) => p.d.balancePredicted);
  const lastConfirmed = confirmed.at(-1);
  const forecastLine = lastConfirmed && forecast.length ? [lastConfirmed, ...forecast] : forecast;
  const low = pts.find((p) => p.d.date === lowest) ?? null;
  const paydays = pts.filter((p) => p.d.isPayday);
  const today = days.findIndex((d) => d.isToday);
  const firstBelow = pts.find((p) => p.d.belowZero);
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const showZero = y0 <= 0 && y1 >= 0;
  const summary = t.chart.summary(formatShortDay(pts[0]!.d.date), formatShortDay(pts.at(-1)!.d.date), formatWhole(min),
    formatShortDay((low ?? pts.find((p) => p.d.balance === min)!).d.date), firstBelow ? formatShortDay(firstBelow.d.date) : null);
  // Keep labels inside the chart: anchor to the right near the right edge.
  const anchor = (i: number) => (x(i) / W > 0.7 ? "-translate-x-full" : x(i) / W < 0.3 ? "" : "-translate-x-1/2");

  return (
    <section aria-labelledby="bal-h" className="rounded-card-s bg-surface p-t4 shadow-card sm:rounded-card sm:p-t5">
      <h3 id="bal-h" className="text-body14 font-bold text-text">{t.chart.heading}</h3>
      <div className="mt-t2 flex">
      {/* y-axis labels in a gutter of their own, so they never sit on the line. */}
      <div aria-hidden className="relative h-[120px] w-[52px] shrink-0">
        <span className="tnum absolute right-t1 -translate-y-1/2 whitespace-nowrap text-meta text-text-muted" style={{ top: pct(y(y1), H) }}>{formatWhole(y1)}</span>
        {y0 >= 0 && <span className="tnum absolute right-t1 -translate-y-1/2 whitespace-nowrap text-meta text-text-muted" style={{ top: pct(y(y0), H) }}>{formatWhole(y0)}</span>}
        {y0 < 0 && <span className="tnum absolute right-t1 -translate-y-1/2 whitespace-nowrap text-meta text-text-muted" style={{ top: pct(y(0), H) }}>$0</span>}
      </div>
      <div className="relative min-w-0 flex-1">
        <svg role="img" aria-label={summary} viewBox={`0 0 ${W} ${H}`} className="block h-[120px] w-full" preserveAspectRatio="none">
          <line x1={PAD_L} x2={W - PAD_R} y1={y(y1)} y2={y(y1)} stroke="var(--chart-gridline)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          {y0 < 0 && <rect x={PAD_L} y={y(0)} width={W - PAD_L - PAD_R} height={y(y0) - y(0)} fill="var(--color-negative-soft)" />}
          <line x1={PAD_L} x2={W - PAD_R} y1={y(y0)} y2={y(y0)} stroke="var(--chart-gridline)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          {showZero && y0 < 0 && <line x1={PAD_L} x2={W - PAD_R} y1={y(0)} y2={y(0)} stroke="var(--color-icon-muted)" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
          {low && <line x1={PAD_L} x2={W - PAD_R} y1={y(low.d.balance!)} y2={y(low.d.balance!)} stroke="var(--chart-predicted)" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
          {today >= 0 && <line x1={x(today)} x2={x(today)} y1={PAD_T - 6} y2={H - PAD_B} stroke="var(--color-icon-muted)" strokeWidth={1} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />}
          {confirmed.length > 1 && <polyline points={line(confirmed)} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
          {forecastLine.length > 1 && <polyline points={line(forecastLine)} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeDasharray="6 5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        </svg>
        {/* Axis labels and markers in HTML so they stay round and readable at any width or text size. */}
        {paydays.map((p) => (
          <span key={p.d.date} aria-hidden className="absolute h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-surface bg-positive" style={{ left: pct(x(p.i), W), top: pct(y(p.d.balance!), H) }} />
        ))}
        {low && (
          <>
            <span aria-hidden className="absolute h-[12px] w-[12px] -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-surface" style={{ left: pct(x(low.i), W), top: pct(y(low.d.balance!), H), background: low.d.belowZero ? "var(--color-negative)" : "var(--color-text)" }} />
            <span aria-hidden className={`tnum absolute whitespace-nowrap rounded-pill px-t2 text-meta font-semibold ${low.d.belowZero ? "bg-negative-soft text-negative" : "bg-surface2 text-text"} ${anchor(low.i)}`}
              style={{ left: pct(x(low.i), W), top: `calc(${pct(y(low.d.balance!), H)} ${y(low.d.balance!) > H / 2 ? "- 30px" : "+ 8px"})` }}>
              {t.chart.lowest(formatWhole(low.d.balance!), formatShortDay(low.d.date))}
            </span>
          </>
        )}
      </div>
      </div>
      <div aria-hidden className="tnum mt-t1 flex justify-between pl-[52px] text-meta text-text-muted">
        <span>{formatShortDay(days[0]!.date)}</span><span>{formatShortDay(days.at(-1)!.date)}</span>
      </div>
      <ul className="mt-t2 flex flex-wrap gap-x-t4 gap-y-t1 text-meta text-text-secondary">
        {confirmed.length > 1 && <li className="inline-flex items-center gap-t2"><span aria-hidden className="h-[3px] w-[18px] rounded-pill bg-accent" />{t.chart.confirmed}</li>}
        {forecast.length > 0 && <li className="inline-flex items-center gap-t2"><span aria-hidden className="h-0 w-[18px] border-t-[3px] border-dashed border-accent" />{t.chart.forecast}</li>}
        {low && <li className="inline-flex items-center gap-t2"><span aria-hidden className="h-0 w-[18px] border-t border-dashed" style={{ borderColor: "var(--chart-predicted)" }} />{t.chart.lowestLegend}</li>}
        {paydays.length > 0 && <li className="inline-flex items-center gap-t2"><span aria-hidden className="h-[10px] w-[10px] rounded-pill bg-positive" />{t.chart.payLegend}</li>}
        {firstBelow && <li className="inline-flex items-center gap-t2"><span aria-hidden className="h-[12px] w-[18px] rounded-[3px] bg-negative-soft" />{t.chart.belowLegend}</li>}
      </ul>
    </section>
  );
}
