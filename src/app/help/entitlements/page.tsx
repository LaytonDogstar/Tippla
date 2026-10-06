// Spec 06 §4 entitlements check (flag entitlements_v1, gate G3): optional questions → official pointers.
import { redirect } from "next/navigation";
import { isOn } from "@/config/featureFlags";
import { BILL_MERCHANTS } from "@/data/directories";
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { payAdvanceRun } from "@/lib/selectors";
import { entitlementsCopy as t } from "@/content/actions";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { EntitlementsCheck } from "./EntitlementsCheck";

export const dynamic = "force-dynamic";

export default async function Entitlements({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  if (!isOn("entitlements_v1", persona)) redirect("/help");
  const { data, account } = await loadCustomer(persona);
  const hasEnergyBill = data.derived.upcoming_bills.some((b) => BILL_MERCHANTS[b.merchant] === "energy");
  return (
    <PortalShell path="/help/entitlements" backHref="/help" persona={persona} present={presentationMode(searchParams.present)} header={<PageHeader title={t.title} sub={t.general} />}>
      <EntitlementsCheck persona={persona} account={account} asOf={data.asOf} context={{ state: data.profile.state, hasEnergyBill, usesPayAdvances: !!payAdvanceRun(data) }} />
    </PortalShell>
  );
}
