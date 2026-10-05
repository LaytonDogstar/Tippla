// Progress and goals (Phase 3 of the loop): is it working? The last six pay cycles, positive streaks, the
// SmartScore with the things the customer did, the value tally, and one optional buffer goal.
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { DEFAULT_GOAL_OPTION, goalDateOptions, goalPlan, progress, safeToSpend } from "@/lib/selectors";
import { progressCopy as t } from "@/content/progress";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { ProgressView } from "./ProgressView";

export const dynamic = "force-dynamic";

export default async function Progress({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data, account, edits } = await loadCustomer(persona);
  const plan = goalPlan(data, account.goal);
  return (
    <PortalShell path="/progress" persona={persona} present={present} header={<PageHeader title={t.title} sub={t.sub} />}>
      <ProgressView persona={persona} account={account} present={present} asOf={data.asOf}
        progress={progress(data, account, edits)} plan={plan} safe={safeToSpend(data, { goal: plan?.thisCycle ?? 0 })}
        options={goalDateOptions(data)} defaultOption={DEFAULT_GOAL_OPTION} nextPayday={data.derived.pay_cycle.next_payday} />
    </PortalShell>
  );
}
