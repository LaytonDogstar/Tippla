"use client";
import { Bell, CircleGauge, CalendarClock, Landmark, Repeat, Sun, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { PersonaId } from "@/lib/api/types";
import { notificationsCopy as t } from "@/content/account";
import { summaryCopy } from "@/content/progress";
import { formatShortDay } from "@/lib/format";
import { useAccount } from "@/lib/account/client";
import { track } from "@/lib/analytics/client";
import type { AccountState } from "@/lib/account/state";
import { groupNotifications, type Notification, type NotificationType } from "@/lib/selectors/notifications";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";

const ICONS: Record<NotificationType, LucideIcon> = { money: CalendarClock, payday: Sun, score: CircleGauge, subscription: Repeat, bank: Landmark };

export function NotificationsView({ persona, account: initial, asOf, items }: { persona: PersonaId; account: AccountState; asOf: string; items: Notification[] }) {
  const { account, update } = useAccount(persona, initial);
  const read = new Set(account.readNotifications ?? []);
  const list = items.map((n) => ({ ...n, read: n.read || read.has(n.id) }));
  const groups = groupNotifications(list, asOf);
  const unread = list.filter((n) => !n.read);
  const markRead = (ids: string[]) => update((l) => ({ ...l, readNotifications: [...new Set([...(l.readNotifications ?? []), ...ids])] }));

  if (!list.length) return <p className="mt-t4 rounded-card-s bg-surface shadow-card sm:rounded-card p-t5 text-small text-text">{t.empty}</p>;
  return (
    <div className="pb-t6">
      <h1 className="sr-only">{t.title}</h1>
      <div className="mt-t2 flex flex-wrap items-center justify-between gap-t2">
        <p role="status" className="text-small text-text-muted">{unread.length ? t.badge(unread.length) : ""}</p>
        {unread.length > 0 && <Button variant="link" onClick={() => markRead(unread.map((n) => n.id))}>{t.markAll}</Button>}
      </div>
      {(["today", "week", "earlier"] as const).map((g) => groups[g].length > 0 && (
        <section key={g} aria-labelledby={`g-${g}`} className="mt-t4">
          <h2 id={`g-${g}`} className="px-t1 pb-t2 text-h3 text-text">{t.groups[g]}</h2>
          <ul className="overflow-hidden rounded-card-s bg-surface shadow-card sm:rounded-card">
            {groups[g].map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              return (
                <li key={n.id} className="border-b border-divider last:border-b-0">
                  <Link href={n.href} onClick={() => { track("notification_opened", { type: n.type }); if (!n.read) markRead([n.id]); }}
                    className={cx("flex min-h-[72px] items-start gap-t3 p-t4 hover:bg-surface2", !n.read && "bg-accent-soft")}>
                    <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-surface2 text-neutral"><Icon size={24} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-t3">
                        <span className="text-body-strong text-text">{n.title}</span>
                        <span className="text-caption text-text-muted">{formatShortDay(n.date)}</span>
                      </span>
                      <span className="mt-t1 block text-small text-text-muted">{n.body}</span>
                      <span className="mt-t1 block text-caption text-text-muted">{t.delivery[n.delivery]}</span>
                      {!n.read && <span className="mt-t1 inline-flex items-center gap-t1 text-caption text-accent"><span aria-hidden className="h-[8px] w-[8px] rounded-pill bg-accent" />{t.unread}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <Link href="/notifications/summary" className="mt-t4 flex min-h-tap items-center rounded-sm px-t1 text-small text-accent hover:bg-surface2">{summaryCopy.link}</Link>
      <Link href="/account/profile#notifications" className="flex min-h-tap items-center rounded-sm px-t1 text-small text-accent hover:bg-surface2">{t.settings}</Link>
    </div>
  );
}
