// P7 Ways to lift your score: steps ordered by what they'd change (dollars; score points only behind Q3's flag).
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { currentCycle, recommendations } from "@/lib/selectors";
import { recs } from "@/content/recommendations";
import { PageHeader, PortalShell } from "@/components/shell/Shells";
import { SavingsView } from "./SavingsView";

export const dynamic = "force-dynamic";

export default async function Savings({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data } = await loadCustomer(persona);
  return (
    <PortalShell path="/savings" persona={persona} present={presentationMode(searchParams.present)} header={<PageHeader title={recs.pageTitle} sub={recs.pageIntro} />}>
      <SavingsView items={recommendations(data)} cycleKey={`${persona}:${currentCycle(data).start}`} />
    </PortalShell>
  );
}
