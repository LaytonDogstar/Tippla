// All budgets (Spending v5, 09/10/2026): where "All budgets" goes now the Budgets tab is inlined as Budget ideas.
import { loadCustomer } from "@/lib/customer";
import { categoryEdits, currentPersona, presentationMode } from "@/lib/persona";
import type { SpendData } from "@/lib/selectors";
import { spending as t } from "@/content/spending";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { BudgetsView } from "./BudgetsView";

export const dynamic = "force-dynamic";

export default async function Budgets({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data } = await loadCustomer(persona);
  const lite: SpendData = { transactions: data.transactions, asOf: data.asOf, derived: data.derived, profile: { data_from: data.profile.data_from } };
  return (
    <PortalShell path="/spending" persona={persona} present={presentationMode(searchParams.present)} wide header={<PageHeader title={t.budgets.pageTitle} />}>
      <BudgetsView persona={persona} data={lite} initialEdits={categoryEdits(persona)} />
    </PortalShell>
  );
}
