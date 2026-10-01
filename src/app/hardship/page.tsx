// P11 Hardship support: relief, not embarrassment. Every option is optional; nothing here tells a lender.
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { activeLoans, otherCredit } from "@/lib/selectors";
import { hardshipPage as t } from "@/content/account";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { HardshipInfoButton, HardshipView } from "./HardshipView";

export const dynamic = "force-dynamic";

export default async function Hardship({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data, account } = await loadCustomer(persona);
  const lenders = [...activeLoans(data).map((l) => l.provider), ...otherCredit(data).map((o) => o.provider)];
  return (
    <PortalShell path="/hardship" persona={persona} present={present} header={<PageHeader title={t.title} sub={t.sub} action={<HardshipInfoButton />} />}>
      <HardshipView persona={persona} account={account} present={present} lenders={[...new Set(lenders)]} />
    </PortalShell>
  );
}
