// P3 Spending (v5, single column, 09/10/2026). The server loads the persona and sends the client only what the
// spending selectors need, so the period, filters and recategorising recompute instantly through the same
// selectors Today uses (and the server-rendered Today agrees via the edits cookie). Header as on Today.
import { loadCustomer } from "@/lib/customer";
import { categoryEdits, currentPersona, presentationMode } from "@/lib/persona";
import { gamblingInsight, notifications, payCycleSummary, unreadCount, type SpendData } from "@/lib/selectors";
import { formatUpdated } from "@/lib/format";
import { duplicateCharge } from "@/lib/feed/rules/duplicateCharge";
import { isOn } from "@/config/featureFlags";
import { spending as t } from "@/content/spending";
import { PortalShell } from "@/components/shell/Portal";
import { TodayHeader } from "@/components/today/TodayHeader";
import { SpendingView, type SpendingParams } from "./SpendingView";

export const dynamic = "force-dynamic";

type Search = { persona?: string; present?: string; tab?: string; period?: string; month?: string; category?: string; direction?: string; q?: string };

export default async function Spending({ searchParams }: { searchParams: Search }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data, account } = await loadCustomer(persona);
  const lite: SpendData = { transactions: data.transactions, asOf: data.asOf, derived: data.derived, profile: { data_from: data.profile.data_from } };
  // Transactions the duplicate-charge rule flags (the same check as Needs a look), tagged in Activity.
  const doubles = Object.fromEntries(duplicateCharge({ d: data, edits: categoryEdits(persona), account }).flatMap((i) => (i.transactionIds ?? []).map((id) => [id, i.id])));
  const params: SpendingParams = { period: searchParams.period, month: searchParams.month, category: searchParams.category, direction: searchParams.direction, q: searchParams.q };
  return (
    <PortalShell path="/spending" persona={persona} present={present} wide
      header={<TodayHeader title={t.title} sub={data.score?.scoredAt ? formatUpdated(data.score.scoredAt) : ""} unread={unreadCount(notifications(data, account))}
        ask={isOn("assistant_v1", persona) ? { placeholder: t.v5.askPlaceholder } : null} />}>
      <SpendingView
        persona={persona}
        data={lite}
        initialEdits={categoryEdits(persona)}
        payCycle={payCycleSummary(data)}
        params={params}
        doubles={doubles}
        asOf={data.asOf}
        hideGambling={!!account.hideGambling}
        gambling={account.hideGambling ? null : (() => { const g = gamblingInsight(data); return g ? { pctOfIncome90: g.pctOfIncome90, factor: g.factor } : null; })()}
        corrections={isOn("corrections_v1", persona) ? { oneOff: data.memberRules?.oneOffIncome ?? [], regular: data.memberRules?.regularIncome ?? [] } : null}
      />
    </PortalShell>
  );
}
