// Analytics intake (spec 09): batches from the browser. The member and consent come from the server's own
// cookies; the browser only sends events, timestamps, its session id and platform.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isPersona } from "@/lib/api/client";
import { ACCOUNT_COOKIE, parseAccount } from "@/lib/account/state";
import { AnalyticsError } from "@/lib/analytics/registry";
import { record, type RawEvent } from "@/lib/analytics/server";

export const dynamic = "force-dynamic";
const MAX_BATCH = 50;

export async function POST(req: Request) {
  const persona = cookies().get("tippla-persona")?.value;
  const member = isPersona(persona) ? persona : "jess";
  let body: { events?: RawEvent[] };
  try { body = (await req.json()) as { events?: RawEvent[] }; } catch { return NextResponse.json({ error: "Expected JSON" }, { status: 400 }); }
  const events = Array.isArray(body.events) ? body.events.slice(0, MAX_BATCH) : [];
  const consent = parseAccount(cookies().get(ACCOUNT_COOKIE)?.value, member).analytics !== false;
  try {
    const stored = await record(member, events, { consent, sessionId: cookies().get("tippla-sid")?.value });
    // Production drops invalid events rather than failing the batch; say how many.
    return NextResponse.json({ stored, dropped: consent ? events.length - stored : 0 });
  } catch (e) {
    // Development: an unregistered or invalid event is a bug, so say exactly what's wrong.
    if (e instanceof AnalyticsError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error("[analytics]", e);
    return NextResponse.json({ error: "Couldn't store events" }, { status: 503 });
  }
}
