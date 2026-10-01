// P10 Loan offers: only with lender-matching consent; otherwise an explainer. Informational and comparable,
// never urgent, never "pre-approved" (docs/08).
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { lenderMatchingOn, visibleOffers } from "@/lib/selectors";
import { formatUpdated } from "@/lib/format";
import { offersPage as t } from "@/content/account";
import { PageHeader, PortalShell } from "@/components/shell/Shells";
import { OffersView } from "./OffersView";

export const dynamic = "force-dynamic";

export default async function Offers({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data, account } = await loadCustomer(persona);
  return (
    <PortalShell path="/offers" persona={persona} present={presentationMode(searchParams.present)}
      header={<PageHeader title={t.title} sub={data.score?.scoredAt ? formatUpdated(data.score.scoredAt) : undefined} />}>
      <OffersView persona={persona} account={account} matching={lenderMatchingOn(data)} offers={visibleOffers(data)} />
    </PortalShell>
  );
}
