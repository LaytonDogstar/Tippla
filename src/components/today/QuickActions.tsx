// Five quick actions (redesign 07/10/2026). Hardship help is always here: one tap from Today.
// Phones: a sideways-scrolling row that bleeds to the screen edge (a partial fifth tile hints it scrolls).
// From 640px: a static five-column grid.
import Link from "next/link";
import { CalendarDays, CirclePause, HeartHandshake, MessageSquareText, Flag, type LucideIcon } from "lucide-react";
import { todayCopy } from "@/content/today";
import { cx } from "@/components/ui/cx";

const t = todayCopy.quick;
const ACTIONS: { key: string; href: string; label: string; icon: LucideIcon; primary?: boolean }[] = [
  { key: "bills", href: "/calendar", label: t.bills, icon: CalendarDays, primary: true },
  { key: "pause", href: "/account/subscription", label: t.pause, icon: CirclePause },
  { key: "ask", href: "/assistant", label: t.ask, icon: MessageSquareText },
  { key: "plan", href: "/savings", label: t.plan, icon: Flag },
  { key: "hardship", href: "/hardship", label: t.hardship, icon: HeartHandshake },
];

export function QuickActions() {
  return (
    <nav aria-label={t.label} className="-mx-gutter sm:mx-0">
      <ul className="no-scrollbar flex snap-x snap-mandatory gap-t3 overflow-x-auto scroll-px-[var(--gutter)] px-gutter py-t1 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
        {ACTIONS.map((a) => (
          <li key={a.key} className="flex snap-start">
            <Link href={a.href}
              className={cx("pressable flex min-h-[5.25rem] w-[4.75rem] flex-col items-center justify-center gap-t2 rounded-tile px-t1 py-t2 text-center text-meta-s font-semibold leading-tight sm:min-h-[6rem] sm:w-full sm:text-meta",
                a.primary ? "bg-cta text-hero-on shadow-cta" : "bg-surface text-text shadow-card")}>
              <a.icon aria-hidden size={22} strokeWidth={1.8} className={a.primary ? undefined : "text-accent"} />
              {a.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
