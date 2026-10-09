"use client";
// All budgets (Spending v5, 09/10/2026): full budget management, reached from "All budgets" on Spending's Budget ideas
// card (the Budgets tab it replaces). Same list, sheets and selectors as before.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryId, PersonaId } from "@/lib/api/types";
import { categoryNames } from "@/content/en-AU";
import { spending as sp } from "@/content/spending";
import { useBudgets, useCategoryEdits } from "@/lib/edits/client";
import { currentCycle, type CategoryOverrides, type SpendData } from "@/lib/selectors";
import { useToast } from "@/components/ui/Feedback";
import { BudgetSheet, BudgetsTab, MerchantSheet, type SheetState } from "../sheets";

export function BudgetsView({ persona, data, initialEdits }: { persona: PersonaId; data: SpendData; initialEdits: CategoryOverrides }) {
  const router = useRouter();
  const toast = useToast();
  const original = useMemo(() => Object.fromEntries(data.transactions.map((x) => [x.id, x.category])) as Record<string, CategoryId>, [data]);
  const { edits, setCategory, restore } = useCategoryEdits(persona, initialEdits, original);
  const { budgets, save } = useBudgets(persona);
  const [sheet, setSheet] = useState<SheetState>(null);
  const cycle = currentCycle(data);
  const saved = (next: typeof budgets, message: string) => {
    const before = budgets;
    save(next);
    toast({ kind: "confirm", message, onUndo: () => save(before) });
    router.refresh();
  };
  return (
    <div className="mx-auto w-full max-w-[660px] pb-t6">
      <BudgetsTab data={data} cycle={cycle} budgets={budgets} edits={edits}
        onEdit={(c, suggest) => setSheet({ kind: "budget", category: c, suggest })}
        onSet={(c, v) => saved({ ...budgets, [c]: v }, sp.budgets.saved(categoryNames[c]))}
        onMerchant={(m) => setSheet({ kind: "merchant", merchant: m })} />
      <MerchantSheet sheet={sheet} setSheet={setSheet} data={data} p={cycle} edits={edits} original={original}
        onRecategorise={(id, c) => { const before = edits; setCategory(id, c); toast({ kind: "confirm", message: sp.tx.moved(categoryNames[c]), onUndo: () => restore(before) }); }} />
      <BudgetSheet sheet={sheet} setSheet={setSheet} data={data} budgets={budgets} edits={edits}
        onSave={(c, v) => {
          const next = { ...budgets };
          if (v === null) delete next[c]; else next[c] = v;
          saved(next, v === null ? sp.budgets.removed(categoryNames[c]) : sp.budgets.saved(categoryNames[c]));
          setSheet(null);
        }} />
    </div>
  );
}
