// One affordance for tappable cards and rows (UX round 2, 3.4): the whole card is the target, with a trailing
// chevron. The title says what it is; there's no second text link inside the card. The title's own link or
// button is stretched over the card (so headings stay headings, and nothing interactive is nested).
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cx } from "./cx";

type Props = {
  icon?: LucideIcon;
  title: ReactNode;
  body?: ReactNode;
  /** Extra content under the body (label/value pairs, a status chip). Not interactive. */
  children?: ReactNode;
  /** Soft brand tint, for the one card a screen leads with. */
  soft?: boolean;
  /** Heading level for the title. */
  as?: "h2" | "h3" | "p";
  className?: string;
  ariaLabel?: string;
} & ({ href: string; onClick?: never } | { onClick: () => void; href?: never });

const STRETCH = "rounded-sm text-left outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:after:outline focus-visible:after:outline-[length:var(--focus-width)] focus-visible:after:outline-offset-[var(--focus-offset)] focus-visible:after:outline-focus";

export function CardLink({ icon: Icon, title, body, children, soft, as: H = "h2", className, ariaLabel, ...target }: Props) {
  const label = "href" in target && target.href
    ? <Link href={target.href} aria-label={ariaLabel} className={STRETCH}>{title}</Link>
    : <button type="button" onClick={target.onClick} aria-label={ariaLabel} className={STRETCH}>{title}</button>;
  return (
    <div className={cx("pressable relative flex min-h-[72px] w-full items-start gap-t3 rounded-card-s p-t4 shadow-card sm:rounded-card sm:px-t5",
      soft ? "bg-accent-soft hover:bg-accent-tint2" : "bg-surface hover:bg-surface2", className)}>
      {Icon && (
        <span aria-hidden className={cx("flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-pill", soft ? "bg-surface text-accent" : "bg-accent-soft text-accent")}>
          <Icon size={20} strokeWidth={1.8} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <H className="text-row text-text">{label}</H>
        {body && <p className="mt-t1 text-body14 text-text-secondary">{body}</p>}
        {children}
      </div>
      <ChevronRight aria-hidden size={20} className="shrink-0 self-center text-icon-muted" />
    </div>
  );
}
