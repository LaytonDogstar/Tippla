// Shared pieces for the Today cards (redesign 07/10/2026): card shell, tinted icon bubble, status chip, skeleton.
// Colours come from tokens only; status always pairs a tint with an icon or a text label.
import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "@/components/ui/cx";
import type { Tone } from "@/lib/selectors/today";

export function Card({ id, title, count, action, className, children, as: As = "section" }: {
  id: string; title: ReactNode; count?: ReactNode; action?: { href: string; label: string; ariaLabel?: string } | ReactNode;
  className?: string; children: ReactNode; as?: "section" | "div";
}) {
  const isLink = action && typeof action === "object" && "href" in (action as object);
  const a = action as { href: string; label: string; ariaLabel?: string };
  return (
    <As aria-labelledby={id} className={cx("rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card sm:p-t6", className)}>
      <div className="flex flex-wrap items-center gap-x-t3 gap-y-t1 pb-t3">
        <h2 id={id} className="text-card text-text sm:text-card-l">{title}</h2>
        {count}
        <span className="flex-1" />
        {isLink ? <Link href={a.href} aria-label={a.ariaLabel} className="inline-flex min-h-tap items-center rounded-md px-t1 text-body14 font-semibold text-accent hover:text-accent-strong">{a.label}</Link> : (action as ReactNode)}
      </div>
      {children}
    </As>
  );
}

const TONE_BUBBLE: Record<Tone | "positive" | "neutral", string> = {
  negative: "bg-negative-soft text-negative",
  caution: "bg-caution-soft text-caution",
  info: "bg-accent-soft text-accent",
  positive: "bg-positive-soft text-positive",
  neutral: "bg-chip text-text-secondary",
};

export function IconBubble({ icon: Icon, tone, size = 44, children }: { icon?: LucideIcon; tone: Tone | "positive" | "neutral"; size?: number; children?: ReactNode }) {
  return (
    <span aria-hidden className={cx("flex shrink-0 items-center justify-center rounded-pill text-body14 font-bold", TONE_BUBBLE[tone])} style={{ width: size, height: size }}>
      {Icon ? <Icon size={size >= 44 ? 20 : 18} strokeWidth={1.8} /> : children}
    </span>
  );
}

const TONE_CHIP: Record<Tone | "positive" | "neutral", string> = {
  negative: "bg-negative-soft text-negative",
  caution: "bg-caution-soft text-caution",
  info: "bg-accent-soft text-accent-strong",
  positive: "bg-positive-soft text-positive",
  neutral: "bg-chip text-text-secondary",
};

export function Chip({ tone, children, className, wrap }: { tone: Tone | "positive" | "neutral"; children: ReactNode; className?: string; wrap?: boolean }) {
  return <span className={cx("inline-flex items-center gap-t1 rounded-pill px-[10px] py-[3px] text-meta-s font-semibold", wrap ? "whitespace-normal" : "whitespace-nowrap", TONE_CHIP[tone], className)}>{children}</span>;
}

/** Card-shaped placeholder, the same height as the card it stands in for (no layout shift). */
export function CardSkeleton({ height, className, label }: { height: number; className?: string; label?: string }) {
  return (
    <div role={label ? "status" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={cx("animate-pulse rounded-card-s bg-surface p-t5 shadow-card motion-reduce:animate-none sm:rounded-card sm:p-t6", className)} style={{ minHeight: height }}>
      <div className="h-[18px] w-[40%] rounded-pill bg-chip" />
      <div className="mt-t5 h-[14px] w-[80%] rounded-pill bg-chip" />
      <div className="mt-t3 h-[14px] w-[65%] rounded-pill bg-chip" />
    </div>
  );
}
