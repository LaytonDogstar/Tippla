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
        "inline-flex min-h-tap min-w-tap items-center py-t1 gap-t2 rounded-pill border px-t4 text-body14 font-semibold transition-colors duration-fast ease-tippla",
        selected
          ? "border-accent bg-accent-soft text-accent-strong active:shadow-[inset_0_0_0_2px_var(--color-accent)]"
          : "border-transparent bg-surface text-text-secondary shadow-card hover:text-text",
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
        "inline-flex min-h-tap items-center gap-t2 rounded-pill border border-accent py-t1 bg-accent-soft px-t3 text-small text-accent",
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
  /** null: no option selected (e.g. a filter that the options don't describe is applied). */
  label: string; options: SegmentOption<T>[]; value: T | null; onChange: (v: T) => void; disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="sr-only">{label}</legend>
      {/* Each option's label fills its share of the track, padding included, so a tap anywhere on the control picks
          the nearest option (no dead gaps or edges). The visible pill is the inner span. */}
      <div className="flex min-h-[52px] rounded-pill bg-chip">
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label key={o.value} className={cx("flex min-w-tap flex-auto p-t1", disabled || o.disabled ? "cursor-default" : "cursor-pointer")}>
              <input
                type="radio"
                className="peer sr-only"
                name={name}
                value={o.value}
                checked={checked}
                disabled={o.disabled}
                onChange={() => onChange(o.value)}
              />
              <span
                className={cx(
                  "flex w-full items-center justify-center rounded-pill px-t2 text-center text-body14 font-semibold transition-colors duration-fast ease-tippla",
                  "peer-focus-visible:outline peer-focus-visible:outline-[length:var(--focus-width)] peer-focus-visible:outline-offset-[var(--focus-offset)] peer-focus-visible:outline-focus",
                  checked ? "bg-surface font-bold text-accent-strong shadow-[0_1px_3px_rgba(20,22,60,0.12),inset_0_0_0_1.5px_var(--color-accent)]" : "text-text-secondary hover:text-text",
                  disabled && (checked ? "bg-neutral-soft text-text-muted shadow-[inset_0_0_0_2px_var(--color-neutral)]" : "text-text-muted"),
                )}
              >
                {o.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
