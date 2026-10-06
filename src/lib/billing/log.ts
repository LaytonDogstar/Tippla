// Billing date changes are logged with their reason (spec 03: billing_events). This is an operational
// record, kept whatever the analytics setting; the matching analytics events respect consent. Each change is
// logged once (the table is unique on member, type and dates), so pages can call this on every view.
import type { BillingAlignment } from "@/lib/selectors/account";
import type { BillingPref } from "@/lib/account/state";
import { db } from "@/lib/db";
import { trackServer } from "@/lib/analytics/server";

export type BillingEventType = "aligned" | "deferred" | "preference_changed" | "retry_scheduled";

async function log(member: string, type: BillingEventType, from: string | null, to: string | null, reason: string): Promise<boolean> {
  const d = await db();
  const r = await d.query<{ id: string }>(
    "INSERT INTO billing_events (member_id, type, from_date, to_date, reason) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING id",
    [member, type, from, to, reason]);
  return r.rows.length > 0;
}

/** Record the current alignment (moved after payday, deferred, retries scheduled). Never throws. */
export async function logAlignment(member: string, a: BillingAlignment, next: string | null, opts: { consent: boolean }): Promise<void> {
  try {
    if (a.deferred) {
      if (await log(member, "deferred", a.deferred.from, a.deferred.to, `forecast lowest balance ${a.deferred.lowest.toFixed(2)} before next pay`))
        await trackServer(member, "billing_deferred", { reason: "shortfall" }, opts);
    } else if (a.moved && next) {
      if (await log(member, "aligned", a.nominal, next, `${a.pref.mode}/${a.pref.cadence}: day after payday ${a.payday ?? "n/a"}`))
        await trackServer(member, "billing_date_aligned", {}, opts);
    }
    if (a.failed) for (const r of a.failed.retries) await log(member, "retry_scheduled", a.failed.on, r, "retry after the next pay lands");
  } catch (e) {
    console.warn("[billing] not logged:", (e as Error).message);
  }
}

export async function logPreference(member: string, pref: BillingPref): Promise<void> {
  try {
    await log(member, "preference_changed", null, null, `${pref.mode}/${pref.cadence}${pref.fixedDay ? `/day ${pref.fixedDay}` : ""} at ${pref.changedAt}`);
  } catch (e) {
    console.warn("[billing] not logged:", (e as Error).message);
  }
}

export async function billingLog(member: string) {
  const d = await db();
  return (await d.query<{ type: string; from_date: string | null; to_date: string | null; reason: string }>(
    "SELECT type, to_char(from_date, 'YYYY-MM-DD') AS from_date, to_char(to_date, 'YYYY-MM-DD') AS to_date, reason FROM billing_events WHERE member_id = $1 ORDER BY id", [member])).rows;
}
