import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { accountPage as t } from "@/content/account";
import { PortalShell } from "@/components/shell/Shells";
import { BankView } from "../AccountViews";

export const dynamic = "force-dynamic";

export default async function Bank({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data, account } = await loadCustomer(persona);
  const accounts = (data.bankStatement.profiles[0]?.accounts ?? []).map((a) => ({ id: a.id, nickname: a.nickname, last4: a.last4, type: a.type }));
  return (
    <PortalShell path="/account/bank" title={t.bank.title} backHref="/account" persona={persona} present={presentationMode(searchParams.present)}>
      <BankView persona={persona} account={account} accounts={accounts} refreshedAt={data.score?.scoredAt ?? null} />
    </PortalShell>
  );
}
