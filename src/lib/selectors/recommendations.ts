import type { PersonaData } from "@/lib/api/types";
import { factorCopy } from "@/content/en-AU";
import { formatDayMonth, formatWhole } from "@/lib/format";
import { insightCopy } from "@/content/insights";
import { payAdvanceRun } from "./loans";
import { payCycleSummary } from "./payCycle";
import { topThreeFactors } from "./score";

export interface FirstAction { id: string; factor: string; title: string; summary: string; happening: string; wouldChange?: string; ifYouWant?: string }

/**
 * The first action shown on the reveal and "Next thing to do" (docs/04): the highest-impact step the customer
 * can act on within this pay cycle. When they're short before payday, prefer a no-cost step.
 * Phase 3 expands this into the full recommendations list.
 */
export function firstAction(d: PersonaData): FirstAction | null {
  const run = payAdvanceRun(d);
  if (run && run.count >= 2) {
    const c = insightCopy.payAdvance(formatWhole(run.amount), run.provider, formatDayMonth(run.since), formatWhole(run.fee ?? 0));
    return { id: "pay-advance", factor: c.context, title: c.title, summary: c.summary, happening: c.happening, wouldChange: c.wouldChange, ifYouWant: c.ifYouWant };
  }
  const top = topThreeFactors(d)[0];
  if (!top) return null;
  const pc = payCycleSummary(d);
  return {
    id: `factor-${top.key}`,
    factor: top.name,
    title: `${top.name} is your lowest factor at ${top.value!.toFixed(1)}`,
    summary: factorCopy[top.key].lifts + ".",
    happening: pc.isShort ? factorCopy[top.key].explains + "." : `${factorCopy[top.key].explains}. ${formatWhole(pc.leftAfterBills)} is left after bills this pay cycle.`,
    wouldChange: factorCopy[top.key].lifts + ".",
  };
}
