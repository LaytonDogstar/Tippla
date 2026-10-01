// P14 Notifications: generated from the same data the screens show, so an inbox item never says something
// a screen doesn't. Offer notifications only exist with lender-matching consent.
import type { PersonaData } from "@/lib/api/types";
import { notificationsCopy as t } from "@/content/account";
import type { AccountState } from "@/lib/account/state";
import { addDays, daysBetween, formatShortDay, toAESTDate, type ISODate } from "@/lib/format/dates";
import { formatAUD, formatCents } from "@/lib/format/money";
import { billing } from "./account";
import { lenderMatchingOn } from "./banners";

export type NotificationType = "score" | "bill" | "offer" | "subscription" | "bank";
export interface Notification { id: string; type: NotificationType; date: ISODate; title: string; body: string; href: string; read: boolean }

export function notifications(d: PersonaData, a: AccountState = {}): Notification[] {
  const out: Omit<Notification, "read">[] = [];
  const h = d.scoreHistory;
  for (let i = h.length - 1; i >= Math.max(1, h.length - 3); i--) {
    const now = h[i]!, prev = h[i - 1]!;
    const delta = now.score - prev.score;
    out.push({ id: `score-${now.scored_date}`, type: "score", date: now.scored_date, title: t.score.title(now.score), body: t.score.body(delta, formatShortDay(prev.scored_date)), href: "/score" });
  }
  if (!d.score) out.push({ id: `score-pending-${d.asOf}`, type: "score", date: d.asOf, title: t.score.pendingTitle, body: t.score.pendingBody, href: "/score" });

  for (const b of d.derived.upcoming_bills.filter((x) => x.date > d.asOf && x.date <= addDays(d.asOf, 3))) {
    const amt = Number.isInteger(b.expected_amount) ? formatAUD(b.expected_amount) : formatCents(b.expected_amount);
    out.push({ id: `bill-${b.merchant}-${b.date}`, type: "bill", date: d.asOf, title: t.bill.title(b.merchant), body: t.bill.body(amt, formatShortDay(b.date)), href: `/calendar?day=${b.date}` });
  }

  if (lenderMatchingOn(d) && d.offers.offers.length) {
    out.push({ id: `offer-${d.offers.offers.map((o) => o.id).join("-")}`, type: "offer", date: d.asOf, title: t.offer.title(d.offers.offers.length), body: t.offer.body, href: "/offers" });
  }

  const bill = billing(d, a);
  const last = bill.history[0];
  if (last) out.push({ id: `sub-paid-${last.date}`, type: "subscription", date: last.date, title: t.subscription.paid(formatCents(last.amount)), body: t.subscription.paidBody(bill.planName), href: "/account/subscription" });
  if (bill.status === "cancelled" && bill.until) out.push({ id: `sub-cancelled-${a.subscription?.changedAt ?? ""}`, type: "subscription", date: d.asOf, title: t.subscription.cancelled, body: t.subscription.cancelledBody(formatShortDay(bill.until)), href: "/account/subscription" });
  if (bill.status === "paused" && bill.until) out.push({ id: `sub-paused-${a.subscription?.changedAt ?? ""}`, type: "subscription", date: d.asOf, title: t.subscription.paused, body: t.subscription.pausedBody(formatShortDay(bill.until)), href: "/account/subscription" });

  if (a.bank?.disconnected) out.push({ id: `bank-off-${d.asOf}`, type: "bank", date: d.asOf, title: t.bank.disconnected, body: t.bank.disconnectedBody, href: "/account/bank" });
  else {
    const refreshed = d.score?.scoredAt ? toAESTDate(d.score.scoredAt) : d.asOf;
    out.push({ id: `bank-refresh-${refreshed}`, type: "bank", date: refreshed, title: t.bank.refreshed, body: t.bank.refreshedBody, href: "/account/bank" });
  }

  const read = new Set(a.readNotifications ?? []);
  // Anything older than a week starts as read: the inbox shouldn't open with a backlog.
  return out.map((n) => ({ ...n, read: read.has(n.id) || daysBetween(n.date, d.asOf) >= 7 })).sort((x, y) => y.date.localeCompare(x.date) || x.type.localeCompare(y.type));
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
