// P3 Spending. The server loads the persona and sends the client only what the spending selectors need
// (transactions, pay cycle, bills, subscriptions), so every chip, filter and recategorisation recomputes
// instantly through the same selectors — and the server-rendered Home agrees via the edits cookie.
import { loadPersona } from "@/lib/api/client";
import { categoryEdits, currentPersona, presentationMode } from "@/lib/persona";
import { gamblingInsight, payCycleSummary, type SpendData } from "@/lib/selectors";
import { formatUpdated } from "@/lib/format";
import { spending as t } from "@/content/spending";
import { PageHeader, PortalShell } from "@/components/shell/Shells";
import { SpendingSearchButton, SpendingView, type SpendingParams } from "./SpendingView";

export const dynamic = "force-dynamic";

type Search = { persona?: string; present?: string; tab?: string; period?: string; month?: string; category?: string; direction?: string; q?: string };

export default async function Spending({ searchParams }: { searchParams: Search }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data } = await loadPersona(persona);
  const lite: SpendData = {
    transactions: data.transactions,
    asOf: data.asOf,
    derived: data.derived,
    profile: { data_from: data.profile.data_from },
  };
  const g = gamblingInsight(data);
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
      />
    </PortalShell>
  );
}
