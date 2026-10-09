"use client";
// Spending's sheets and the full budgets list, shared by the Spending page (v5, 09/10/2026) and /spending/budgets:
// the merchant sheet (recategorise each transaction), the transaction sheet, the budget list and the budget sheet.
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import type { CategoryId, PersonaId, Transaction } from "@/lib/api/types";
import { categoryNames, categoryTypes, copy } from "@/content/en-AU";
import { spending as t } from "@/content/spending";
import { category as catCopy, transaction as txCopy } from "@/content/components";
import { correctionCopy } from "@/content/corrections";
import { formatCents, formatDate, formatDayMonth, formatShortDay, formatWhole } from "@/lib/format";
import { sumMoney } from "@/lib/format/money";
import { useCorrections } from "@/lib/account/useCorrections";
import {
  averagePerCycle, budgetSuggestions, budgetView, categoryTotals, EDITABLE_CATEGORIES, merchantsIn, spendingFeed,
  type CategoryOverrides, type Period, type SpendCategory, type SpendData, type CategoryRow as Row,
} from "@/lib/selectors";
import { CategoryRow } from "@/components/domain/CategoryRow";
import { categoryIcons, catVar } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { CurrencyInput, SelectInput } from "@/components/ui/Form";
import { Sheet } from "@/components/ui/Sheet";

export type SheetState =
  | null
  | { kind: "merchant"; merchant: string }
  | { kind: "tx"; id: string; fromMerchant?: string }
  | { kind: "budget"; category: SpendCategory; suggest?: number }
  | { kind: "due" };

// ---- Merchant sheet ----------------------------------------------------------------------------------
const categoryOptions = EDITABLE_CATEGORIES.map((c) => ({ value: c, label: categoryNames[c] }));

export function MerchantSheet({ sheet, setSheet, data, p, edits, original, onRecategorise }: {
  sheet: SheetState; setSheet: (s: SheetState) => void; data: SpendData; p: Period; edits: CategoryOverrides;
  original: Record<string, CategoryId>; onRecategorise: (id: string, c: CategoryId) => void;
}) {
  const merchant = sheet?.kind === "merchant" ? sheet.merchant : null;
  const list = merchant ? spendingFeed(data, p, edits, {}).filter((x) => x.merchant === merchant && x.amount < 0) : [];
  const totalAmt = sumMoney(list.filter((x) => x.status === "posted").map((x) => -x.amount));
  return (
    <Sheet open={!!merchant} onClose={() => setSheet(null)} title={merchant ?? ""}
      subtitle={merchant ? t.merchant.lead(list.length, formatCents(totalAmt), p.label) : undefined}>
      <ul className="flex flex-col">
        {list.map((x) => (
          <li key={x.id} className="grid grid-cols-[1fr_auto] items-center gap-x-t3 gap-y-t2 border-t border-divider py-t3">
            <button type="button" onClick={() => setSheet({ kind: "tx", id: x.id, fromMerchant: merchant! })} className="min-h-tap rounded-xs text-left text-small text-text hover:bg-surface2">
              {formatShortDay(x.date)}{x.status === "pending" ? ` · ${txCopy.pending}` : ""}
            </button>
            <span className="tnum text-body-strong text-text">−{formatCents(-x.amount)}</span>
            <div className="col-span-2">
              <SelectInput hideLabel label={t.merchant.categoryFor(x.merchant, formatDate(x.date))} value={x.category}
                options={categoryOptions} onChange={(v) => onRecategorise(x.id, v)} />
              {edits[x.id] && <p className="mt-t1 text-caption text-text-muted">{t.tx.original(categoryNames[original[x.id]!])}</p>}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-t4 text-small text-text-muted">{t.tx.hint}</p>
    </Sheet>
  );
}

// ---- Transaction sheet -------------------------------------------------------------------------------
export function TransactionSheet({ sheet, setSheet, tx, original, edits, onRecategorise, onReset, persona, corrections, double }: {
  double: boolean;
  persona: PersonaId; corrections: { oneOff: string[]; regular: string[] } | null;
  sheet: SheetState; setSheet: (s: SheetState) => void; tx: Transaction | null; original: Record<string, CategoryId>;
  edits: CategoryOverrides; onRecategorise: (id: string, c: CategoryId) => void; onReset: (id: string) => void;
}) {
  const from = sheet?.kind === "tx" ? sheet.fromMerchant : undefined;
  const Icon = tx ? categoryIcons[tx.subcategory === "centrelink" ? "centrelink" : tx.category] : null;
  const debit = !!tx && tx.amount < 0;
  const { addRule } = useCorrections(persona);
  const c = correctionCopy.transaction;
  const kind = tx && corrections ? (corrections.oneOff.includes(tx.merchant) ? "one_off" : corrections.regular.includes(tx.merchant) ? "regular" : null) : null;
  return (
    <Sheet open={!!tx} onClose={() => setSheet(null)} title={tx?.merchant ?? ""}
      subtitle={tx ? `${formatShortDay(tx.date)} · ${tx.amount < 0 ? "−" : "+"}${formatCents(Math.abs(tx.amount))}` : undefined}
      onBack={from ? () => setSheet({ kind: "merchant", merchant: from }) : undefined}
      footer={tx && debit && !from ? <Button full variant="secondary" onClick={() => setSheet({ kind: "merchant", merchant: tx.merchant })}>{t.tx.allFrom(tx.merchant)}</Button> : undefined}>
      {tx && (
        <div className="flex flex-col gap-t4">
          <div className="flex items-center gap-t3">
            {Icon && <span aria-hidden className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-sm bg-surface2" style={{ color: catVar(tx.category) }}><Icon size={24} /></span>}
            <p className="text-small text-text-muted">{tx.description}</p>
          </div>
          {tx.status === "pending" && <p className="text-small text-text-muted">{t.tx.pending}</p>}
          {double && (
            <Link href="/#needs-a-look" className="flex min-h-tap items-center justify-between gap-t2 rounded-inset bg-caution-soft px-t4 text-body14 font-semibold text-caution">
              <span>{txCopy.possibleDouble}: {txCopy.seeInNeeds}</span><ChevronRight aria-hidden size={18} />
            </Link>
          )}
          {debit ? (
            <>
              <SelectInput label={t.tx.category} value={tx.category} options={categoryOptions} onChange={(v) => onRecategorise(tx.id, v)} />
              {edits[tx.id] && (
                <div className="flex flex-wrap items-center justify-between gap-t2">
                  <p className="text-caption text-text-muted">{t.tx.original(categoryNames[original[tx.id]!])}</p>
                  <Button variant="tertiary" onClick={() => onReset(tx.id)}>{t.tx.reset}</Button>
                </div>
              )}
              {tx.category === "transfer" && <p className="text-small text-text-muted">{t.tx.transferNote}</p>}
              {/* Spec 05: make it a member rule, so future payments from this merchant follow it. */}
              {corrections && <Button variant="secondary" full onClick={() => addRule({ kind: "category", merchant: tx.merchant, category: tx.category }, { from: original[tx.id] })}>{c.allFrom(tx.merchant)}</Button>}
              <p className="text-small text-text-muted">{t.tx.hint}</p>
            </>
          ) : (
            <>
              <p className="text-small text-text">{categoryNames[tx.category]}</p>
              {corrections && tx.category === "income" && (
                <fieldset>
                  <legend className="text-body-strong text-text">{c.income}</legend>
                  <div className="mt-t2 flex flex-wrap gap-t2">
                    <Button variant={kind === "one_off" ? "primary" : "secondary"} aria-pressed={kind === "one_off"} onClick={() => addRule({ kind: "income_one_off", merchant: tx.merchant })}>{c.oneOff}</Button>
                    <Button variant={kind === "regular" ? "primary" : "secondary"} aria-pressed={kind === "regular"} onClick={() => addRule({ kind: "income_regular", merchant: tx.merchant })}>{c.regular}</Button>
                  </div>
                  <p className="mt-t2 text-caption text-text-muted">{c.incomeNote}</p>
                </fieldset>
              )}
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

// ---- Budgets -----------------------------------------------------------------------------------------
export function BudgetsTab({ data, cycle, budgets, edits, onEdit, onSet, onMerchant }: {
  data: SpendData; cycle: Period; budgets: Partial<Record<SpendCategory, number>>; edits: CategoryOverrides;
  onEdit: (c: SpendCategory, suggest?: number) => void; onSet: (c: SpendCategory, v: number) => void; onMerchant: (m: string) => void;
}) {
  // Suggested budgets when none are set (UX round 2, 6.4); dismissed ones stay hidden for the session.
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const suggestions = budgetSuggestions(data, budgets, edits).filter((x) => !dismissed.has(x.category));
  const v = budgetView(data, cycle, budgets, edits);
  const rows = new Map(categoryTotals(data, cycle, edits).map((r) => [r.category, r]));
  const rowOf = (c: SpendCategory): Row => rows.get(c) ?? { category: c, name: categoryNames[c], type: categoryTypes[c], total: 0, count: 0, share: 0, previousTotal: 0, change: 0 };
  const frac = v.totalBudget ? Math.min(v.totalSpent / v.totalBudget, 1) : 0;
  return (
    <div className="mt-t4 flex flex-col gap-t3">
      <section aria-labelledby="bud-h" className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card sm:p-t6">
        <h2 id="bud-h" className="text-card text-text sm:text-card-l">{t.budgets.heading}</h2>
        <p className="mt-t1 text-small text-text-muted">{copy.payCycle.range(formatDayMonth(cycle.start), formatDayMonth(cycle.end))}</p>
        {v.budgeted.length ? (
          <>
            <p className="tnum mt-t4 text-h2 font-display text-text">{t.budgets.summary(formatWhole(v.totalSpent), formatWhole(v.totalBudget))}</p>
            <div aria-hidden className="mt-t3 h-t2 overflow-hidden rounded-pill" style={{ background: "var(--chart-ring-track)" }}>
              <div className="h-full bg-accent" style={{ width: `${frac * 100}%` }} />
            </div>
            <p className="mt-t2 text-caption text-text-muted">{t.budgets.summaryNote(v.budgeted.length)}</p>
          </>
        ) : suggestions.length ? (
          <div className="mt-t4">
            <p className="text-body14 text-text-secondary">{t.budgets.suggestIntro}</p>
            <ul className="mt-t3 flex flex-col gap-t3">
              {suggestions.map((x) => (
                <li key={x.category} className="rounded-inset bg-surface2 p-t4">
                  <p className="tnum text-body14 text-text"><strong className="font-bold">{x.name}:</strong> {t.budgets.suggest(formatWhole(x.average), formatWhole(x.suggested))}</p>
                  <div className="mt-t2 flex flex-wrap gap-t2">
                    <Button variant="secondary" onClick={() => onSet(x.category, x.suggested)} aria-label={t.budgets.setSr(formatWhole(x.suggested), x.name)}>{t.budgets.set}</Button>
                    <Button variant="tertiary" onClick={() => onEdit(x.category, x.suggested)} aria-label={`${t.budgets.adjust}: ${x.name}`}>{t.budgets.adjust}</Button>
                    <Button variant="tertiary" onClick={() => setDismissed((d) => new Set(d).add(x.category))} aria-label={`${t.budgets.dismiss}: ${x.name}`}>{t.budgets.dismiss}</Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : <p className="mt-t4 text-small text-text">{t.budgets.none}</p>}
        <p className="mt-t3 text-caption text-text-muted">{t.budgets.intro}</p>
      </section>
      {v.budgeted.length > 0 && (
        <ul className="flex flex-col gap-t3">
          {v.budgeted.map((b) => (
            <li key={b.category}>
              <CategoryRow row={rowOf(b.category)} budget={b.budget} onEditBudget={() => onEdit(b.category)}
                merchants={merchantsIn(data, cycle, b.category, edits)} onMerchant={(m) => onMerchant(m.merchant)} />
            </li>
          ))}
        </ul>
      )}
      {v.other.length > 0 && (
        <section aria-labelledby="bud-other" className="rounded-card-s bg-surface shadow-card sm:rounded-card">
          <h2 id="bud-other" className="p-t5 pb-t2 text-card text-text sm:text-card-l">{t.budgets.otherCategories}</h2>
          <ul>
            {v.other.map((r) => {
              const Icon = categoryIcons[r.category];
              return (
                <li key={r.category} className="flex min-h-[64px] items-center gap-t3 border-t border-divider px-t4 py-t2">
                  <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-surface2" style={{ color: catVar(r.category) }}><Icon size={24} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body-strong text-text">{r.name}</span>
                    <span className="tnum block text-caption text-text-muted">{copy.payCycle.spent(formatWhole(r.spent))}</span>
                  </span>
                  <button type="button" onClick={() => onEdit(r.category)} aria-label={`${t.budgets.editTitle(r.name)}: ${catCopy.setBudget}`}
                    className="min-h-tap shrink-0 rounded-sm px-t2 text-small text-accent hover:bg-surface2">{catCopy.setBudget}</button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

export function BudgetSheet({ sheet, setSheet, data, budgets, edits, onSave }: {
  sheet: SheetState; setSheet: (s: SheetState) => void; data: SpendData; budgets: Partial<Record<SpendCategory, number>>;
  edits: CategoryOverrides; onSave: (c: SpendCategory, v: number | null) => void;
}) {
  const c = sheet?.kind === "budget" ? sheet.category : null;
  const [cents, setCents] = useState<number | null>(null);
  const suggest = sheet?.kind === "budget" ? sheet.suggest : undefined;
  useEffect(() => { if (c) setCents(budgets[c] !== undefined ? Math.round(budgets[c]! * 100) : suggest !== undefined ? suggest * 100 : null); }, [c, budgets, suggest]);
  const avg = c ? averagePerCycle(data, c, 3, edits) : null;
  return (
    <Sheet open={!!c} onClose={() => setSheet(null)} title={c ? t.budgets.editTitle(categoryNames[c]) : ""}
      footer={c ? (
        <>
          <Button full disabled={cents === null} onClick={() => onSave(c, cents! / 100)}>{t.budgets.save}</Button>
          {budgets[c] !== undefined && <Button full variant="tertiary" onClick={() => onSave(c, null)}>{t.budgets.remove}</Button>}
        </>
      ) : undefined}>
      {c && (
        <CurrencyInput key={c} label={t.budgets.amountLabel} valueCents={cents} onChangeCents={setCents}
          helper={avg ? t.budgets.amountHint(formatWhole(avg)) : t.budgets.amountHintNone}
          errorText={{ format: t.budgets.invalid, precision: t.budgets.invalid, negative: t.budgets.invalid }} />
      )}
    </Sheet>
  );
}
