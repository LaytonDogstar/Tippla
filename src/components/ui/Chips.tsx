"use client";
// Component 10: period Chip (single choice, check when selected), FilterChip (removable constraint),
// SegmentedControl (native radio group styled as segments).
import { Check, X } from "lucide-react";
import { useId, type ReactNode } from "react";
import { ui } from "@/content/components";
import { cx } from "./cx";

export function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return <div role="group" aria-label={label} className="flex flex-wrap gap-t2">{children}</div>;
}

export function Chip({ selected, disabled, onClick, children }: { selected?: boolean; disabled?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex h-tap min-w-tap items-center gap-t2 rounded-pill border px-t3 text-small transition-colors duration-fast ease-tippla",
        selected
          ? "border-accent bg-accent-soft text-accent active:shadow-[inset_0_0_0_2px_var(--color-accent)]"
          : "border-neutral bg-surface text-text hover:bg-surface2",
        "disabled:border-neutral disabled:bg-neutral-soft disabled:text-text-muted",
      )}
    >
      {selected && <Check aria-hidden size={16} />}
      {children}
    </button>
  );
}

export function FilterChip({ label, onRemove, disabled }: { label: string; onRemove: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      disabled={disabled}
      aria-label={ui.removeFilter(label)}
      className={cx(
        "inline-flex h-tap items-center gap-t2 rounded-pill border border-accent bg-accent-soft px-t3 text-small text-accent",
        "hover:shadow-[inset_0_0_0_2px_var(--color-accent)] disabled:border-neutral disabled:bg-neutral-soft disabled:text-text-muted",
      )}
    >
      <span>{label}</span>
      <X aria-hidden size={16} />
    </button>
  );
}

export interface SegmentOption<T extends string> { value: T; label: string; disabled?: boolean }

export function SegmentedControl<T extends string>({ label, options, value, onChange, disabled }: {
  label: string; options: SegmentOption<T>[]; value: T; onChange: (v: T) => void; disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="sr-only">{label}</legend>
      <div className="flex h-[52px] gap-t1 rounded-md bg-surface2 p-t1">
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value}
              className={cx(
                "relative flex min-w-tap flex-1 cursor-pointer items-center justify-center rounded-sm px-t2 text-small transition-colors duration-fast ease-tippla",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-[length:var(--focus-width)] has-[:focus-visible]:outline-offset-[var(--focus-offset)] has-[:focus-visible]:outline-focus",
                checked ? "bg-accent text-on-accent" : "text-text-muted hover:bg-neutral-soft",
                disabled && (checked ? "bg-neutral-soft text-text-muted shadow-[inset_0_0_0_2px_var(--color-neutral)]" : "text-text-muted"),
              )}
            >
              <input
                type="radio"
                className="sr-only"
                name={name}
                value={o.value}
                checked={checked}
                disabled={o.disabled}
                onChange={() => onChange(o.value)}
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
