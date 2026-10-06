// Run notifications for every member (spec 10). Call it on a schedule, e.g. a Railway cron service every
// 15 minutes: POST /api/notify/dispatch with "Authorization: Bearer $CRON_SECRET". Without CRON_SECRET set
// it only runs outside production.
import { NextResponse } from "next/server";
import { loadPersona, PERSONAS } from "@/lib/api/client";
import { dispatch } from "@/lib/notify/service";
import { memberIdFor } from "@/lib/analytics/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret ? auth !== `Bearer ${secret}` : process.env.NODE_ENV === "production") return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const results: Record<string, unknown> = {};
  for (const id of PERSONAS) {
    const { data } = await loadPersona(id, { latencyMs: 0 });
    // Mock: each persona's account choices live in their own browser, so dispatch uses the defaults.
    // Last time the member opened Tippla (for the 21-day win-back email).
    const seen = (await (await db()).query<{ at: string | null }>("SELECT max(ts)::text AS at FROM analytics_events WHERE member_id = $1 AND event = 'session_started' AND NOT seeded", [memberIdFor(id)])).rows[0]?.at ?? null;
    results[id] = await dispatch(id, data, {}, { lastSeen: seen });
  }
  return NextResponse.json(results);
}
