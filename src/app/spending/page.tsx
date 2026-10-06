// P3 Spending. The server loads the persona and sends the client only what the spending selectors need
// (transactions, pay cycle, bills, subscriptions), so every chip, filter and recategorisation recomputes
// instantly through the same selectors — and the server-rendered Home agrees via the edits cookie.
import { loadCustomer } from "@/lib/customer";
import { categoryEdits, currentPersona, presentationMode } from "@/lib/persona";
import { gamblingInsight, payCycleSummary, type SpendData } from "@/lib/selectors";
import { formatUpdated } from "@/lib/format";
import { spending as t } from "@/content/spending";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { SpendingSearchButton, SpendingView, type SpendingParams } from "./SpendingView";

export const dynamic = "force-dynamic";

import { isOn } from "@/config/featureFlags";

type Search = { persona?: string; present?: string; tab?: string; period?: string; month?: string; category?: string; direction?: string; q?: string };

export default async function Spending({ searchParams }: { searchParams: Search }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data, account } = await loadCustomer(persona);
  const lite: SpendData = {
    transactions: data.transactions,
    asOf: data.asOf,
    derived: data.derived,
    profile: { data_from: data.profile.data_from },
  };
  // Hidden by the member (spec 01): no gambling insight on Spending.
  const g = account.hideGambling ? null : gamblingInsight(data);
  const accounts = (data.bankStatement.profiles[0]?.accounts ?? []).map((a) => ({ id: a.id, label: `${a.nickname} ··${a.last4}` }));
  const params: SpendingParams = {
    tab: searchParams.tab, period: searchParams.period, month: searchParams.month,
    category: searchParams.category, direction: searchParams.direction, q: searchParams.q,
  };
  return (
    <PortalShell path="/spending" persona={persona} present={present}
      header={<PageHeader title={t.title} sub={data.score?.scoredAt ? formatUpdated(data.score.scoredAt) : undefined} action={<SpendingSearchButton />} />}>
      <SpendingView
        persona={persona}
        present={present}
        data={lite}
        initialEdits={categoryEdits(persona)}
        payCycle={payCycleSummary(data)}
        gambling={g ? { pctOfIncome90: g.pctOfIncome90, factor: g.factor } : null}
        accounts={accounts.length > 1 ? accounts : []}
        params={params}
        asOf={data.asOf}
        corrections={isOn("corrections_v1", persona) ? { oneOff: data.memberRules?.oneOffIncome ?? [], regular: data.memberRules?.regularIncome ?? [] } : null}
      />
    </PortalShell>
  );
}
