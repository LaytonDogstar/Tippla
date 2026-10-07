// Today header (redesign 07/10/2026): greeting with the date, update time and what was checked; Ask Tippla as a
// search-style input on desktop (on phones it lives in the tab bar); the notifications bell with a dot badge.
import Link from "next/link";
import { Bell, Sparkles } from "lucide-react";
import { notificationsCopy } from "@/content/account";
import { nav } from "@/content/components";

export function TodayHeader({ title, sub, subMore, subHref, unread, ask }: { title: string; sub: string; subMore?: string | null; subHref?: string; unread: number; ask: { placeholder: string } | null }) {
  return (
    <header className="flex items-center gap-t4 px-gutter pb-t3 pt-t4 sm:pb-t4 sm:pt-t5 desktop:flex-wrap desktop:pt-t7">
      <div className="min-w-0 flex-1 desktop:flex-[1_1_320px]">
        <h1 className="text-greet text-text desktop:text-greet-l">{title}</h1>
        {subHref
          ? <Link href={subHref} className="mt-t1 block text-meta-s text-accent underline-offset-2 hover:underline desktop:text-body14">{sub}</Link>
          : <p className="mt-t1 text-meta-s text-text-muted desktop:text-body14">{sub}{subMore && <span className="hidden sm:inline"> · {subMore}</span>}</p>}
      </div>
      {ask && (
        <form action="/assistant" method="get" role="search" className="hidden h-[52px] flex-[0_1_340px] items-center gap-[10px] rounded-pill bg-surface pl-[18px] pr-[4px] text-text-muted shadow-card focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--color-focus)] desktop:flex">
          <label htmlFor="ask-q" className="sr-only">{nav.askLabel}</label>
          <input id="ask-q" name="q" type="text" maxLength={500} placeholder={ask.placeholder}
            className="min-w-0 flex-1 border-0 bg-transparent text-[1rem] text-text outline-none placeholder:text-text-muted" />
          <button type="submit" aria-label={nav.askLabel} className="flex h-tap w-tap shrink-0 items-center justify-center rounded-pill bg-accent-soft text-accent">
            <Sparkles aria-hidden size={16} strokeWidth={2} />
          </button>
        </form>
      )}
      <Link href="/notifications" aria-label={unread ? `${notificationsCopy.title}, ${notificationsCopy.badge(unread)}` : notificationsCopy.title}
        className="relative ml-auto flex h-tap w-tap shrink-0 items-center justify-center rounded-pill bg-surface text-text-secondary shadow-card desktop:ml-0 desktop:h-[48px] desktop:w-[48px]">
        <Bell aria-hidden size={20} strokeWidth={1.8} />
        {unread > 0 && <span aria-hidden className="absolute right-[11px] top-[10px] h-[10px] w-[10px] rounded-pill border-2 border-surface bg-negative-mark" />}
      </Link>
    </header>
  );
}
