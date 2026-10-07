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
  return (
    <section aria-label={g.heading} className={inline ? "flex min-h-tap items-center gap-t2" : "flex min-h-tap items-center gap-t3 rounded-lg bg-surface px-t4 py-t2"}>
      <Target aria-hidden size={inline ? 16 : 20} className="shrink-0 text-accent" />
      <p className={inline ? "min-w-0 flex-1 text-meta font-semibold text-text-secondary" : "min-w-0 flex-1 text-small text-text"}>{goal ? g.home(goal.label) : g.none}</p>
      <Button variant="tertiary" onClick={() => { setChoice(goal?.type ?? null); setOpen(true); }} aria-label={goal ? `${g.change}: ${g.heading}` : g.none}>{goal ? g.change : g.none}</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={g.changeTitle} subtitle={g.intro}
        footer={<Button full disabled={!choice || choice === goal?.type} onClick={save}>{g.save}</Button>}>
        <GoalPicker options={options} value={choice} onChange={setChoice} legend={g.changeTitle} />
      </Sheet>
    </section>
  );
}
