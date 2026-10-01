"use client";
// Component 15b/15c: TextInput, CurrencyInput (integer cents), Checkbox, Toggle, RadioGroup.
// Native controls throughout; red only for validation errors.
import { Check } from "lucide-react";
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { formatCurrencyInput, parseCurrency } from "@/lib/format/currencyInput";
import { ui } from "@/content/components";
import { cx } from "./cx";

function Field({ id, label, helper, error, children }: { id: string; label: string; helper?: string; error?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-small text-text">{label}</label>
      <div className="mt-t2">{children}</div>
      {error ? (
        <p id={`${id}-msg`} className="mt-t2 text-caption text-destructive">{error}</p>
      ) : helper ? (
        <p id={`${id}-msg`} className="mt-t2 text-caption text-text-muted">{helper}</p>
      ) : null}
    </div>
  );
}

const fieldBox = (error?: string, readOnly?: boolean, disabled?: boolean) =>
  cx(
    "flex h-[52px] w-full items-center gap-t2 rounded-sm border px-t4 text-body",
    error ? "border-2 border-destructive" : "border-neutral hover:shadow-[inset_0_0_0_1px_var(--color-neutral)]",
    "focus-within:border-accent focus-within:outline focus-within:outline-[length:var(--focus-width)] focus-within:outline-offset-[var(--focus-offset)] focus-within:outline-focus",
    readOnly || disabled ? "bg-neutral-soft" : "bg-surface",
    disabled && "text-text-muted",
  );

export function TextInput({ label, helper, error, readOnly, disabled, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; helper?: string; error?: string }) {
  const id = useId();
  return (
    <Field id={id} label={label} helper={readOnly && !helper ? ui.readOnly : helper} error={error}>
      <div className={fieldBox(error, readOnly, disabled)}>
        <input
          id={id}
          {...rest}
          readOnly={readOnly}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helper || readOnly ? `${id}-msg` : undefined}
          className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-muted disabled:text-text-muted"
        />
      </div>
    </Field>
  );
}

export function CurrencyInput({ label, helper, valueCents, onChangeCents, errorText, disabled }: {
  label: string; helper?: string; valueCents: number | null; onChangeCents: (c: number | null) => void;
  /** Messages for parse failures, from content. */
  errorText: { format: string; precision: string; negative: string };
  disabled?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(valueCents === null ? "" : formatCurrencyInput(valueCents));
  const [error, setError] = useState<string | undefined>();
  return (
    <Field id={id} label={label} helper={helper} error={error}>
      <div className={fieldBox(error, false, disabled)}>
        <span aria-hidden className="text-body text-text-muted">$</span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={text}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helper ? `${id}-msg` : undefined}
          onChange={(e) => {
            setText(e.target.value);
            const r = parseCurrency(e.target.value);
            if (r.ok) { onChangeCents(r.cents); if (error) setError(undefined); }
          }}
          onBlur={() => {
            const r = parseCurrency(text);
            if (!r.ok) setError(errorText[r.reason]);
            else { setError(undefined); setText(r.cents === null ? "" : formatCurrencyInput(r.cents)); }
          }}
          className="tnum min-w-0 flex-1 bg-transparent text-text outline-none disabled:text-text-muted"
        />
        <span aria-hidden className="text-caption text-text-muted">AUD</span>
      </div>
    </Field>
  );
}

const rowCls = "flex min-h-tap cursor-pointer items-center gap-t3 rounded-sm px-t1 hover:bg-surface2 has-[:focus-visible]:outline has-[:focus-visible]:outline-[length:var(--focus-width)] has-[:focus-visible]:outline-offset-[var(--focus-offset)] has-[:focus-visible]:outline-focus has-[:disabled]:cursor-not-allowed has-[:disabled]:hover:bg-transparent";

export function Checkbox({ label, helper, checked, onChange, disabled, error }: { label: ReactNode; helper?: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; error?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={cx(rowCls, error && "shadow-[inset_0_0_0_2px_var(--color-destructive)]")}>
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : helper ? `${id}-help` : undefined} />
        <span aria-hidden className={cx(
          "inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-xs border-2",
          disabled ? (checked ? "border-neutral bg-neutral text-surface" : "border-neutral bg-neutral-soft") : checked ? "border-accent bg-accent text-on-accent" : "border-neutral bg-surface",
        )}>{checked && <Check size={16} strokeWidth={3} />}</span>
        <span className={cx("text-small", disabled ? "text-text-muted" : "text-text")}>{label}</span>
      </label>
      {helper && !error && <div id={`${id}-help`} className="ml-[36px] text-caption text-text-muted">{helper}</div>}
      {error && <p id={`${id}-err`} className="ml-[36px] text-caption text-destructive">{error}</p>}
    </div>
  );
}

export function Toggle({ label, checked, onChange, disabled, saving, failed }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; saving?: boolean; failed?: boolean }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={rowCls}>
        <span className="flex-1 text-small text-text">{label}</span>
        <input id={id} type="checkbox" role="switch" aria-checked={checked} className="sr-only" checked={checked} disabled={disabled || saving}
          aria-describedby={saving || failed ? `${id}-st` : undefined} onChange={(e) => onChange(e.target.checked)} />
        <span aria-hidden className={cx(
          "relative inline-block h-[24px] w-[44px] shrink-0 rounded-pill transition-colors duration-fast ease-tippla",
          disabled ? "bg-neutral-soft border-2 border-neutral" : checked ? "bg-accent" : "border-2 border-neutral bg-surface",
        )}>
          <span className={cx(
            "absolute top-1/2 h-[16px] w-[16px] -translate-y-1/2 rounded-pill transition-[left] duration-fast ease-tippla",
            checked ? "left-[24px]" : "left-[2px]",
            disabled ? "bg-neutral" : checked ? "bg-on-accent" : "bg-neutral",
          )} />
        </span>
      </label>
      {(saving || failed) && <p id={`${id}-st`} className="px-t1 text-caption text-text-muted">{saving ? ui.saving : ui.saveFailed}</p>}
    </div>
  );
}

export function RadioGroup<T extends string>({ legend, options, value, onChange, disabled }: {
  legend: string; options: { value: T; label: string }[]; value: T | null; onChange: (v: T) => void; disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-t2 text-body-strong text-text">{legend}</legend>
      <div className="flex flex-col gap-t2">
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label key={o.value} className={rowCls}>
              <input type="radio" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="sr-only" />
              <span aria-hidden className={cx("inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-pill border-2",
                disabled ? "border-neutral bg-neutral-soft" : checked ? "border-accent bg-surface" : "border-neutral bg-surface")}>
                {checked && <span className={cx("h-[10px] w-[10px] rounded-pill", disabled ? "bg-neutral" : "bg-accent")} />}
              </span>
              <span className={cx("text-small", disabled ? "text-text-muted" : "text-text")}>{o.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Native select (best on mobile: the platform picker). Used for recategorising. */
export function SelectInput<T extends string>({ label, value, options, onChange, hideLabel, disabled }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; hideLabel?: boolean; disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "block text-small text-text"}>{label}</label>
      <div className={cx(fieldBox(undefined, false, disabled), "relative px-0", !hideLabel && "mt-t2")}>
        <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as T)}
          className="h-full w-full cursor-pointer appearance-none rounded-sm bg-transparent pl-t4 pr-t8 text-body text-text outline-none">
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-t3 text-text-muted"><path d="m6 9 6 6 6-6" /></svg>
      </div>
    </div>
  );
}
