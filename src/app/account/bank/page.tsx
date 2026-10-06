import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { accountPage as t } from "@/content/account";
import { PortalShell } from "@/components/shell/Portal";
import { BankView } from "../AccountViews";
import { isOn } from "@/config/featureFlags";
import { connectionHealth, consentReminders, possibleUnconnectedTransfers } from "@/lib/selectors";

export const dynamic = "force-dynamic";

export default async function Bank({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data, account, states } = await loadCustomer(persona);
  // Spec 05: connection status and consent end, and a prompt when money goes to an unconnected own account.
  const health = isOn("connection_health_v1", persona) ? connectionHealth(data, account, states) : null;
  const reminders = health?.status === "expiring" && health.consentEndsOn ? consentReminders(health.consentEndsOn).filter((r) => r.date >= data.asOf).map((r) => r.date) : [];
  const unconnected = health ? possibleUnconnectedTransfers(data.transactions).length : 0;
  const accounts = (data.bankStatement.profiles[0]?.accounts ?? []).map((a) => ({ id: a.id, nickname: a.nickname, last4: a.last4, type: a.type }));
  return (
    <PortalShell path="/account/bank" title={t.bank.title} backHref="/account" persona={persona} present={presentationMode(searchParams.present)}>
      <BankView persona={persona} account={account} accounts={accounts} refreshedAt={data.score?.scoredAt ?? null} health={health} unconnected={unconnected} reminders={reminders} />
    </PortalShell>
  );
}
