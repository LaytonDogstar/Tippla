// P4 Spending comparison: context, not a league table. Default tab: you vs your last 3 pay cycles.
// The cohort tab is sample data (Q6): no percentiles, no rankings, gambling excluded.
import { loadCustomer } from "@/lib/customer";
import { categoryEdits, currentPersona, presentationMode } from "@/lib/persona";
import { compareWithHistory, sampleCohort } from "@/lib/selectors";
import { compare as t } from "@/content/spending";
import { PortalShell } from "@/components/shell/Shells";
import { CompareView } from "./CompareView";

export const dynamic = "force-dynamic";

export default async function Compare({ searchParams }: { searchParams: { persona?: string; present?: string; tab?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data } = await loadCustomer(persona);
  const edits = categoryEdits(persona);
  return (
    <PortalShell path="/spending/compare" title={t.title} backHref="/spending" persona={persona} present={present}>
      <CompareView present={present} initialTab={searchParams.tab === "cohort" ? "cohort" : "history"}
        history={compareWithHistory(data, edits)} cohort={sampleCohort(data, edits)} />
    </PortalShell>
  );
}
