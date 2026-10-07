// Progress and goals (Phase 3 of the loop): is it working? The last six pay cycles, positive streaks, the
// SmartScore with the things the customer did, the value tally, and one optional buffer goal.
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { savingsGoalLimit, savingsGoalStatus, DEFAULT_GOAL_OPTION, goalDateOptions, goalPlan, progress, safeToSpendFor } from "@/lib/selectors";
import { progressCopy as t } from "@/content/progress";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { ProgressView } from "./ProgressView";
import { isOn } from "@/config/featureFlags";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SavingsGoals } from "@/components/domain/SavingsGoals";
import { whatsNextCopy } from "@/content/plans";

export const dynamic = "force-dynamic";

export default async function Progress({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data, account, edits } = await loadCustomer(persona);
  const plan = goalPlan(data, account.goal);
  return (
    <PortalShell path="/progress" persona={persona} present={present} header={<PageHeader title={t.title} sub={t.sub} />}>
      <ProgressView persona={persona} account={account} present={present} asOf={data.asOf}
        progress={(() => { const pr = progress(data, account, edits); return isOn("streaks_v1", persona) ? pr : { ...pr, streaks: [] }; })()} plan={plan} safe={safeToSpendFor(data, account)}
        options={goalDateOptions(data)} defaultOption={DEFAULT_GOAL_OPTION} nextPayday={data.derived.pay_cycle.next_payday} />
      {isOn("savings_goals_v1", persona) && (
        <SavingsGoals persona={persona} account={account} asOf={data.asOf} goals={(account.savingsGoals ?? []).map((g) => savingsGoalStatus(data, g))} limit={savingsGoalLimit(data)}
          savingsAccounts={(data.bankStatement.profiles[0]?.accounts ?? []).filter((a) => a.type === "Savings").map((a) => ({ id: a.id, label: `${a.nickname} ··${a.last4}` }))} />
      )}
      {isOn("streaks_v1", persona) && <Link href="/progress/whats-next" className="mt-t3 flex min-h-tap items-center justify-between rounded-card-s bg-surface shadow-card sm:rounded-card p-t4 text-body-strong text-accent hover:bg-surface2">{whatsNextCopy.title}<ChevronRight aria-hidden size={20} /></Link>}
    </PortalShell>
  );
}
