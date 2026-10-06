"use client";
// Spec 05: one place that saves a correction, records the event, and confirms "Got it. Your forecast is
// updated" (the server-rendered figures refresh straight away because the account cookie changed).
import { useCallback } from "react";
import type { PersonaId } from "@/lib/api/types";
import { useAccount } from "./client";
import { RULE_ENTITY, withRule, type BillAdjust, type MemberRule } from "./corrections";
import type { AccountState } from "./state";
import { track } from "@/lib/analytics/client";
import { useToast } from "@/components/ui/Feedback";
import { correctionCopy as t } from "@/content/corrections";

const emptyAdj = (a?: BillAdjust): BillAdjust => ({ paid: [], oneOffs: [], ...a });

/** Anonymised report for the categorisation team (server decides whether sharing is on; spec 05, gate G3). */
const report = (body: Record<string, string>) => {
  try { void fetch("/api/corrections/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive: true }); } catch { /* best effort */ }
};

export function useCorrections(persona: PersonaId, initial: AccountState = {}) {
  const { account, update, save } = useAccount(persona, initial);
  const toast = useToast();
  const done = useCallback((undo?: () => void) => toast({ kind: "confirm", message: t.updated, ...(undo ? { onUndo: undo } : {}) }), [toast]);

  const addRule = useCallback((r: Omit<MemberRule, "id" | "createdAt">, extra?: { from?: string }) => {
    track("correction_made", { entity_type: RULE_ENTITY[r.kind], correction_type: r.kind });
    let before: AccountState | null = null;
    update((l) => { before = l; return { ...l, rules: withRule(l.rules, { ...r, createdAt: new Date().toISOString() }) }; });
    report({ entity: RULE_ENTITY[r.kind], correction: r.kind, merchant: r.merchant, ...(r.category ? { to: r.category } : {}), ...(extra?.from ? { from: extra.from } : {}) });
    done(() => before && save(before));
  }, [update, save, done]);

  const removeRule = useCallback((id: string) => {
    update((l) => ({ ...l, rules: (l.rules ?? []).filter((x) => x.id !== id) }));
  }, [update]);

  const adjustBill = useCallback((key: string, change: { paid?: true; amount?: number; moved?: string }) => {
    const type = change.paid ? "already_paid" : change.amount !== undefined ? "different_amount" : "moved";
    track("correction_made", { entity_type: "bill", correction_type: type });
    let before: AccountState | null = null;
    update((l) => {
      before = l;
      const a = emptyAdj(l.billAdjust);
      if (change.paid) return { ...l, billAdjust: { ...a, paid: [...new Set([...a.paid, key])] } };
      if (change.amount !== undefined) return { ...l, billAdjust: { ...a, amounts: { ...a.amounts, [key]: change.amount } } };
      return { ...l, billAdjust: { ...a, moved: { ...a.moved, [key]: change.moved! } } };
    });
    done(() => before && save(before));
  }, [update, save, done]);

  const clearBill = useCallback((key: string) => {
    update((l) => {
      const a = emptyAdj(l.billAdjust);
      const strip = <T,>(o?: Record<string, T>) => Object.fromEntries(Object.entries(o ?? {}).filter(([k]) => k !== key));
      return { ...l, billAdjust: { ...a, paid: a.paid.filter((x) => x !== key), amounts: strip(a.amounts), moved: strip(a.moved) } };
    });
  }, [update]);

  return { account, addRule, removeRule, adjustBill, clearBill };
}
