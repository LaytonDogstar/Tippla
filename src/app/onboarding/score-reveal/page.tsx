// O5: handle a lower-than-expected number gently, with context and one next step. No confetti, no congratulations.
import { loadPersona } from "@/lib/api/client";
import { currentPersona, presentationMode } from "@/lib/persona";
import { currentCycle, factors, firstAction, loanTotals, payPattern, scoreState, topThreeFactors } from "@/lib/selectors";
import { PortalShell } from "@/components/shell/Shells";
import { RevealView } from "./RevealView";
import { ButtonLink } from "@/components/ui/Button";
import { onboarding } from "@/content/onboarding";

export const dynamic = "force-dynamic";

export default async function ScoreReveal({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data } = await loadPersona(persona, { latencyMs: 0 });
  const totals = loanTotals(data);
  return (
    <PortalShell path="/score" persona={persona} present={presentationMode(searchParams.present)} title={data.profile.first_name}
      backHref="/onboarding/connect-bank/done" cta={<ButtonLink href="/" size="standard" full>{onboarding.reveal.dashboard}</ButtonLink>}>
      <RevealView
        state={scoreState(data)}
        topFactor={topThreeFactors(data)[0] ?? null}
        allFactors={factors(data)}
        loansOpen={totals.counts.sacc + totals.counts.macc + totals.counts.aocc}
        action={firstAction(data)}
        cycle={currentCycle(data)}
        pattern={payPattern(data)}
        historyDays={data.profile.data_days}
      />
    </PortalShell>
  );
}
