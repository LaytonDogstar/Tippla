// Spec 05: one-tap reconnect / re-consent that returns the member to where they were.
import { loadCustomer } from "@/lib/customer";
import { currentPersona } from "@/lib/persona";
import { connectionHealth } from "@/lib/selectors";
import { ReconnectFlow } from "./ReconnectFlow";

export const dynamic = "force-dynamic";

/** Only same-site paths: never an open redirect. */
const safeReturn = (v?: string) => (v && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\\\") ? v : "/");

export default async function Reconnect({ searchParams }: { searchParams: { persona?: string; return?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data, account, states } = await loadCustomer(persona);
  const health = connectionHealth(data, account, states);
  return <ReconnectFlow persona={persona} account={account} asOf={data.asOf} bank={data.bankStatement.profiles[0]?.bank.name ?? "your bank"}
    from={health.status} returnTo={safeReturn(searchParams.return)} />;
}
