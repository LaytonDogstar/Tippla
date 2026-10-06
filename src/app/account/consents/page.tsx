import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { accountPage as t } from "@/content/account";
import { PortalShell } from "@/components/shell/Portal";
import { ConsentsView } from "../AccountViews";

export const dynamic = "force-dynamic";

export default async function Consents({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data, account } = await loadCustomer(persona);
  return (
    <PortalShell path="/account/consents" title={t.consents.title} backHref="/account" persona={persona} present={presentationMode(searchParams.present)}>
      <ConsentsView persona={persona} account={account} consents={data.consents} asOf={data.asOf} />
    </PortalShell>
  );
}
