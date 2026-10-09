"use client";
// Spec 05: "Not right?" for a detected subscription or loan: a short list of what's wrong, each saved as a
// member rule for that merchant (applies to future transactions too), with Undo.
import { correctionCopy as t } from "@/content/corrections";
import type { PersonaId } from "@/lib/api/types";
import type { RuleKind } from "@/lib/account/corrections";
import { useCorrections } from "@/lib/account/useCorrections";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

export interface RuleOption { kind: RuleKind; label: string; note?: string }

export const SUBSCRIPTION_OPTIONS: RuleOption[] = [
  { kind: "subscription_ended", label: t.subscription.ended, note: t.subscription.endedNote },
  { kind: "not_subscription", label: t.subscription.notSub },
];
export const LOAN_OPTIONS: RuleOption[] = [
  { kind: "loan_ended", label: t.loan.ended, note: t.loan.endedNote },
  { kind: "not_loan", label: t.loan.notLoan, note: t.loan.notLoanNote },
];

export function RuleChoiceSheet({ persona, merchant, title, options, open, onClose, scoreNote }: {
  persona: PersonaId; merchant: string; title: string; options: RuleOption[]; open: boolean; onClose: () => void; scoreNote?: boolean;
}) {
  const { addRule } = useCorrections(persona);
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <ul className="flex flex-col gap-t3">
        {options.map((o) => (
          <li key={o.kind}>
            <Button full variant="secondary" onClick={() => { addRule({ kind: o.kind, merchant }); onClose(); }}>{o.label}</Button>
            {o.note && <p className="mt-t1 text-caption text-text-muted">{o.note}</p>}
          </li>
        ))}
      </ul>
      {scoreNote && <p className="mt-t4 text-small text-text-muted">{t.scoreNote}</p>}
    </Sheet>
  );
}
