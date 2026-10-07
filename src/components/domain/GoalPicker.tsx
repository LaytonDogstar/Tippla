"use client";
// Spec 04 goal picker: one choice, nothing preselected, changeable later. Used in onboarding and on Today.
// The gambling option appears only when gambling transactions are detected, last, with a privacy note.
import { useState } from "react";
import { goalCopy as g } from "@/content/firstValue";
import type { FocusGoalType } from "@/lib/account/state";
import { cx } from "@/components/ui/cx";

export interface GoalOption { type: FocusGoalType; label: string }

export function GoalPicker({ options, value, onChange, legend }: { options: GoalOption[]; value: FocusGoalType | null; onChange: (t: FocusGoalType) => void; legend: string }) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="flex flex-col gap-t2">
        {options.map((o) => (
          <div key={o.type} className={cx("rounded-md border", value === o.type ? "border-accent bg-accent-soft" : "border-divider bg-surface")}>
            <label className="flex min-h-tap cursor-pointer items-center gap-t3 p-t4">
              <input type="radio" name="focus-goal" value={o.type} checked={value === o.type} onChange={() => onChange(o.type)}
                aria-describedby={o.type === "gambling_less" ? "goal-gambling-note" : undefined} className="h-[20px] w-[20px] shrink-0 accent-[var(--color-accent)]" />
              <span className="flex-1 text-body text-text">{o.label}</span>
            </label>
            {o.type === "gambling_less" && <p id="goal-gambling-note" className="-mt-t3 px-t4 pb-t3 pl-[52px] text-caption text-text-muted">{g.gamblingNote}</p>}
          </div>
        ))}
      </div>
    </fieldset>
  );
}

/** Local selection state for a picker that saves on a separate button. */
export function useGoalChoice(initial: FocusGoalType | null) {
  return useState<FocusGoalType | null>(initial);
}
