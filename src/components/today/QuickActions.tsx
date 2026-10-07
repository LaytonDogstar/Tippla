// Four quick actions (UX round 2, 6.6): Bills due, Pause payment, Ask Tippla, Hardship help. Hardship help is always
// here: one tap from Today. All tiles look the same (none looks selected); Your plan is the plan card instead.
// Phones: a row of four; from 640px: a four-column grid.
import Link from "next/link";
import { CalendarDays, CirclePause, HeartHandshake, MessageSquareText, type LucideIcon } from "lucide-react";
import { todayCopy } from "@/content/today";

const t = todayCopy.quick;
const ACTIONS: { key: string; href: string; label: string; icon: LucideIcon }[] = [
  { key: "bills", href: "/calendar", label: t.bills, icon: CalendarDays },
  { key: "pause", href: "/account/subscription", label: t.pause, icon: CirclePause },
  { key: "ask", href: "/assistant", label: t.ask, icon: MessageSquareText },
  { key: "hardship", href: "/hardship", label: t.hardship, icon: HeartHandshake },
];

export function QuickActions() {
  return (
    <nav aria-label={t.label} className="-mx-gutter sm:mx-0">
      <ul className="grid grid-cols-4 gap-t2 px-gutter py-t1 sm:gap-t3 sm:px-0">
        {ACTIONS.map((a) => (
          <li key={a.key} className="flex">
            <Link href={a.href}
              className="pressable flex min-h-[5rem] w-full flex-col items-center justify-center gap-t2 rounded-tile bg-surface px-t1 py-t2 text-center text-meta font-semibold leading-tight text-text shadow-card hover:bg-surface2 sm:min-h-[6rem]">
              <a.icon aria-hidden size={22} strokeWidth={1.8} className="text-accent" />
              {a.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
