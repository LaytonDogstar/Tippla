"use client";
// Component 15a. Sizes: compact 44, standard 48, large 56. No opacity fades; disabled uses neutral tokens.
import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { LoaderCircle, type LucideIcon } from "lucide-react";
import { buttons } from "@/content/components";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive";
export type ButtonSize = "compact" | "standard" | "large";

const base =
  "inline-flex items-center justify-center gap-t2 rounded-pill text-body-strong min-w-tap select-none " +
  "transition-[box-shadow,background-color] duration-fast ease-tippla text-center";
const sizes: Record<ButtonSize, string> = {
  compact: "min-h-[44px] px-t3",
  standard: "min-h-[48px] px-t4",
  large: "min-h-[56px] px-t5",
};
const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-on-accent hover:shadow-[inset_0_0_0_2px_var(--color-on-accent)] active:shadow-[inset_0_0_0_2px_var(--color-on-accent),inset_0_-2px_0_0_var(--color-on-accent)]",
  // Outline: secondary actions never compete with the one solid main action on a screen (UX round 2, 3.3).
  secondary:
    "bg-surface text-accent shadow-[inset_0_0_0_1.5px_var(--color-accent)] hover:bg-accent-soft active:shadow-[inset_0_0_0_2px_var(--color-accent)]",
  tertiary: "bg-transparent text-accent hover:bg-surface2 active:bg-surface2 active:shadow-[inset_0_-2px_0_0_var(--color-accent)]",
  destructive:
    "bg-destructive text-text-inverse hover:shadow-[inset_0_0_0_2px_var(--color-text-inverse)] active:shadow-[inset_0_0_0_2px_var(--color-text-inverse),inset_0_-2px_0_0_var(--color-text-inverse)]",
};
const disabledCls = "disabled:bg-neutral-soft disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
  loadingLabel?: string;
  full?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "compact", icon: Icon, loading, loadingLabel, full, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={loading ? undefined : rest.onClick}
      className={cx(base, sizes[size], variants[variant], disabledCls, full && "w-full", className)}
    >
      {loading ? <LoaderCircle aria-hidden size={16} className="motion-safe:animate-spin" /> : Icon ? <Icon aria-hidden size={20} /> : null}
      <span>{loading ? loadingLabel ?? buttons.loading : children}</span>
    </button>
  );
});

export function ButtonLink({ href, variant = "primary", size = "compact", full, className, children, onClick }: {
  href: string; variant?: ButtonVariant; size?: ButtonSize; full?: boolean; className?: string; children: ReactNode; onClick?: () => void;
}) {
  return <Link href={href} onClick={onClick} className={cx(base, sizes[size], variants[variant], full && "w-full", className)}>{children}</Link>;
}
