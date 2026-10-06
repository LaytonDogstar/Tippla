// Spec 05: store each day's forecast (1, 3, 7 and 14 days ahead), then fill in the actual end-of-day balance
// once the date has passed. Run from dispatch (daily). Server only.
import type { PersonaData } from "@/lib/api/types";
import { db } from "@/lib/db";
import { dailyBalances, forecastAhead, HORIZONS } from "@/lib/selectors";

export async function recordForecasts(member: string, d: PersonaData): Promise<number> {
  const q = await db();
  let n = 0;
  for (const h of HORIZONS) {
    const f = forecastAhead(d, h);
    const r = await q.query("INSERT INTO forecast_snapshots (member_id, made_on, for_date, horizon, predicted) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING 1",
      [member, d.asOf, f.forDate, h, f.predicted]);
    n += r.rows.length;
  }
  const bal = dailyBalances(d).filter((p) => p.date <= d.asOf);
  for (const p of bal.slice(-20)) {
    await q.query("UPDATE forecast_snapshots SET actual = $1 WHERE member_id = $2 AND for_date = $3 AND actual IS NULL", [p.balance, member, p.date]);
  }
  return n;
}

/** Mean absolute error by horizon from stored snapshots that now have an actual. */
export async function storedAccuracy(): Promise<{ horizon: number; compared: number; mae: number | null }[]> {
  const rows = (await (await db()).query<{ horizon: number; n: string; mae: string | null }>(
    "SELECT horizon, count(actual) AS n, avg(abs(predicted - actual)) AS mae FROM forecast_snapshots GROUP BY horizon ORDER BY horizon")).rows;
  return rows.map((r) => ({ horizon: Number(r.horizon), compared: Number(r.n), mae: r.mae === null ? null : Math.round(Number(r.mae)) }));
}
