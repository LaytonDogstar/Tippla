// O3 (after): "Connected to CBA · Smart Access ••4821", then ask plainly for any other accounts (Q20).
import { currentPersona } from "@/lib/persona";
import { loadPersona } from "@/lib/api/client";
import { ConnectedAccounts } from "./ConnectedAccounts";

export const dynamic = "force-dynamic";

export default async function Done({ searchParams }: { searchParams: { persona?: string } }) {
  const { data } = await loadPersona(currentPersona(searchParams.persona), { latencyMs: 0 });
  const p = data.bankStatement.profiles[0];
  const accounts = (p?.accounts ?? []).map((a) => ({ id: a.id, bank: p!.bank.name, nickname: a.nickname, last4: a.last4 }));
  return <ConnectedAccounts accounts={accounts} />;
}
