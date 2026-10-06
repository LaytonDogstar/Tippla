// The notification policy engine (spec 10), enforced centrally for every channel. Pure: given candidate
// notifications, the member's preferences, what's already been sent and the time, it decides what goes out,
// when, on which channel and with what lock-screen text. Client-safe.
//
//   Frequency cap   normal + low: at most 1 a day and 3 a week; high: at most 1 a day (Q21 thresholds).
//   Quiet hours     default 9pm–8am in the member's timezone; anything held goes at 8am, unless it's high
//                   priority and about something due before then.
//   Dedupe          by type + entity + period (the candidate key); once sent on any channel, never again.
//   Privacy         lock-screen text is generic ("You have an update from Tippla") unless the member opts in.
//   Block list      never offers or lenders, never gambling or alcohol; nothing at all while paused.
// Anything not pushed still appears in the in-app inbox (except blocked content, which never appears).

export type Priority = "high" | "normal" | "low";
export type Channel = "push" | "email" | "inbox";
export type Category = "money" | "payday" | "score" | "subscription" | "bank";
export type SuppressReason = "cap" | "quiet_hours" | "dedupe" | "blocked" | "paused" | "privacy" | "channel_off" | "digest";

export interface Candidate {
  /** Dedupe key: type + entity + period, e.g. "shortfall:2026-09-17". */
  key: string;
  category: Category;
  priority: Priority;
  title: string;
  body: string;
  href: string;
  /** When the thing happened or was detected (ISO datetime). */
  at: string;
  /** When the thing it's about is due (ISO datetime), for high-priority quiet-hours exceptions. */
  dueAt?: string;
}

export interface NotifyPrefs {
  paused: boolean;
  quiet: { start: string; end: string };
  /** Show amounts and names on the lock screen (off by default). */
  detailed: boolean;
  /** Low-priority updates go in the weekly digest instead of one at a time. */
  digest: boolean;
  channels: Record<Category, { push: boolean; email: boolean }>;
  timeZone: string;
}

export const DEFAULT_PREFS: NotifyPrefs = {
  paused: false,
  quiet: { start: "21:00", end: "08:00" },
  detailed: false,
  digest: false,
  channels: {
    money: { push: true, email: false },
    payday: { push: true, email: false },
    score: { push: true, email: false },
    subscription: { push: true, email: true },
    bank: { push: true, email: true },
  },
  timeZone: "Australia/Sydney",
};

/** Policy limits (Q21 sample logic, from spec 10). */
export const LIMITS = { normalLowPerDay: 1, normalLowPerWeek: 3, highPerDay: 1 } as const;

export interface SentRecord { key: string; priority: Priority; channel: Channel; sentAt: string }

export interface Decision {
  candidate: Candidate;
  /** Sent now or at `sendAt` on `channel`; or kept in the inbox only, with the reason. */
  outcome: "send" | "inbox_only" | "blocked";
  channel: Channel;
  sendAt: string;
  reason?: SuppressReason;
  /** What a lock screen shows. */
  lockScreen: { title: string; body: string };
}

export const GENERIC = { title: "Tippla", body: "You have an update from Tippla" } as const;
const BLOCKED = /\boffers?\b|lender|pre-?approved|gambl|\bbet(s|ting)?\b|casino|alcohol|liquor/i;

/** Local wall-clock parts in the member's timezone. */
export function localParts(iso: string, timeZone: string): { date: string; minutes: number } {
  const f = new Intl.DateTimeFormat("en-AU", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

export function inQuietHours(iso: string, prefs: Pick<NotifyPrefs, "quiet" | "timeZone">): boolean {
  const m = localParts(iso, prefs.timeZone).minutes, s = toMin(prefs.quiet.start), e = toMin(prefs.quiet.end);
  return s > e ? m >= s || m < e : m >= s && m < e;
}

/** The next time quiet hours end, as an ISO datetime. */
export function quietEndAfter(iso: string, prefs: Pick<NotifyPrefs, "quiet" | "timeZone">): string {
  if (!inQuietHours(iso, prefs)) return iso;
  const m = localParts(iso, prefs.timeZone).minutes, e = toMin(prefs.quiet.end);
  let t = new Date(iso).getTime() + (((e - m + 1440) % 1440) * 60_000) - (new Date(iso).getUTCSeconds() * 1000 + new Date(iso).getUTCMilliseconds());
  // A daylight-saving change overnight can leave us an hour short: nudge forward until outside.
  for (let i = 0; i < 8 && inQuietHours(new Date(t).toISOString(), prefs); i++) t += 15 * 60_000;
  return new Date(t).toISOString();
}

export const isBlocked = (c: Pick<Candidate, "title" | "body" | "href">) => BLOCKED.test(`${c.title} ${c.body}`) || /\/offers/.test(c.href);

/**
 * Decide each candidate in order (callers sort by time, then priority), counting what's already been sent
 * plus what this run decides to send.
 */
export function decide(candidates: Candidate[], prefs: NotifyPrefs, history: SentRecord[], now: string): Decision[] {
  const sent = [...history];
  const out: Decision[] = [];
  for (const c of candidates) {
    const lockScreen = prefs.detailed ? { title: c.title, body: c.body } : { ...GENERIC };
    const base = { candidate: c, lockScreen, sendAt: now };
    if (isBlocked(c)) { out.push({ ...base, outcome: "blocked", channel: "inbox", reason: "blocked" }); continue; }
    if (sent.some((s) => s.key === c.key && s.channel !== "inbox")) { out.push({ ...base, outcome: "inbox_only", channel: "inbox", reason: "dedupe" }); continue; }
    if (prefs.paused) { out.push({ ...base, outcome: "inbox_only", channel: "inbox", reason: "paused" }); continue; }
    if (prefs.digest && c.priority === "low") { out.push({ ...base, outcome: "inbox_only", channel: "inbox", reason: "digest" }); continue; }
    const ch = prefs.channels[c.category];
    const channel: Channel | null = ch.push ? "push" : ch.email ? "email" : null;
    if (!channel) { out.push({ ...base, outcome: "inbox_only", channel: "inbox", reason: "channel_off" }); continue; }

    // Quiet hours: hold until they end, unless it's urgent and due before then.
    let sendAt = c.at > now ? c.at : now;
    if (inQuietHours(sendAt, prefs)) {
      const end = quietEndAfter(sendAt, prefs);
      if (!(c.priority === "high" && c.dueAt && Date.parse(c.dueAt) < Date.parse(end))) sendAt = end;
    }

    // Caps, counted in the member's local day and the 7 days up to the send time.
    const day = localParts(sendAt, prefs.timeZone).date;
    const weekAgo = new Date(new Date(sendAt).getTime() - 7 * 864e5).toISOString();
    const pushed = sent.filter((s) => s.channel !== "inbox");
    const sameDay = pushed.filter((s) => localParts(s.sentAt, prefs.timeZone).date === day);
    const over = c.priority === "high"
      ? sameDay.filter((s) => s.priority === "high").length >= LIMITS.highPerDay
      : sameDay.filter((s) => s.priority !== "high").length >= LIMITS.normalLowPerDay
        || pushed.filter((s) => s.priority !== "high" && s.sentAt > weekAgo && s.sentAt <= sendAt).length >= LIMITS.normalLowPerWeek;
    if (over) { out.push({ ...base, outcome: "inbox_only", channel: "inbox", reason: "cap" }); continue; }

    sent.push({ key: c.key, priority: c.priority, channel, sentAt: sendAt });
    out.push({ ...base, outcome: "send", channel, sendAt, ...(sendAt !== now && sendAt !== c.at ? { reason: "quiet_hours" as const } : {}) });
  }
  return out;
}
