// P14 Notifications: event-driven only. Something happened (or is about to) with the customer's own money:
// a shortfall within 5 days, a bill tomorrow bigger than the balance, pay landed, the pay-cycle recap, a
// SmartScore update, or a change to their account. No routine "refreshed" or "payment went through"
// messages. Never offers or lenders, never gambling or alcohol. Which ones go to the phone (or email) is
// decided by the central policy engine (src/lib/notify/policy.ts, spec 10); every one is in the inbox.
import type { PersonaData } from "@/lib/api/types";
import { notificationsCopy as t } from "@/content/account";
import { SHORTFALL_NOTIFY_DAYS } from "@/config/flags";
import { decide, type Candidate, type Priority, type SuppressReason } from "@/lib/notify/policy";
import { prefsFor } from "@/lib/notify/prefs";
import type { AccountState } from "@/lib/account/state";
import { addDays, daysBetween, formatShortDay, type ISODate } from "@/lib/format/dates";
import { formatAUD, formatCents, formatWhole } from "@/lib/format/money";
import { billing } from "./account";
import { currentBalance, projectedBalances } from "./balance";
import { billsBeforePayday, payCycleSummary } from "./payCycle";
import { cycleRecap, paydayCheckIn } from "./payCycleLoop";
import { goalPlan } from "./goal";
import { balanceBefore } from "@/lib/feed/rules/_helpers";

/** No "offer" type: lender offers are never a notification (05/10 guardrail). */
export type NotificationType = "money" | "payday" | "score" | "subscription" | "bank";
/** How the policy delivered it: to the phone, by email, kept in the inbox (with why), or in the weekly digest. */
export type Delivery = "push" | "email" | "inbox" | "digest" | "paused" | "off";
export interface Notification { id: string; type: NotificationType; date: ISODate; title: string; body: string; href: string; read: boolean; delivery: Delivery; priority: Priority; dueAt?: string }

/** Spec 02/10 priorities: money alerts are high; payday, recap and account changes normal; score low. */
export const PRIORITY_OF: Record<NotificationType, Priority> = { money: "high", payday: "normal", bank: "normal", subscription: "normal", score: "low" };
const RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };
/** Events are detected at the morning refresh. */
export const eventTime = (date: ISODate) => `${date}T09:15:00+10:00`;
const money = (n: number) => (Number.isInteger(n) ? formatAUD(n) : formatCents(n));

type NotificationEvent = Omit<Notification, "read" | "delivery" | "priority">;

export function notificationEvents(d: PersonaData, a: AccountState = {}): NotificationEvent[] {
  const out: NotificationEvent[] = [];

  // Shortfall: the balance is forecast to go under before payday, within 5 days.
  const pc = payCycleSummary(d, {});
  if (pc.isShort) {
    const overdrawn = currentBalance(d) < 0;
    const under = projectedBalances(d, addDays(pc.nextPayday, -1)).find((p) => p.date > d.asOf && p.balance < 0);
    if (overdrawn || (under && daysBetween(d.asOf, under.date) <= SHORTFALL_NOTIFY_DAYS)) {
      out.push({ id: `shortfall-${pc.cycle.start}`, type: "money", date: d.asOf, title: t.shortfall.title(formatWhole(-pc.leftAfterBills)), body: overdrawn ? t.shortfall.overdrawn : t.shortfall.body(formatShortDay(under!.date)), href: "/hardship" });
    }
  }
  // A bill tomorrow that is bigger than the balance going into it.
  for (const b of billsBeforePayday(d).filter((x) => x.date === addDays(d.asOf, 1))) {
    const bal = balanceBefore(d, b.date);
    if (b.expected_amount > bal) out.push({ id: `bill-${b.merchant}-${b.date}`, type: "money", date: d.asOf, dueAt: `${b.date}T00:00:00+10:00`, title: t.billTomorrow.title(b.merchant, money(b.expected_amount)), body: bal <= 0 ? t.billTomorrow.overdrawn : t.billTomorrow.body(formatWhole(bal)), href: `/calendar?day=${b.date}` });
  }
  // Pay landed: the check-in, and the recap of the cycle that just ended.
  const checkIn = paydayCheckIn(d, goalPlan(d, a.goal)?.thisCycle ?? 0);
  if (checkIn) {
    const safe = checkIn.safe.nothingSpare ? null : formatWhole(checkIn.safe.perDay);
    out.push({ id: `payday-${checkIn.cycle.start}`, type: "payday", date: d.asOf, title: t.payday.title(formatCents(checkIn.incomeTotal)), body: safe ? t.payday.body(safe, checkIn.bills.length) : t.payday.nothingSpare(checkIn.bills.length), href: "/" });
    const r = cycleRecap(d);
    if (r) out.push({ id: `recap-${r.cycle.start}`, type: "payday", date: d.asOf, title: t.recap.title, body: t.recap.body(formatWhole(r.spent), formatWhole(r.paidIn), r.advances.count === 0 ? t.recap.noAdvance(r.noAdvanceStreak) : ""), href: "/" });
  }
  // SmartScore updates (the last three refreshes). The amount only: no factor detail, so gambling never
  // appears in a notification.
  const h = d.scoreHistory;
  for (let i = h.length - 1; i >= Math.max(1, h.length - 3); i--) {
    const now = h[i]!, prev = h[i - 1]!;
    out.push({ id: `score-${now.scored_date}`, type: "score", date: now.scored_date, title: t.score.title(now.score), body: t.score.body(now.score - prev.score, formatShortDay(prev.scored_date)), href: "/score" });
  }
  if (!d.score) out.push({ id: `score-pending-${d.asOf}`, type: "score", date: d.asOf, title: t.score.pendingTitle, body: t.score.pendingBody, href: "/score" });

  // Changes to the customer's own account.
  const bill = billing(d, a);
  if (bill.status === "cancelled" && bill.until) out.push({ id: `sub-cancelled-${a.subscription?.changedAt ?? ""}`, type: "subscription", date: d.asOf, title: t.subscription.cancelled, body: t.subscription.cancelledBody(formatShortDay(bill.until)), href: "/account/subscription" });
  if (bill.status === "paused" && bill.until) out.push({ id: `sub-paused-${a.subscription?.changedAt ?? ""}`, type: "subscription", date: d.asOf, title: t.subscription.paused, body: t.subscription.pausedBody(formatShortDay(bill.until)), href: "/account/subscription" });
  if (a.bank?.disconnected) out.push({ id: `bank-off-${d.asOf}`, type: "bank", date: d.asOf, title: t.bank.disconnected, body: t.bank.disconnectedBody, href: "/account/bank" });
  return out;
}

/** The candidate the policy engine sees for an event. */
export const toCandidate = (n: NotificationEvent): Candidate => ({
  key: n.id, category: n.type, priority: PRIORITY_OF[n.type], title: n.title, body: n.body, href: n.href, at: eventTime(n.date), ...(n.dueAt ? { dueAt: n.dueAt } : {}),
});

const DELIVERY: Partial<Record<SuppressReason, Delivery>> = { cap: "inbox", dedupe: "inbox", digest: "digest", paused: "paused", channel_off: "off", quiet_hours: "push" };

export function notifications(d: PersonaData, a: AccountState = {}): Notification[] {
  const prefs = prefsFor(a);
  // In date order, most urgent first within a day, so the policy counts what came before.
  const events = notificationEvents(d, a).sort((x, y) => x.date.localeCompare(y.date) || RANK[PRIORITY_OF[x.type]] - RANK[PRIORITY_OF[y.type]]);
  const delivery = new Map<string, Delivery>();
  const history: Parameters<typeof decide>[2] = [];
  for (const e of events) {
    const [dec] = decide([toCandidate(e)], prefs, history, eventTime(e.date));
    if (!dec || dec.outcome === "blocked") continue; // never shown anywhere
    if (dec.outcome === "send") history.push({ key: e.id, priority: dec.candidate.priority, channel: dec.channel, sentAt: dec.sendAt });
    delivery.set(e.id, dec.outcome === "send" ? (dec.channel === "email" ? "email" : "push") : DELIVERY[dec.reason!] ?? "inbox");
  }
  const read = new Set(a.readNotifications ?? []);
  // Anything older than a week starts as read: the inbox shouldn't open with a backlog.
  return events.filter((n) => delivery.has(n.id))
    .map((n) => ({ ...n, priority: PRIORITY_OF[n.type], delivery: delivery.get(n.id)!, read: read.has(n.id) || daysBetween(n.date, d.asOf) >= 7 }))
    .sort((x, y) => y.date.localeCompare(x.date) || RANK[x.priority] - RANK[y.priority]);
}

/** Today / this week / earlier, relative to the data date. */
export function groupNotifications(list: Notification[], asOf: ISODate) {
  const groups = { today: [] as Notification[], week: [] as Notification[], earlier: [] as Notification[] };
  for (const n of list) {
    const age = daysBetween(n.date, asOf);
    (age <= 0 ? groups.today : age < 7 ? groups.week : groups.earlier).push(n);
  }
  return groups;
}

export const unreadCount = (list: Notification[]) => list.filter((n) => !n.read).length;

/** The weekly summary (digest): the week's events in one place. Same events, same guardrails. */
export function weeklySummary(d: PersonaData, a: AccountState = {}) {
  const from = addDays(d.asOf, -6);
  return { from, to: d.asOf, items: notifications(d, a).filter((n) => n.date >= from && n.date <= d.asOf) };
}
