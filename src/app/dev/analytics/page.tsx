// Dev-only analytics dashboards (spec 09): 1. north-star and supporting metrics, 2. signup cohort retention,
// 3. feed performance by rule, plus the guardrail panel. Demo data is generated on first visit (synthetic
// members, flagged `seeded`); real events from using the app are counted alongside it.
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";
import { EXPERIMENTS, FLAG_NAMES, FLAGS } from "@/config/featureFlags";
import { EVENTS } from "@/lib/analytics/registry";
import { cohortRetention, feedPerformance, guardrails, MIN_CYCLES, northStar, onboardingMetrics, reseed, seededCount } from "@/lib/analytics/metrics";
import { db } from "@/lib/db";
import { ThemeToggle } from "@/components/dev/ThemeToggle";

export const dynamic = "force-dynamic";

async function regenerate() {
  "use server";
  await reseed();
  revalidatePath("/dev/analytics");
}

const fmtPct = (v: number | null) => (v === null ? "—" : `${v.toFixed(1)}%`);
const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default async function AnalyticsPage() {
  if ((await seededCount()) === 0) await reseed();
  const now = new Date();
  const [ns, cohorts, feed, guard, onb, database] = await Promise.all([northStar(now), cohortRetention(now), feedPerformance(now), guardrails(now), onboardingMetrics(now), db()]);
  const real = Number((await database.query<{ n: string }>("SELECT count(*) AS n FROM analytics_events WHERE NOT seeded")).rows[0]?.n ?? 0);

  return (
    <main id="main" className="min-h-[100dvh] bg-bg px-gutter py-t6 text-text">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-t6">
        <header className="flex flex-wrap items-start justify-between gap-t3">
          <div>
            <h1 className="text-h1 font-display">Analytics</h1>
            <p className="mt-t1 text-small text-text-muted">
              Demo data: synthetic members, regenerated on request. {real} real event{real === 1 ? "" : "s"} from using the app are included. Database: {database.kind === "postgres" ? "Postgres" : "PGlite (local)"}.
            </p>
          </div>
          <div className="flex items-center gap-t2">
            <form action={regenerate}><button type="submit" className="min-h-tap rounded-sm bg-surface px-t4 text-small text-accent hover:bg-surface2">Regenerate demo data</button></form>
            <ThemeToggle />
          </div>
        </header>

        {/* 1. North star */}
        <section aria-labelledby="ns-h" className="rounded-lg bg-surface p-t5">
          <h2 id="ns-h" className="text-h2 font-display">North star</h2>
          <p className="mt-t1 text-small text-text-muted">Pay cycles completed without a new pay advance or short-term loan, rolling 4 cycles.</p>
          <div className="mt-t4 flex flex-wrap items-end gap-t6">
            <div>
              <p className="tnum text-figure-l font-numeric">{fmtPct(ns.latest)}</p>
              <p className="text-small text-text-muted">{ns.change === null ? "" : `${ns.change >= 0 ? "Up" : "Down"} ${Math.abs(ns.change).toFixed(1)} points on 4 weeks ago`}</p>
            </div>
            <TrendLine points={ns.weekly} />
          </div>
          <dl className="mt-t5 grid grid-cols-2 gap-t3 tablet:grid-cols-3 desktop:grid-cols-6">
            {([
              ["Weekly active", String(ns.wau)],
              ["Monthly active", String(ns.mau)],
              ["Weekly ÷ monthly", fmtPct(ns.stickiness)],
              ["Opened on payday (14 days)", fmtPct(ns.paydayOpenRate)],
              ["Feed cards acted on (30 days)", fmtPct(ns.feedActionRate)],
              ["Days with a session per cycle", ns.daysPerCycle === null ? "—" : ns.daysPerCycle.toFixed(1)],
            ] as const).map(([k, v]) => (
              <div key={k} className="rounded-md bg-surface2 p-t3">
                <dt className="text-caption text-text-muted">{k}</dt>
                <dd className="tnum text-h3">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-t3 text-caption text-text-muted">Cycles ending at or above $0 (56 days): {fmtPct(ns.positiveCycles)}. Weeks with fewer than {MIN_CYCLES} completed cycles are left blank.</p>
        </section>

        {/* Guardrails */}
        <section aria-labelledby="g-h" className="rounded-lg bg-surface p-t5">
          <h2 id="g-h" className="text-h2 font-display">Guardrails (30 days)</h2>
          <ul className="mt-t3 grid gap-t3 tablet:grid-cols-2">
            <Guard ok={guard.offersToVulnerable === 0} label="Offers shown to members short before payday, in hardship or in Building"
              value={`${guard.offersToVulnerable} of ${guard.offersShown} offer views`} must="Must be 0" />
            <Guard ok label="Notification setting changes" value={String(guard.notificationOptOuts)} must="Watch for a rise after a notification change" />
            <Guard ok label="Hardship letters started" value={String(guard.hardshipLettersStarted)} must="Watch for a rise after a notification change" />
          </ul>
        </section>

        {/* 2. Cohorts */}
        <section aria-labelledby="c-h" className="rounded-lg bg-surface p-t5">
          <h2 id="c-h" className="text-h2 font-display">Retention by signup week</h2>
          <p className="mt-t1 text-small text-text-muted">Share of each week&apos;s new members who opened Tippla in each later week. Only completed weeks are shown.</p>
          <div className="mt-t4 overflow-x-auto" tabIndex={0} role="region" aria-label="Retention table (scrolls sideways)">
            <table className="tnum w-full border-separate border-spacing-[2px] text-caption">
              <caption className="sr-only">Retention by signup week, % active in each week since signup</caption>
              <thead><tr><th scope="col" className="p-t1 text-left font-normal text-text-muted">Signup week</th><th scope="col" className="p-t1 text-right font-normal text-text-muted">Members</th>
                {Array.from({ length: 12 }, (_, k) => <th key={k} scope="col" className="p-t1 text-right font-normal text-text-muted">Wk {k}</th>)}</tr></thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.cohort}>
                    <th scope="row" className="whitespace-nowrap p-t1 text-left font-normal">{shortDate(c.cohort)}</th>
                    <td className="p-t1 text-right">{c.size}</td>
                    {Array.from({ length: 12 }, (_, k) => {
                      const v = c.retained[k];
                      return v === undefined || v === null ? <td key={k} /> : (
                        // One hue, light to dark with the value; the number is always printed (never colour alone).
                        <td key={k} className="rounded-xs p-t1 text-right" style={{ background: `color-mix(in srgb, var(--color-accent) ${Math.round(v * 0.32)}%, var(--color-surface))` }}>{Math.round(v)}%</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. Feed */}
        <section aria-labelledby="f-h" className="rounded-lg bg-surface p-t5">
          <h2 id="f-h" className="text-h2 font-display">Feed performance by rule (30 days)</h2>
          <div className="mt-t4 overflow-x-auto" tabIndex={0} role="region" aria-label="Feed performance table (scrolls sideways)">
            <table className="tnum w-full text-small">
              <caption className="sr-only">Cards shown, acted on, done, dismissed and snoozed, by rule</caption>
              <thead className="text-caption text-text-muted"><tr>
                {["Rule", "Shown", "Acted on", "Done", "Dismissed", "Snoozed", "Action rate"].map((h, i) => <th key={h} scope="col" className={`p-t2 font-normal ${i ? "text-right" : "text-left"}`}>{h}</th>)}
              </tr></thead>
              <tbody>
                {feed.map((r) => (
                  <tr key={r.rule} className="border-t border-line">
                    <th scope="row" className="p-t2 text-left font-normal">{r.rule.replace(/_/g, " ")}</th>
                    {[r.shown, r.actioned, r.done, r.dismissed, r.snoozed].map((v, i) => <td key={i} className="p-t2 text-right">{v.toLocaleString("en-AU")}</td>)}
                    <td className="p-t2">
                      <span className="flex items-center justify-end gap-t2">
                        <span aria-hidden className="h-[8px] w-[80px] overflow-hidden rounded-pill bg-surface2"><span className="block h-full rounded-pill bg-accent" style={{ width: `${r.actionRate ?? 0}%` }} /></span>
                        <span className="w-[48px] text-right">{fmtPct(r.actionRate)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Onboarding (spec 04) */}
        <section aria-labelledby="o-h" className="rounded-lg bg-surface p-t5">
          <h2 id="o-h" className="text-h2 font-display">First session (12 weeks)</h2>
          <dl className="mt-t4 grid grid-cols-2 gap-t3 tablet:grid-cols-4">
            {([
              ["Bank connected → first insight (median)", onb.medianSecondsToInsight === null ? "—" : `${onb.medianSecondsToInsight}s`],
              ["First insight within 60s", fmtPct(onb.under60)],
              ["Picked a goal", fmtPct(onb.goalCompletion)],
              ["Said yes to alerts", fmtPct(onb.pushOptIn)],
            ] as const).map(([k, v]) => (
              <div key={k} className="rounded-md bg-surface2 p-t3"><dt className="text-caption text-text-muted">{k}</dt><dd className="tnum text-h3">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-t2 text-caption text-text-muted">Target: under 60 seconds at the median. Goals picked: {onb.goals.map((g) => `${g.goal.replace(/_/g, " ")} ${g.members}`).join(" · ") || "none yet"}.</p>
          <div className="mt-t4 overflow-x-auto" tabIndex={0} role="region" aria-label="Retention by first insight table (scrolls sideways)">
            <table className="tnum w-full text-small">
              <caption className="sr-only">Members, share who opened the detail, and day-7 and day-30 retention, by first insight type</caption>
              <thead className="text-caption text-text-muted"><tr>
                {["First insight", "Members", "Opened the detail", "Day 7", "Day 30"].map((h, i) => <th key={h} scope="col" className={`p-t2 font-normal ${i ? "text-right" : "text-left"}`}>{h}</th>)}
              </tr></thead>
              <tbody>
                {onb.byAha.map((r) => (
                  <tr key={r.type} className="border-t border-line">
                    <th scope="row" className="p-t2 text-left font-normal">{r.type.replace(/_/g, " ")}</th>
                    <td className="p-t2 text-right">{r.members}</td>
                    {[r.actioned, r.day7, r.day30].map((v, i) => <td key={i} className="p-t2 text-right">{fmtPct(v)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-t2 text-caption text-text-muted">Use this to tune the first-insight order (experiment <code>aha_priority</code>).</p>
        </section>

        {/* Registry and flags */}
        <section aria-labelledby="r-h" className="grid gap-t4 desktop:grid-cols-2">
          <div className="rounded-lg bg-surface p-t5">
            <h2 id="r-h" className="text-h3">Feature flags</h2>
            <ul className="mt-t2 flex flex-col text-small">
              {FLAG_NAMES.map((f) => {
                const def: { spec: string; built: boolean; gate?: readonly string[]; description: string } = FLAGS[f];
                return (
                  <li key={f} className="flex flex-wrap justify-between gap-x-t3 border-t border-line py-t1">
                    <span><code>{f}</code> · spec {def.spec}</span>
                    <span className="text-text-muted">{def.built ? "built" : "not built"}{def.gate?.length ? ` · gate ${def.gate.join(", ")}` : ""}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-lg bg-surface p-t5">
            <h2 className="text-h3">Events and experiments</h2>
            <p className="mt-t2 text-small text-text-muted">{Object.keys(EVENTS).length} registered events (src/lib/analytics/registry.ts). Anything else fails in development.</p>
            <ul className="mt-t3 flex flex-col text-small">
              {EXPERIMENTS.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-x-t3 border-t border-line py-t1">
                  <span><code>{e.id}</code>: {e.variants.join(" vs ")}</span>
                  <span className="text-text-muted">{e.status} · {e.primaryMetric} · min {e.minCycles} cycles</span>
                </li>
              ))}
            </ul>
            <Link href="/" className="mt-t4 inline-flex min-h-tap items-center text-small text-accent">Back to the app</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function Guard({ ok, label, value, must }: { ok: boolean; label: string; value: string; must: string }) {
  const Icon = ok ? CircleCheck : CircleAlert;
  return (
    <li className="flex items-start gap-t3 rounded-md bg-surface2 p-t3">
      <Icon aria-hidden size={20} className={ok ? "mt-t1 shrink-0 text-accent" : "mt-t1 shrink-0 text-caution"} />
      <div>
        <p className="text-small">{label}</p>
        <p className="tnum text-h3">{value}</p>
        <p className="text-caption text-text-muted">{ok ? "OK" : "Needs attention"} · {must}</p>
      </div>
    </li>
  );
}

/** Single-series line: one hue, 2px line, ≥8px points, each point with its value as a hover title; a table view below. */
function TrendLine({ points }: { points: { weekEnd: string; value: number | null; cycles: number }[] }) {
  const W = 560, H = 140, P = 24;
  const vals = points.map((p) => p.value).filter((v): v is number => v !== null);
  const lo = Math.max(0, Math.floor((Math.min(...vals, 100) - 5) / 10) * 10), hi = Math.min(100, Math.ceil((Math.max(...vals, 0) + 5) / 10) * 10);
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, points.length - 1);
  const y = (v: number) => H - P - ((v - lo) / Math.max(1, hi - lo)) * (H - 2 * P);
  const drawn = points.map((p, i) => ({ ...p, i })).filter((p) => p.value !== null);
  return (
    <figure className="min-w-0 flex-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[560px]" role="img" aria-label={`North star by week, ${drawn.map((p) => `${shortDate(p.weekEnd)} ${p.value}%`).join(", ")}`}>
        {[lo, hi].map((v) => (
          <g key={v}>
            <line x1={P} x2={W - P} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={0} y={y(v) + 4} fontSize={10} fill="var(--color-text-muted)">{v}%</text>
          </g>
        ))}
        <polyline fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" points={drawn.map((p) => `${x(p.i)},${y(p.value!)}`).join(" ")} />
        {drawn.map((p) => (
          <circle key={p.weekEnd} cx={x(p.i)} cy={y(p.value!)} r={4} fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth={2}>
            <title>{`Week to ${shortDate(p.weekEnd)}: ${p.value}% of ${p.cycles} cycles`}</title>
          </circle>
        ))}
        {points.length > 0 && <text x={P} y={H - 4} fontSize={10} fill="var(--color-text-muted)">{shortDate(points[0]!.weekEnd)}</text>}
        {points.length > 0 && <text x={W - P} y={H - 4} fontSize={10} textAnchor="end" fill="var(--color-text-muted)">{shortDate(points.at(-1)!.weekEnd)}</text>}
      </svg>
      <details className="mt-t1 text-caption text-text-muted">
        <summary className="cursor-pointer">Show as a table</summary>
        <table className="tnum mt-t1"><tbody>{points.map((p) => <tr key={p.weekEnd}><th scope="row" className="pr-t3 text-left font-normal">{shortDate(p.weekEnd)}</th><td className="pr-t3 text-right">{fmtPct(p.value)}</td><td className="text-right">{p.cycles} cycles</td></tr>)}</tbody></table>
      </details>
    </figure>
  );
}
