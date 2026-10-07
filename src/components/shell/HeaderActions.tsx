// Header actions (docs/03 global elements): notifications bell with an unread badge, and the account avatar.
import { Bell, CircleUserRound } from "lucide-react";
import Link from "next/link";
import { accountPage, notificationsCopy } from "@/content/account";

const btn = "relative inline-flex h-tap w-tap shrink-0 items-center justify-center rounded-pill bg-surface text-text-secondary shadow-card hover:text-text desktop:h-[48px] desktop:w-[48px]";

export function HeaderActions({ unread }: { unread: number }) {
  return (
    <div className="flex items-center gap-t2">
      <Link href="/notifications" aria-label={unread ? `${notificationsCopy.title}, ${notificationsCopy.badge(unread)}` : notificationsCopy.title} className={btn}>
        <Bell aria-hidden size={20} strokeWidth={1.8} />
        {unread > 0 && (
          <span aria-hidden className="tnum absolute -right-[2px] -top-[2px] inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-pill bg-accent px-t1 text-caption text-on-accent">{unread}</span>
        )}
      </Link>
      <Link href="/account" aria-label={accountPage.menu} className={btn}>
        <CircleUserRound aria-hidden size={20} strokeWidth={1.8} />
      </Link>
    </div>
  );
}
