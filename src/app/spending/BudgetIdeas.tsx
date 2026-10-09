"use client";
// Budget ideas (buttons brief, 09/10/2026). Each row: the category and what's usual, then "Try $X a cycle" where the
// amount is a button that turns into an inline editor (no sheet: the Set pill shows the typed amount as you go).
// Right side (below the text on phones): a soft "Set $X" pill and a grey ✕ for Not now. Set saves straight away
// and the row becomes "Budget set: $X a cycle" with Undo for a few seconds. The card hides when there's nothing.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { spending as sp } from "@/content/spending";
import { formatWhole } from "@/lib/format";
import { parseBudgetAmount, type BudgetIdea, type SpendCategory } from "@/lib/selectors";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";

const t = sp.v5.budgets;

export function BudgetIdeas({ ideas, onSet, onUndo, onDismiss, onAmount }: {
  ideas: BudgetIdea[];
  onSet: (c: SpendCategory, amount: number) => void;
  onUndo: (c: SpendCategory) => void;
  onDismiss: (c: SpendCategory) => void;
  /** An edited amount (the panel's "Set a budget of $X" follows it). */
  onAmount: (c: SpendCategory, amount: number) => void;
}) {
  if (!ideas.length) return null;
  return (
    <section aria-labelledby="ideas-h" className="rounded-card-s bg-surface p-t4 shadow-card sm:rounded-card sm:p-t5">
      <div className="flex items-baseline justify-between gap-t3">
        <h3 id="ideas-h" className="text-card text-text sm:text-card-l">{t.heading}</h3>
        <Link href="/spending/budgets" className="inline-flex min-h-tap items-center text-body14 font-semibold text-accent">{t.all}</Link>
      </div>
      <p className="mt-t1 text-meta text-text-muted">{t.intro}</p>
      <ul className="mt-t2" data-testid="budget-ideas">
        {ideas.map((x) => (
          <li key={x.category} className="border-t border-divider py-t3 first:border-t-0">
            {x.justSet
              ? <Confirmed idea={x} onUndo={() => onUndo(x.category)} />
              : <Idea idea={x} onSet={(a) => onSet(x.category, a)} onDismiss={() => onDismiss(x.category)} onAmount={(a) => onAmount(x.category, a)} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Idea({ idea: x, onSet, onDismiss, onAmount }: { idea: BudgetIdea; onSet: (a: number) => void; onDismiss: () => void; onAmount: (a: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const editing = draft !== null;
  const typed = editing ? parseBudgetAmount(draft) : null;
  const amount = typed ?? x.suggested;
  const invalid = editing && draft.trim() !== "" && typed === null;
  useEffect(() => { if (editing) input.current?.select(); }, [editing]);
  const commit = () => { if (typed !== null) onAmount(typed); setDraft(null); };
  const errId = `idea-err-${x.category}`;
  return (
    <div className="flex flex-col gap-t2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="tnum text-body14 text-text"><strong className="font-bold">{x.name}</strong> · {t.usually(formatWhole(x.average))}</p>
        <p className="tnum flex flex-wrap items-center gap-x-[6px] text-body14 text-text-secondary">
          <span>{t.try}</span>
          {editing ? (
            <span className={cx("inline-flex min-h-tap items-center rounded-sm border bg-surface px-t2 font-bold text-text focus-within:outline focus-within:outline-[length:var(--focus-width)] focus-within:outline-offset-[var(--focus-offset)] focus-within:outline-focus", invalid ? "border-negative" : "border-accent")}>
              <span aria-hidden>$</span>
              <input ref={input} value={draft} inputMode="numeric" autoComplete="off" size={5}
                aria-label={t.amountLabel(x.name)} aria-invalid={invalid || undefined} aria-describedby={invalid ? errId : undefined}
                onChange={(e) => setDraft(e.target.value)} onBlur={commit}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") { e.preventDefault(); setDraft(null); } }}
                className="w-[5ch] bg-transparent font-bold outline-none focus-visible:outline-none" />
            </span>
          ) : (
            <button type="button" onClick={() => setDraft(String(x.suggested))} aria-label={t.changeSr(x.name, formatWhole(x.suggested))}
              className="inline-flex min-h-tap items-center rounded-xs font-bold text-text underline decoration-accent decoration-dashed decoration-2 underline-offset-4 hover:text-accent-strong">
              {formatWhole(x.suggested)}
            </button>
          )}
          <span>{t.aCycle}</span>
        </p>
        {invalid && <p id={errId} className="text-meta text-negative">{t.invalid}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-t1">
        <Button variant="secondary" disabled={invalid} onMouseDown={(e) => e.preventDefault()} onClick={() => { if (typed !== null) onAmount(typed); setDraft(null); onSet(amount); }}>
          {t.setPill(formatWhole(amount))}<span className="sr-only"> {t.setSuffix(x.name)}</span>
        </Button>
        <Button variant="tertiary" icon={X} aria-label={t.notNowSr(x.name)} onClick={onDismiss} className="px-0" />
      </div>
    </div>
  );
}

function Confirmed({ idea: x, onUndo }: { idea: BudgetIdea; onUndo: () => void }) {
  return (
    <div role="status" className="flex min-h-tap items-center justify-between gap-t2 rounded-inset bg-positive-soft pl-t3">
      <p className="tnum flex min-w-0 items-center gap-t2 py-t2 text-body14 font-semibold text-positive"><Check aria-hidden size={18} strokeWidth={2.5} />{t.done(formatWhole(x.suggested))}<span className="sr-only">: {x.name}</span></p>
      <Button variant="link" className="shrink-0" onClick={onUndo}>{t.undo}<span className="sr-only"> {t.undoSuffix(x.name)}</span></Button>
    </div>
  );
}
