// P7 Ways to lift your score: steps ordered by what they'd change (dollars; score points only behind Q3's flag).
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { activePlan, availablePlans, billSwitchCandidates, currentCycle, recommendations, suggestedPlan } from "@/lib/selectors";
import { PlanCard } from "@/components/domain/PlanCard";
import { isOn } from "@/config/featureFlags";
import { BillCompare } from "@/components/domain/BillCompare";
import { recs } from "@/content/recommendations";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { SavingsView } from "./SavingsView";

export const dynamic = "force-dynamic";

export default async function Savings({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data, goal, account } = await loadCustomer(persona);
  // Spec 07: the member's plan (or the one their goal and band suggest), above the single steps.
  const plan = isOn("plans_v1", persona) ? activePlan(data, account, goal) : null;
  return (
    <PortalShell path="/savings" persona={persona} present={presentationMode(searchParams.present)} header={<PageHeader title={recs.pageTitle} sub={recs.pageIntro} />}>
      {plan && <PlanCard persona={persona} account={account} asOf={data.asOf} plan={plan} options={availablePlans(data)} suggested={suggestedPlan(data, goal?.type)} />}
      <SavingsView items={recommendations(data, goal)} cycleKey={`${persona}:${currentCycle(data).start}`} />
      {isOn("bill_switch_v1", persona) && <BillCompare persona={persona} account={account} asOf={data.asOf} bills={billSwitchCandidates(data)} state={data.profile.state} />}
    </PortalShell>
  );
}
