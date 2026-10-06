// O5: handle a lower-than-expected number gently, with context and one next step. No confetti, no congratulations.
import { loadPersona } from "@/lib/api/client";
import { currentPersona, presentationMode } from "@/lib/persona";
import { currentCycle, factors, firstAction, loanTotals, payPattern, scoreState, topThreeFactors } from "@/lib/selectors";
import { PortalShell } from "@/components/shell/Portal";
import { RevealView } from "./RevealView";
import { OnboardingStep } from "@/components/analytics/OnboardingStep";
import { ButtonLink } from "@/components/ui/Button";
import { onboarding } from "@/content/onboarding";
import { ahaCopy } from "@/content/firstValue";
import { isOn } from "@/config/featureFlags";

export const dynamic = "force-dynamic";

export default async function ScoreReveal({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data } = await loadPersona(persona, { latencyMs: 0 });
  const totals = loanTotals(data);
  // Spec 04: the score intro sits between the first insight and the goal picker, and stays short (the goal
  // decides the first step, so it isn't shown here).
  const v2 = isOn("onboarding_v2", persona);
  return (
    <PortalShell path="/score" persona={persona} present={presentationMode(searchParams.present)} title={data.profile.first_name}
      backHref={v2 ? "/onboarding/insight" : "/onboarding/connect-bank/done"}
      cta={v2 ? <ButtonLink href="/onboarding/goal" size="standard" full>{ahaCopy.next}</ButtonLink> : <ButtonLink href="/" size="standard" full>{onboarding.reveal.dashboard}</ButtonLink>}>
      <OnboardingStep step="score_reveal" />
      <RevealView
        state={scoreState(data)}
        topFactor={topThreeFactors(data)[0] ?? null}
        allFactors={factors(data)}
        loansOpen={totals.counts.sacc + totals.counts.macc + totals.counts.aocc}
        action={v2 ? null : firstAction(data)}
        cycle={currentCycle(data)}
        pattern={payPattern(data)}
        historyDays={data.profile.data_days}
      />
    </PortalShell>
  );
}
