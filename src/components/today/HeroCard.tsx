// The dark hero card (Today's pay-cycle hero, and the SmartScore page's score since 12/10/2026): the brand gradient,
// light text and the hero radius and shadow. Content is up to the page.
import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export function HeroCard({ labelledBy, label, className, children }: { labelledBy?: string; label?: string; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : label}
      className={cx("on-brand flex flex-col gap-t3 rounded-hero-s bg-hero p-t4 text-hero-on shadow-hero sm:gap-t6 sm:p-t6 desktop:rounded-hero desktop:px-t7 desktop:py-[28px]", className)}>
      {children}
    </section>
  );
}
