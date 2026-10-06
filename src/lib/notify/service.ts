// The channel-agnostic notification service (spec 10): notify(member, candidate) → the policy decides →
// push, email or inbox, logged in `notifications` (one row per member + key + channel, which is also the
// dedupe). dispatch() turns a member's current events into candidates; run it on a schedule (cron calling
// /api/notify/dispatch) and it also sends anything held for quiet hours once they end. Server only.
import type { PersonaData } from "@/lib/api/types";
import { isOn } from "@/config/featureFlags";
import { emailCopy } from "@/content/notify";
import type { AccountState } from "@/lib/account/state";
import { trackServer } from "@/lib/analytics/server";
import { db } from "@/lib/db";
import { notificationEvents, toCandidate, weeklySummary } from "@/lib/selectors/notifications";
import { safeToSpendFor } from "@/lib/selectors/goal";
import { formatShortDay, formatWhole } from "@/lib/format";
import { compose, sendEmail } from "./email";
import { decide, type Candidate, type Decision, type NotifyPrefs, type SentRecord } from "./policy";
import { prefsFor } from "./prefs";
import { sendPush } from "./push";

export interface NotifyContext { prefs: NotifyPrefs; now: string; consent: boolean; email: string }
export interface NotifyResult { key: string; status: "sent" | "scheduled" | "suppressed" | "blocked"; channel: Decision["channel"]; reason?: string; devices?: number }

async function history(member: string, now: string): Promise<SentRecord[]> {
  const rows = (await (await db()).query<{ key: string; priority: SentRecord["priority"]; channel: SentRecord["channel"]; at: string }>(
    `SELECT key, priority, channel, coalesce(sent_at, send_after)::text AS at FROM notifications
     WHERE member_id = $1 AND status IN ('sent', 'scheduled') AND send_after > $2::timestamptz - interval '8 days'`, [member, now])).rows;
  return rows.map((r) => ({ key: r.key, priority: r.priority, channel: r.channel, sentAt: new Date(r.at).toISOString() }));
}

async function logRow(member: string, d: Decision, status: string, reason: string | null, sentAt: string | null) {
  const c = d.candidate;
  const r = await (await db()).query<{ id: string }>(
    `INSERT INTO notifications (member_id, key, type, channel, priority, status, reason, send_after, sent_at, title, body, href)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (member_id, key, channel) DO NOTHING RETURNING id`,
    [member, c.key, c.category, d.channel, c.priority, status, reason, d.sendAt, sentAt, c.title, c.body, c.href]);
  return r.rows.length > 0;
}

async function deliver(member: string, d: Decision, ctx: NotifyContext): Promise<{ ok: boolean; devices: number; reason?: "no_device" | "unsubscribed" }> {
  const c = d.candidate;
  if (d.channel === "push") {
    const r = await sendPush(member, { title: d.lockScreen.title, body: d.lockScreen.body, url: c.href, tag: c.key });
    if (r.delivered > 0) return { ok: true, devices: r.delivered };
    // The recap is the one update worth an email when push isn't set up (spec 10 lifecycle email).
    if (c.key.startsWith("recap-") && isOn("email_lifecycle_v1", member)) {
      const ok = await sendEmail(member, compose(member, "recap", ctx.email, emailCopy.recap.subject, [emailCopy.recap.intro, c.body], { label: emailCopy.open, href: "/" }));
      if (ok) return { ok, devices: 0 };
    }
    // No device turned on: email instead if the member wants this category by email.
    if (ctx.prefs.channels[c.category].email && isOn("email_lifecycle_v1", member)) {
      const ok = await sendEmail(member, compose(member, "notification", ctx.email, emailCopy.notificationSubject(c.title), [c.body], { label: emailCopy.open, href: c.href }));
      return ok ? { ok, devices: 0 } : { ok: false, devices: 0, reason: "unsubscribed" };
    }
    return { ok: false, devices: 0, reason: "no_device" };
  }
  const ok = await sendEmail(member, compose(member, "notification", ctx.email, emailCopy.notificationSubject(c.title), [c.body], { label: emailCopy.open, href: c.href }));
  return ok ? { ok, devices: 0 } : { ok: false, devices: 0, reason: "unsubscribed" };
}

/** Decide and deliver one candidate. Never throws: a failed send is logged and counted, not raised. */
export async function notify(member: string, c: Candidate, ctx: NotifyContext): Promise<NotifyResult> {
  const [d] = decide([c], ctx.prefs, await history(member, ctx.now), ctx.now);
  const track = (reason: "cap" | "quiet_hours" | "dedupe" | "blocked" | "paused" | "privacy" | "digest" | "channel_off" | "no_device" | "unsubscribed") =>
    trackServer(member, "notification_suppressed", { reason }, { consent: ctx.consent });
  if (d!.outcome === "blocked") {
    await logRow(member, d!, "blocked", "blocked", null);
    await track("blocked");
    return { key: c.key, status: "blocked", channel: "inbox", reason: "blocked" };
  }
  if (d!.outcome === "inbox_only") {
    if (await logRow(member, d!, "suppressed", d!.reason ?? null, null) && d!.reason) await track(d!.reason);
    return { key: c.key, status: "suppressed", channel: "inbox", reason: d!.reason };
  }
  if (d!.sendAt > ctx.now) {
    // Held for quiet hours: logged as scheduled, sent by a later dispatch.
    if (await logRow(member, d!, "scheduled", "quiet_hours", null)) await track("quiet_hours");
    return { key: c.key, status: "scheduled", channel: d!.channel, reason: "quiet_hours" };
  }
  if (!(await logRow(member, d!, "sending", null, null))) return { key: c.key, status: "suppressed", channel: d!.channel, reason: "dedupe" };
  const r = await deliver(member, d!, ctx);
  await (await db()).query("UPDATE notifications SET status = $1, reason = $2, sent_at = $3 WHERE member_id = $4 AND key = $5 AND channel = $6",
    [r.ok ? "sent" : "suppressed", r.reason ?? null, r.ok ? ctx.now : null, member, c.key, d!.channel]);
  if (r.ok) await trackServer(member, "notification_sent", { type: c.category, channel: d!.channel }, { consent: ctx.consent });
  else await track(r.reason ?? "no_device");
  return { key: c.key, status: r.ok ? "sent" : "suppressed", channel: d!.channel, reason: r.reason, devices: r.devices };
}

/** Send anything held for quiet hours whose time has come. */
async function sendDue(member: string, ctx: NotifyContext): Promise<NotifyResult[]> {
  const due = (await (await db()).query<{ key: string; type: Candidate["category"]; channel: Decision["channel"]; priority: Candidate["priority"]; title: string; body: string; href: string }>(
    "SELECT key, type, channel, priority, title, body, href FROM notifications WHERE member_id = $1 AND status = 'scheduled' AND send_after <= $2::timestamptz ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, id", [member, ctx.now])).rows;
  const out: NotifyResult[] = [];
  for (const row of due) {
    const candidate: Candidate = { key: row.key, category: row.type, priority: row.priority, title: row.title, body: row.body, href: row.href, at: ctx.now };
    const d: Decision = { candidate, outcome: "send", channel: row.channel, sendAt: ctx.now, lockScreen: ctx.prefs.detailed ? { title: row.title, body: row.body } : { title: "Tippla", body: "You have an update from Tippla" } };
    const r = await deliver(member, d, ctx);
    await (await db()).query("UPDATE notifications SET status = $1, reason = $2, sent_at = $3 WHERE member_id = $4 AND key = $5 AND channel = $6",
      [r.ok ? "sent" : "suppressed", r.reason ?? null, r.ok ? ctx.now : null, member, row.key, row.channel]);
    if (r.ok) await trackServer(member, "notification_sent", { type: row.type, channel: row.channel }, { consent: ctx.consent });
    out.push({ key: row.key, status: r.ok ? "sent" : "suppressed", channel: row.channel, reason: r.reason, devices: r.devices });
  }
  return out;
}

/**
 * Run notifications for one member: due quiet-hours sends first, then today's events through the policy,
 * then lifecycle email (weekly digest on Sundays if chosen). Returns what happened to each.
 */
export async function dispatch(member: string, d: PersonaData, a: AccountState, opts: { now?: string; email?: string; lastSeen?: string | null } = {}): Promise<NotifyResult[]> {
  if (!isOn("push_v1", member) && !isOn("email_lifecycle_v1", member)) return [];
  const now = opts.now ?? new Date().toISOString();
  const ctx: NotifyContext = { prefs: prefsFor(a), now, consent: a.analytics !== false, email: opts.email ?? d.profile.email };
  const out = await sendDue(member, ctx);
  const events = notificationEvents(d, a).filter((e) => e.date === d.asOf);
  const rank = { high: 0, normal: 1, low: 2 } as const;
  for (const c of events.map(toCandidate).sort((x, y) => rank[x.priority] - rank[y.priority])) out.push(await notify(member, { ...c, at: now }, ctx));
  if (ctx.prefs.digest && isOn("email_lifecycle_v1", member) && new Intl.DateTimeFormat("en-AU", { timeZone: ctx.prefs.timeZone, weekday: "short" }).format(new Date(now)) === "Sun") {
    await sendWeeklyDigest(member, d, a, ctx);
  }
  if (isOn("email_lifecycle_v1", member)) await sendWinBack(member, d, a, ctx, opts.lastSeen ?? null);
  return out;
}

/** The weekly digest email: the week's events, safe to spend. Sent once per week (dedupe key). */
export async function sendWeeklyDigest(member: string, d: PersonaData, a: AccountState, ctx: NotifyContext): Promise<boolean> {
  const week = weeklySummary(d, a);
  const key = `digest:${week.to}`;
  const exists = (await (await db()).query("SELECT 1 FROM notifications WHERE member_id = $1 AND key = $2", [member, key])).rows.length > 0;
  if (exists) return false;
  const s = safeToSpendFor(d, a);
  const lines = [
    emailCopy.digest.intro(formatShortDay(week.from), formatShortDay(week.to)),
    ...(week.items.length ? week.items.map((n) => `${n.title}. ${n.body}`) : [emailCopy.digest.none]),
    emailCopy.digest.safe(s.nothingSpare ? "nothing spare before payday" : `about ${formatWhole(s.perDay)} a day`),
  ];
  const ok = await sendEmail(member, compose(member, "weekly_digest", ctx.email, emailCopy.digest.subject, lines, { label: emailCopy.open, href: "/notifications/summary" }));
  await (await db()).query(
    `INSERT INTO notifications (member_id, key, type, channel, priority, status, send_after, sent_at, title, body, href)
     VALUES ($1, $2, 'score', 'email', 'low', $3, $4, $4, $5, '', '/notifications/summary') ON CONFLICT DO NOTHING`,
    [member, key, ok ? "sent" : "suppressed", ctx.now, emailCopy.digest.subject]);
  return ok;
}

/** Lapsed 21+ days: one email with one genuine new insight, at most once every 60 days. No repeat nagging. */
export const WIN_BACK_DAYS = 21;
export async function sendWinBack(member: string, d: PersonaData, a: AccountState, ctx: NotifyContext, lastSeen: string | null): Promise<boolean> {
  if (!lastSeen || new Date(ctx.now).getTime() - new Date(lastSeen).getTime() < WIN_BACK_DAYS * 864e5) return false;
  const recent = (await (await db()).query("SELECT 1 FROM notifications WHERE member_id = $1 AND key LIKE 'winback:%' AND send_after > $2::timestamptz - interval '60 days'", [member, ctx.now])).rows.length;
  if (recent) return false;
  const insight = notificationEvents(d, a).find((e) => e.date === d.asOf);
  if (!insight) return false; // nothing genuinely new: say nothing
  const ok = await sendEmail(member, compose(member, "win_back", ctx.email, emailCopy.winBack.subject, [emailCopy.winBack.intro(d.profile.first_name), `${insight.title}. ${insight.body}`], { label: emailCopy.open, href: insight.href }));
  await (await db()).query(
    `INSERT INTO notifications (member_id, key, type, channel, priority, status, send_after, sent_at, title, body, href)
     VALUES ($1, $2, $3, 'email', 'low', $4, $5, $5, $6, '', $7) ON CONFLICT DO NOTHING`,
    [member, `winback:${ctx.now.slice(0, 10)}`, insight.type, ok ? "sent" : "suppressed", ctx.now, emailCopy.winBack.subject, insight.href]);
  return ok;
}

/** Bank consent ending soon (spec 05 schedules this at −14, −3 and 0 days). */
export async function sendConsentExpiry(member: string, ctx: NotifyContext, endsOn: string): Promise<boolean> {
  return sendEmail(member, compose(member, "consent_expiry", ctx.email, emailCopy.consentExpiry.subject, [emailCopy.consentExpiry.body(formatShortDay(endsOn))], { label: emailCopy.consentExpiry.link, href: "/account/bank" }));
}

/** What the inbox and dev tools show: the member's notification log, newest first. */
export async function notificationLog(member: string, limit = 50) {
  return (await (await db()).query<{ key: string; type: string; channel: string; priority: string; status: string; reason: string | null; send_after: string; sent_at: string | null; title: string }>(
    "SELECT key, type, channel, priority, status, reason, send_after::text, sent_at::text, title FROM notifications WHERE member_id = $1 ORDER BY id DESC LIMIT $2", [member, limit])).rows;
}
