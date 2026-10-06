"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { goalCopy as g } from "@/content/firstValue";
import type { AccountState, FocusGoalType } from "@/lib/account/state";
import type { PersonaId } from "@/lib/api/types";
import { useAccount } from "@/lib/account/client";
import { track } from "@/lib/analytics/client";
import { OnboardingShell } from "@/components/shell/Shells";
import { Button } from "@/components/ui/Button";
import { GoalPicker, type GoalOption } from "@/components/domain/GoalPicker";

export function GoalStep({ persona, account, asOf, options }: { persona: PersonaId; account: AccountState; asOf: string; options: GoalOption[] }) {
  const router = useRouter();
  const { update } = useAccount(persona, account);
  // Never preselected, even when a goal was saved before (re-running onboarding asks again).
  const [choice, setChoice] = useState<FocusGoalType | null>(null);
  const next = () => {
    if (!choice) return;
    track("goal_selected", { goal_type: choice });
    update((l) => ({ ...l, focusGoal: { type: choice, startedAt: asOf } }));
    router.push("/onboarding/alerts");
  };
  return (
    <OnboardingShell step="goal" backHref="/onboarding/score-reveal" title={g.title}
      footer={<><Button size="standard" full disabled={!choice} onClick={next}>{g.continue}</Button>{!choice && <p className="text-center text-caption text-text-muted">{g.pickOne}</p>}</>}>
      <p className="mt-t2 text-body text-text-muted">{g.intro}</p>
      <div className="mt-t5"><GoalPicker options={options} value={choice} onChange={setChoice} legend={g.title} /></div>
    </OnboardingShell>
  );
}
