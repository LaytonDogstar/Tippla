// Dashboard queries (spec 09, dashboards 1–3 plus the guardrail panel). Plain Postgres SQL, so the same
// queries run on Railway's Postgres and on PGlite. Server only.
import { db } from "@/lib/db";
import { seedEvents } from "./seed";
import { store } from "./server";

/** Fewest pay cycles in a week's window before the north-star value is shown. */
export const MIN_CYCLES = 30;
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);
const num = (v: unknown) => Number(v ?? 0);

export async function seededCount(): Promise<number> {
  const d = await db();
  return num((await d.query<{ n: string }>("SELECT count(*) AS n FROM analytics_events WHERE seeded")).rows[0]?.n);
}

/** Replace the demo analytics with a fresh deterministic set ending now. */
export async function reseed(now = new Date()): Promise<number> {
  const d = await db();
  await d.query("DELETE FROM analytics_events WHERE seeded");
  const events = seedEvents({ now });
  for (let i = 0; i < events.length; i += 500) await store(events.slice(i, i + 500), { seeded: true });
  return events.length;
}

export interface NorthStar {
  /** % of member pay cycles completed without a new pay advance, rolling 4 cycles (56 days) to each week end. */
  weekly: { weekEnd: string; value: number | null; cycles: number }[];
  latest: number | null;
  change: number | null;
  wau: number; mau: number; stickiness: number | null;
  paydayOpenRate: number | null;
  feedActionRate: number | null;
  daysPerCycle: number | null;
  positiveCycles: number | null;
}

export async function northStar(now = new Date(), weeks = 12): Promise<NorthStar> {
  const d = await db();
  const weekly = (await d.query<{ week_end: string; ok: string; total: string }>(`
    WITH weeks AS (SELECT generate_series(0, $2::int - 1) AS k),
         ends AS (SELECT ($1::timestamptz - (k * interval '7 days')) AS week_end FROM weeks)
    SELECT to_char(e.week_end AT TIME ZONE 'Australia/Sydney', 'YYYY-MM-DD') AS week_end,
           count(*) FILTER (WHERE (c.props->>'had_new_advance')::boolean = false) AS ok,
           count(c.id) AS total
    FROM ends e
    LEFT JOIN analytics_events c ON c.event = 'cycle_completed' AND c.ts > e.week_end - interval '56 days' AND c.ts <= e.week_end
    GROUP BY e.week_end ORDER BY e.week_end`, [now.toISOString(), weeks])).rows
    // Too few cycles to say anything: leave the week blank rather than plot noise.
    .map((r) => ({ weekEnd: r.week_end, value: num(r.total) >= MIN_CYCLES ? pct(num(r.ok), num(r.total)) : null, cycles: num(r.total) }));

  const one = async (sql: string) => (await d.query<Record<string, string>>(sql, [now.toISOString()])).rows[0] ?? {};
  const active = await one(`SELECT
      count(DISTINCT member_id) FILTER (WHERE ts > $1::timestamptz - interval '7 days') AS wau,
      count(DISTINCT member_id) FILTER (WHERE ts > $1::timestamptz - interval '30 days') AS mau
    FROM analytics_events WHERE event = 'session_started' AND ts <= $1::timestamptz`);
  const payday = await one(`SELECT
      count(DISTINCT member_id) FILTER (WHERE (props->>'payday')::boolean) AS payday_members,
      count(DISTINCT member_id) AS members
    FROM analytics_events WHERE event = 'session_started' AND ts > $1::timestamptz - interval '14 days' AND ts <= $1::timestamptz`);
  const feed = await one(`SELECT
      count(*) FILTER (WHERE event = 'feed_item_actioned') AS actioned,
      coalesce(sum((props->>'item_count')::int) FILTER (WHERE event = 'feed_viewed'), 0) AS shown
    FROM analytics_events WHERE event IN ('feed_viewed', 'feed_item_actioned') AND ts > $1::timestamptz - interval '30 days' AND ts <= $1::timestamptz`);
  const days = await one(`SELECT avg(n) AS days FROM (
      SELECT member_id, count(DISTINCT date_trunc('day', ts AT TIME ZONE 'Australia/Sydney')) AS n
      FROM analytics_events WHERE event = 'session_started' AND ts > $1::timestamptz - interval '14 days' AND ts <= $1::timestamptz
      GROUP BY member_id) x`);
  const positive = await one(`SELECT
      count(*) FILTER (WHERE (props->>'ended_positive')::boolean) AS ok, count(*) AS total
    FROM analytics_events WHERE event = 'cycle_completed' AND ts > $1::timestamptz - interval '56 days' AND ts <= $1::timestamptz`);

  const wau = num(active.wau), mau = num(active.mau);
  const last = weekly.at(-1)?.value ?? null, prev = weekly.at(-5)?.value ?? null;
  return {
    weekly, latest: last, change: last !== null && prev !== null ? Math.round((last - prev) * 10) / 10 : null,
    wau, mau, stickiness: pct(wau, mau),
    paydayOpenRate: pct(num(payday.payday_members), num(payday.members)),
    feedActionRate: pct(num(feed.actioned), num(feed.shown)),
    daysPerCycle: days.days === null || days.days === undefined ? null : Math.round(Number(days.days) * 10) / 10,
    positiveCycles: pct(num(positive.ok), num(positive.total)),
  };
}

export interface CohortRow { cohort: string; size: number; retained: (number | null)[] }

/** Signup-week cohorts × weeks since signup: % of the cohort with a session in that week. */
export async function cohortRetention(now = new Date(), weeks = 12): Promise<CohortRow[]> {
  const d = await db();
  const rows = (await d.query<{ cohort: string; size: string; k: number; active: string }>(`
    WITH signups AS (
      SELECT member_id, min(ts) AS signed_up FROM analytics_events WHERE event = 'member_signed_up' AND ts <= $1::timestamptz
        AND ts > $1::timestamptz - ($2::int * interval '7 days') GROUP BY member_id),
    cohorts AS (SELECT member_id, signed_up, date_trunc('week', signed_up AT TIME ZONE 'Australia/Sydney') AS cohort FROM signups),
    activity AS (
      SELECT c.cohort, c.member_id, floor(extract(epoch FROM (s.ts - c.signed_up)) / 604800)::int AS k
      FROM cohorts c JOIN analytics_events s ON s.member_id = c.member_id AND s.event = 'session_started' AND s.ts >= c.signed_up AND s.ts <= $1::timestamptz)
    SELECT to_char(c.cohort, 'YYYY-MM-DD') AS cohort, count(DISTINCT c.member_id) AS size, a.k, count(DISTINCT a.member_id) AS active
    FROM cohorts c LEFT JOIN activity a ON a.cohort = c.cohort
    GROUP BY c.cohort, a.k ORDER BY c.cohort, a.k`, [now.toISOString(), weeks])).rows;
  const by = new Map<string, CohortRow>();
  for (const r of rows) {
    const row = by.get(r.cohort) ?? { cohort: r.cohort, size: 0, retained: [] };
    row.size = Math.max(row.size, num(r.size));
    if (r.k !== null && r.k !== undefined) row.retained[r.k] = num(r.active);
    by.set(r.cohort, row);
  }
  // Only weeks every member of the cohort has completed (the last signup is up to 7 days after the cohort
  // starts, so week k is complete once cohort start + (k + 2) weeks has passed). Later weeks aren't shown.
  return [...by.values()].map((row) => {
    const age = Math.floor((now.getTime() - Date.parse(row.cohort)) / 604800e3);
    return { ...row, retained: Array.from({ length: Math.max(0, Math.min(weeks, age - 1)) }, (_, k) => pct(row.retained[k] ?? 0, row.size)) };
  });
}

export interface RulePerformance { rule: string; shown: number; actioned: number; done: number; dismissed: number; snoozed: number; actionRate: number | null }

/** Feed performance by rule (shown → actioned → done), last 30 days. */
export async function feedPerformance(now = new Date()): Promise<RulePerformance[]> {
  const d = await db();
  const rows = (await d.query<{ rule: string; shown: string; actioned: string; done: string; dismissed: string; snoozed: string }>(`
    WITH win AS (SELECT * FROM analytics_events WHERE ts > $1::timestamptz - interval '30 days' AND ts <= $1::timestamptz),
    shown AS (SELECT unnest(string_to_array(props->>'rule_ids', ',')) AS rule FROM win WHERE event = 'feed_viewed'),
    acts AS (SELECT props->>'rule_id' AS rule, event FROM win WHERE event IN ('feed_item_actioned', 'feed_item_done', 'feed_item_dismissed', 'feed_item_snoozed'))
    SELECT r.rule,
      (SELECT count(*) FROM shown s WHERE s.rule = r.rule) AS shown,
      count(*) FILTER (WHERE a.event = 'feed_item_actioned') AS actioned,
      count(*) FILTER (WHERE a.event = 'feed_item_done') AS done,
      count(*) FILTER (WHERE a.event = 'feed_item_dismissed') AS dismissed,
      count(*) FILTER (WHERE a.event = 'feed_item_snoozed') AS snoozed
    FROM (SELECT DISTINCT rule FROM shown WHERE rule <> '') r LEFT JOIN acts a ON a.rule = r.rule
    GROUP BY r.rule`, [now.toISOString()])).rows;
  return rows.map((r) => ({ rule: r.rule, shown: num(r.shown), actioned: num(r.actioned), done: num(r.done), dismissed: num(r.dismissed), snoozed: num(r.snoozed), actionRate: pct(num(r.actioned), num(r.shown)) }))
    .sort((a, b) => b.shown - a.shown);
}

export interface Guardrails {
  /** Offers shown to anyone short before payday, in hardship, or in Building. Must be 0. */
  offersToVulnerable: number;
  offersShown: number;
  notificationOptOuts: number;
  hardshipLettersStarted: number;
}

export async function guardrails(now = new Date()): Promise<Guardrails> {
  const d = await db();
  const r = (await d.query<Record<string, string>>(`SELECT
      count(*) FILTER (WHERE event = 'offer_viewed' AND ((props->>'had_shortfall')::boolean OR (props->>'in_hardship')::boolean OR props->>'band' = 'building')) AS vulnerable,
      count(*) FILTER (WHERE event = 'offer_viewed') AS offers,
      count(*) FILTER (WHERE event = 'notification_prefs_changed') AS prefs,
      count(*) FILTER (WHERE event = 'hardship_letter_started') AS letters
    FROM analytics_events WHERE ts > $1::timestamptz - interval '30 days' AND ts <= $1::timestamptz`, [now.toISOString()])).rows[0] ?? {};
  return { offersToVulnerable: num(r.vulnerable), offersShown: num(r.offers), notificationOptOuts: num(r.prefs), hardshipLettersStarted: num(r.letters) };
}

export interface OnboardingMetrics {
  /** Median seconds from bank connected to first insight viewed (target under 60). */
  medianSecondsToInsight: number | null;
  under60: number | null;
  /** % of members who saw the first insight and then picked a goal. */
  goalCompletion: number | null;
  goals: { goal: string; members: number }[];
  pushOptIn: number | null;
  /** Day-7 and day-30 retention (a session in days 7–13 / 30–36) by first-insight type, for members old enough. */
  byAha: { type: string; members: number; actioned: number | null; day7: number | null; day30: number | null }[];
}

/** Spec 04: first-session value (signups in the last 12 weeks). */
export async function onboardingMetrics(now = new Date()): Promise<OnboardingMetrics> {
  const d = await db();
  const at = now.toISOString();
  const t = (await d.query<{ secs: string | null; under: string; n: string }>(`
    WITH firsts AS (
      SELECT member_id, min(ts) FILTER (WHERE event = 'bank_connected') AS connected, min(ts) FILTER (WHERE event = 'aha_shown') AS aha
      FROM analytics_events WHERE ts <= $1::timestamptz AND ts > $1::timestamptz - interval '84 days' GROUP BY member_id),
    gaps AS (SELECT extract(epoch FROM (aha - connected)) AS s FROM firsts WHERE connected IS NOT NULL AND aha IS NOT NULL AND aha >= connected)
    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY s) AS secs, count(*) FILTER (WHERE s < 60) AS under, count(*) AS n FROM gaps`, [at])).rows[0];
  const g = (await d.query<{ aha: string; goal: string; push: string; accepted: string }>(`
    SELECT count(DISTINCT member_id) FILTER (WHERE event = 'aha_shown') AS aha,
      count(DISTINCT member_id) FILTER (WHERE event = 'goal_selected') AS goal,
      count(DISTINCT member_id) FILTER (WHERE event = 'push_opt_in') AS push,
      count(DISTINCT member_id) FILTER (WHERE event = 'push_opt_in' AND (props->>'accepted')::boolean) AS accepted
    FROM analytics_events WHERE ts <= $1::timestamptz AND ts > $1::timestamptz - interval '84 days'`, [at])).rows[0];
  const goals = (await d.query<{ goal: string; n: string }>(`
    SELECT props->>'goal_type' AS goal, count(DISTINCT member_id) AS n FROM analytics_events
    WHERE event = 'goal_selected' AND ts <= $1::timestamptz AND ts > $1::timestamptz - interval '84 days' GROUP BY 1 ORDER BY 2 DESC, 1`, [at])).rows;
  const r = (await d.query<{ type: string; n: string; actioned: string; e7: string; r7: string; e30: string; r30: string }>(`
    WITH aha AS (
      SELECT DISTINCT ON (member_id) member_id, props->>'type' AS type, ts FROM analytics_events
      WHERE event = 'aha_shown' AND ts <= $1::timestamptz AND ts > $1::timestamptz - interval '84 days' ORDER BY member_id, ts),
    m AS (
      SELECT a.member_id, a.type, a.ts,
        EXISTS (SELECT 1 FROM analytics_events x WHERE x.member_id = a.member_id AND x.event = 'aha_actioned') AS actioned,
        EXISTS (SELECT 1 FROM analytics_events s WHERE s.member_id = a.member_id AND s.event = 'session_started' AND s.ts >= a.ts + interval '7 days' AND s.ts < a.ts + interval '14 days') AS r7,
        EXISTS (SELECT 1 FROM analytics_events s WHERE s.member_id = a.member_id AND s.event = 'session_started' AND s.ts >= a.ts + interval '30 days' AND s.ts < a.ts + interval '37 days') AS r30
      FROM aha a)
    SELECT type, count(*) AS n, count(*) FILTER (WHERE actioned) AS actioned,
      count(*) FILTER (WHERE ts <= $1::timestamptz - interval '14 days') AS e7, count(*) FILTER (WHERE r7 AND ts <= $1::timestamptz - interval '14 days') AS r7,
      count(*) FILTER (WHERE ts <= $1::timestamptz - interval '37 days') AS e30, count(*) FILTER (WHERE r30 AND ts <= $1::timestamptz - interval '37 days') AS r30
    FROM m GROUP BY type ORDER BY type`, [at])).rows;
  return {
    medianSecondsToInsight: t?.secs === null || t?.secs === undefined ? null : Math.round(Number(t.secs)),
    under60: pct(num(t?.under), num(t?.n)),
    goalCompletion: pct(num(g?.goal), num(g?.aha)),
    goals: goals.map((x) => ({ goal: x.goal, members: num(x.n) })),
    pushOptIn: pct(num(g?.accepted), num(g?.push)),
    byAha: r.map((x) => ({ type: x.type, members: num(x.n), actioned: pct(num(x.actioned), num(x.n)), day7: pct(num(x.r7), num(x.e7)), day30: pct(num(x.r30), num(x.e30)) })),
  };
}
