// Dev-only: every Phase 1 component in every state, light and dark side by side, fed by real selector output.
import { loadPersona } from "@/lib/api/client";
import {
  activeLoans, categoryTotals, currentCycle, factors, calendarDays, gamblingInsight, loanTotals, merchantsIn, payAdvanceRun,
  payCycleSummary, scoreState, strongestFactor, topThreeFactors, visibleOffers,
} from "@/lib/selectors";
import { Showcase, type ShowcaseData } from "./Showcase";

export const dynamic = "force-dynamic";

export default async function ComponentsPage() {
  const opts = { latencyMs: 0 };
  const [{ data: jess }, { data: marcus }, { data: priya }] = await Promise.all([loadPersona("jess", opts), loadPersona("marcus", opts), loadPersona("priya", opts)]);
  const cycle = currentCycle(jess);
  const rows = categoryTotals(jess, cycle);
  const cal = calendarDays(jess);
  const spendCats: Record<string, string[]> = {};
  for (const t of jess.transactions)
    if (t.status === "posted" && t.amount < 0 && t.date >= cycle.start && t.date <= cycle.end) (spendCats[t.date] ??= []).push(t.category);
  const pending = jess.transactions.find((t) => t.status === "pending")!;
  const posted = jess.transactions.filter((t) => t.status === "posted" && t.amount < 0).at(-1)!;
  const centrelink = marcus.transactions.filter((t) => t.subcategory === "centrelink").at(-1)!;
  const data: ShowcaseData = {
    asOf: jess.asOf,
    jess: {
      score: scoreState(jess), factors: factors(jess), top: topThreeFactors(jess), strongest: strongestFactor(jess),
      payCycle: payCycleSummary(jess), rows, cycleLabel: cycle.label,
      merchants: Object.fromEntries(rows.map((r) => [r.category, merchantsIn(jess, cycle, r.category)])),
      calendar: cal, spendCats, loans: activeLoans(jess), loanTotals: loanTotals(jess),
      advance: payAdvanceRun(jess), gambling: gamblingInsight(jess),
      tx: { posted, pending },
    },
    marcus: { score: scoreState(marcus), payCycle: payCycleSummary(marcus), offers: visibleOffers(marcus), centrelink },
    priya: { score: scoreState(priya), factor: factors(priya)[0]! },
  };
  return <Showcase data={data} />;
}
