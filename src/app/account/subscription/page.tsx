import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { billing } from "@/lib/selectors";
import { accountPage as t } from "@/content/account";
import { PortalShell } from "@/components/shell/Shells";
import { SubscriptionView } from "../AccountViews";

export const dynamic = "force-dynamic";

export default async function Subscription({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data, account } = await loadCustomer(persona);
  return (
    <PortalShell path="/account/subscription" title={t.subscription.title} backHref="/account" persona={persona} present={present}>
      <SubscriptionView persona={persona} present={present} account={account} billing={billing(data, account)} asOf={data.asOf} />
    </PortalShell>
  );
}
