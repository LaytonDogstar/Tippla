"use client";
// Spec 04: the member's goal on Today, with Change (a sheet with the same picker as onboarding).
import { Target } from "lucide-react";
import { useState } from "react";
import { goalCopy as g } from "@/content/firstValue";
import type { AccountState } from "@/lib/account/state";
import type { PersonaId } from "@/lib/api/types";
import { useAccount } from "@/lib/account/client";
import { track } from "@/lib/analytics/client";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Feedback";
import { GoalPicker, type GoalOption } from "./GoalPicker";

/** `inline`: a line inside Today's plan card (redesign 07/10/2026) rather than a card of its own. */
export function GoalRow({ persona, account, asOf, goal, options, inline }: { persona: PersonaId; account: AccountState; asOf: string; goal: GoalOption | null; options: GoalOption[]; inline?: boolean }) {
  const { update } = useAccount(persona, account);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(goal?.type ?? null);
  const save = () => {
    if (!choice) return;
    track("goal_selected", { goal_type: choice });
    update((l) => ({ ...l, focusGoal: { type: choice, startedAt: asOf } }));
    setOpen(false);
    toast({ kind: "confirm", message: g.saved });
  };
  const openSheet = () => { setChoice(goal?.type ?? null); setOpen(true); };
  const sheet = (
    <Sheet open={open} onClose={() => setOpen(false)} title={g.changeTitle} subtitle={g.intro}
        footer={<Button full disabled={!choice || choice === goal?.type} onClick={save}>{g.save}</Button>}>
        <GoalPicker options={options} value={choice} onChange={setChoice} legend={g.changeTitle} />
    </Sheet>
  );
  if (inline) {
    // Inside Today's plan card: one pill button when there's no goal; the goal and a small Change when there is.
    return (
      <section aria-label={g.heading} className="flex min-h-tap flex-wrap items-center gap-x-t3 gap-y-t1">
        {goal ? (
          <>
            <p className="flex min-w-0 flex-1 items-center gap-t2 text-meta font-semibold text-text-secondary"><Target aria-hidden size={16} className="shrink-0 text-accent" />{g.home(goal.label)}</p>
            <button type="button" onClick={openSheet} aria-label={`${g.change}: ${g.heading}`}
              className="inline-flex min-h-tap items-center rounded-pill px-t3 text-meta font-semibold text-accent hover:bg-surface">{g.change}</button>
          </>
        ) : (
          <button type="button" onClick={openSheet}
            className="pressable inline-flex min-h-tap items-center gap-t2 rounded-pill bg-surface px-t4 text-meta font-semibold text-accent shadow-card hover:text-accent-strong">
            <Target aria-hidden size={16} className="shrink-0" />{g.none}
          </button>
        )}
        {sheet}
      </section>
    );
  }
  return (
    <section aria-label={g.heading} className="flex min-h-tap items-center gap-t3 rounded-lg bg-surface px-t4 py-t2">
      <Target aria-hidden size={20} className="shrink-0 text-accent" />
      <p className="min-w-0 flex-1 text-small text-text">{goal ? g.home(goal.label) : g.none}</p>
      <Button variant="tertiary" onClick={openSheet} aria-label={goal ? `${g.change}: ${g.heading}` : g.none}>{goal ? g.change : g.none}</Button>
      {sheet}
    </section>
  );
}
