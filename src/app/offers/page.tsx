// P10 Loan offers: only with lender-matching consent; otherwise an explainer. Informational and comparable,
// never urgent, never "pre-approved" (docs/08).
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { lenderMatchingOn, payCycleSummary, visibleOffers } from "@/lib/selectors";
import { STAGES } from "@/config/stages";
import { formatUpdated } from "@/lib/format";
import { offersPage as t } from "@/content/account";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { OffersView } from "./OffersView";

export const dynamic = "force-dynamic";

export default async function Offers({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data, account, edits } = await loadCustomer(persona);
  // Guardrail context for analytics: offers should never reach someone short before payday or in hardship.
  const score = data.score?.score ?? null;
  const guard = {
    had_shortfall: payCycleSummary(data, edits).isShort,
    in_hardship: !!account.hardshipSelfSelected,
    band: score === null ? "none" as const : STAGES.find((s) => score >= s.min && score <= s.max)?.id ?? "none" as const,
  };
  return (
    <PortalShell path="/offers" persona={persona} present={presentationMode(searchParams.present)}
      header={<PageHeader title={t.title} sub={data.score?.scoredAt ? formatUpdated(data.score.scoredAt) : undefined} />}>
      <OffersView persona={persona} account={account} matching={lenderMatchingOn(data)} offers={visibleOffers(data)} guard={guard} />
    </PortalShell>
  );
}
