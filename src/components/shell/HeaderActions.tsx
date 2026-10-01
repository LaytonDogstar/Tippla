// Header actions (docs/03 global elements): notifications bell with an unread badge, and the account avatar.
import { Bell, CircleUserRound } from "lucide-react";
import Link from "next/link";
import { accountPage, notificationsCopy } from "@/content/account";

const btn = "relative inline-flex h-[48px] w-[48px] items-center justify-center rounded-pill bg-surface2 text-text hover:bg-neutral-soft";

export function HeaderActions({ unread }: { unread: number }) {
  return (
    <div className="flex items-center gap-t2">
      <Link href="/notifications" aria-label={unread ? `${notificationsCopy.title}, ${notificationsCopy.badge(unread)}` : notificationsCopy.title} className={btn}>
        <Bell aria-hidden size={24} />
        {unread > 0 && (
          <span aria-hidden className="tnum absolute -right-[2px] -top-[2px] inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-pill bg-accent px-t1 text-caption text-on-accent">{unread}</span>
        )}
      </Link>
      <Link href="/account" aria-label={accountPage.menu} className={btn}>
        <CircleUserRound aria-hidden size={24} />
      </Link>
    </div>
  );
}
