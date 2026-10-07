// Coming up (redesign 07/10/2026): money in and out over the next two weeks. Pay advance repayments get a caution
// tint (never positive); payday gets positive colouring with its expected amount. Phones show three rows.
import Link from "next/link";
import { ArrowDown, BadgeCheck, CreditCard } from "lucide-react";
import { categoryIcons } from "@/components/icons";
import { todayCopy } from "@/content/today";
import { formatDollars, formatShortDay } from "@/lib/format";
import type { ComingUpItem } from "@/lib/selectors/today";
import { cx } from "@/components/ui/cx";
import { Card, IconBubble } from "./Card";

const t = todayCopy.coming;

export function ComingUp({ items }: { items: ComingUpItem[] }) {
  return (
    <Card id="coming-up" title={t.heading} action={{ href: "/calendar", label: t.calendar }}>
      {items.length === 0 ? <p className="text-body14 text-text-secondary">{t.none}</p> : (
        <ul className="flex flex-col">
          {items.slice(0, 6).map((it, i) => {
            const name = it.kind === "income" ? t.payday : it.kind === "payAdvance" ? t.advanceRepay : it.kind === "tippla" ? t.tippla : it.name;
            const sub = `${formatShortDay(it.date)} · ${it.kind === "income" || it.kind === "payAdvance" ? it.name : t.qualifier[it.qualifier]}`;
            return (
              // Rows after the third are for tablet and desktop only.
              <li key={`${it.kind}-${it.name}-${it.date}`} className={cx("flex items-center gap-t3 py-[10px]", i > 0 && "border-t border-divider", i >= 3 && "hidden sm:flex")}>
                {/* Category icons, the same set as the transaction list; no merchant logos in the data yet (3.6). */}
                {it.kind === "income" ? <IconBubble icon={ArrowDown} tone="positive" size={42} />
                  : it.kind === "payAdvance" ? <IconBubble icon={CreditCard} tone="caution" size={42} />
                  : it.kind === "tippla" ? <IconBubble icon={BadgeCheck} tone="info" size={42} />
                  : <IconBubble icon={categoryIcons[it.category ?? "uncategorised"]} tone="info" size={42} />}
                <div className="min-w-0 flex-1">
                  <p className="text-body14 font-bold text-text">{name}</p>
                  <p className="text-meta-s text-text-muted">{sub}{it.kind === "income" ? ` · ${t.qualifier[it.qualifier]}` : ""}</p>
                </div>
                <span className={cx("text-[0.9375rem] font-bold", it.kind === "income" ? "text-positive" : "text-text")}>{formatDollars(it.amount)}</span>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > 3 && <Link href="/calendar" className="mt-t2 flex min-h-tap items-center justify-center rounded-pill bg-chip text-body14 font-semibold text-accent sm:hidden">{t.seeCalendar}</Link>}
    </Card>
  );
}
