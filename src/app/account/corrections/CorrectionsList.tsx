"use client";
import { correctionCopy as t } from "@/content/corrections";
import type { PersonaId } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import { useCorrections } from "@/lib/account/useCorrections";
import { useToast } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";

export interface CorrectionRow { id: string; type: "rule" | "bill"; label: string }

export function CorrectionsList({ persona, account, rows }: { persona: PersonaId; account: AccountState; rows: CorrectionRow[] }) {
  const { removeRule, clearBill } = useCorrections(persona, account);
  const toast = useToast();
  if (!rows.length) return <p className="mt-t2 rounded-card-s bg-surface shadow-card sm:rounded-card p-t5 text-body text-text-muted">{t.page.empty}</p>;
  return (
    <ul className="mt-t2 overflow-hidden rounded-card-s bg-surface shadow-card sm:rounded-card">
      {rows.map((r) => (
        <li key={`${r.type}:${r.id}:${r.label}`} className="flex min-h-[56px] items-center gap-t3 border-b border-divider px-t4 py-t2 last:border-b-0">
          <span className="min-w-0 flex-1 text-body text-text">{r.label}</span>
          <Button variant="link" aria-label={t.page.remove(r.label)} onClick={() => { if (r.type === "rule") removeRule(r.id); else clearBill(r.id); toast({ kind: "confirm", message: t.page.removed }); }}>{t.page.removeButton}</Button>
        </li>
      ))}
    </ul>
  );
}
