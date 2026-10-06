// Server side of analytics (spec 09): validate against the registry, build the envelope, respect consent,
// store in the database. Development throws on anything unregistered or invalid; production drops it with
// a warning, so a bad event can never break a page.
import { createHash } from "node:crypto";
import { activeFlags } from "@/config/featureFlags";
import { db } from "@/lib/db";
import pkg from "../../../package.json";
import { AnalyticsError, cleanProps, isEventName, type AnalyticsEvent, type EventName, type EventProps } from "./registry";

const STRICT = process.env.NODE_ENV !== "production";
const PLATFORMS = ["web", "pwa", "ios", "android"] as const;
const SESSION = /^[a-z0-9-]{8,64}$/i;

/** Pseudonymous member id: a salted hash, never the email or name. */
export function memberIdFor(member: string): string {
  return "m_" + createHash("sha256").update(`${process.env.ANALYTICS_SALT ?? "tippla-demo"}:${member}`).digest("hex").slice(0, 16);
}

export interface RawEvent { event: string; props?: Record<string, unknown>; ts?: string; platform?: string; session_id?: string }

/** Validate and build envelopes. Invalid events throw in development; in production they're skipped. */
export function buildEvents(member: string, raw: RawEvent[], opts: { sessionId?: string; now?: Date; flagsOff?: string[] } = {}): AnalyticsEvent[] {
  const now = opts.now ?? new Date();
  const flags = activeFlags(member, { off: opts.flagsOff ?? (process.env.FLAGS_OFF ?? "").split(",").filter(Boolean) });
  const out: AnalyticsEvent[] = [];
  for (const r of raw) {
    try {
      if (!isEventName(r.event)) throw new AnalyticsError(`Unregistered analytics event "${r.event}". Add it to src/lib/analytics/registry.ts.`);
      const ts = r.ts && !Number.isNaN(Date.parse(r.ts)) && Math.abs(Date.parse(r.ts) - now.getTime()) < 7 * 864e5 ? new Date(r.ts).toISOString() : now.toISOString();
      const session = r.session_id && SESSION.test(r.session_id) ? r.session_id : opts.sessionId && SESSION.test(opts.sessionId) ? opts.sessionId : "server-session";
      out.push({
        event: r.event, member_id: memberIdFor(member), session_id: session, ts,
        props: cleanProps(r.event, r.props ?? {}),
        app_version: pkg.version,
        platform: (PLATFORMS as readonly string[]).includes(r.platform ?? "") ? (r.platform as AnalyticsEvent["platform"]) : "web",
        flags,
      });
    } catch (e) {
      if (STRICT) throw e;
      console.warn("[analytics] dropped:", (e as Error).message);
    }
  }
  return out;
}

export async function store(events: AnalyticsEvent[], opts: { seeded?: boolean } = {}): Promise<number> {
  if (!events.length) return 0;
  const d = await db();
  const cols = 9, values: unknown[] = [];
  const rows = events.map((e, i) => {
    values.push(e.event, e.member_id, e.session_id, e.ts, JSON.stringify(e.props), e.app_version, e.platform, e.flags, !!opts.seeded);
    return `(${Array.from({ length: cols }, (_, k) => `$${i * cols + k + 1}`).join(",")})`;
  });
  await d.query(`INSERT INTO analytics_events (event, member_id, session_id, ts, props, app_version, platform, flags, seeded) VALUES ${rows.join(",")}`, values);
  return events.length;
}

/** Record events for a member, if they've consented. Returns how many were stored. */
export async function record(member: string, raw: RawEvent[], opts: { consent: boolean; sessionId?: string }): Promise<number> {
  if (!opts.consent) return 0;
  return store(buildEvents(member, raw, { sessionId: opts.sessionId }));
}

/** Typed server-side tracking (e.g. a recap generated, a notification sent). Never throws in production. */
export async function trackServer<E extends EventName>(member: string, event: E, props: EventProps<E>, opts: { consent: boolean; sessionId?: string }): Promise<void> {
  try {
    await record(member, [{ event, props }], opts);
  } catch (e) {
    if (STRICT && e instanceof AnalyticsError) throw e;
    console.warn("[analytics] not stored:", (e as Error).message);
  }
}
