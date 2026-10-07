"use client";
// Component 06. Summary is one disclosure button; budget, insight chip and merchants are independent slots.
// Gambling is an ordinary row: same icon size, weight and treatment as every other category.
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useId, useState } from "react";
import { category as t } from "@/content/components";
import { formatCents, formatWhole } from "@/lib/format";
import type { CategoryRow as Row, MerchantRow } from "@/lib/selectors/spending";
import { categoryIcons, catVar } from "@/components/icons";
import { Sparkline } from "./Sparkline";
import { cx } from "@/components/ui/cx";

export interface CategoryRowProps {
  row: Row;
  merchants?: MerchantRow[];
  budget?: number | null; // null = no budget set
  showLifestyle?: boolean;
  insightLabel?: string; // present → shows the insight chip
  onInsight?: () => void;
  onMerchant?: (m: MerchantRow) => void;
  onViewAll?: () => void;
  onEditBudget?: () => void;
  defaultExpanded?: boolean;
  /** "Up $40 vs last pay cycle" — plain words, neutral colour. */
  changeText?: string;
  /** Last 6 pay cycles, oldest first. */
  sparkline?: (number | null)[];
  /** Controlled expansion (donut selection opens the row). */
  expanded?: boolean;
  onToggle?: (open: boolean) => void;
}

export function CategoryRow({ row, merchants = [], budget, showLifestyle, insightLabel, onInsight, onMerchant, onViewAll, onEditBudget, defaultExpanded, changeText, sparkline, expanded, onToggle }: CategoryRowProps) {
  const [openState, setOpen] = useState(!!defaultExpanded);
  const open = expanded ?? openState;
  const id = useId();
  const Icon = categoryIcons[row.category];
  const hasBudget = typeof budget === "number";
  return (
    <section className="rounded-card-s bg-surface shadow-card sm:rounded-card">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => { setOpen(!open); onToggle?.(!open); }}
        className="flex min-h-[88px] w-full items-center gap-t3 rounded-card-s p-t4 text-left hover:bg-surface2 active:bg-surface2 sm:rounded-card sm:px-t5"
      >
        <span aria-hidden className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-pill bg-chip" style={{ color: catVar(row.category) }}>
          <Icon size={20} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-row text-text">{row.name}</span>
          <span className="mt-t1 block text-meta text-text-muted">{t.transactions(row.count)}</span>
          {changeText && <span className="tnum mt-t1 block text-meta text-text-muted">{changeText}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-t1">
          <span className="tnum text-[0.9375rem] font-bold text-text">{formatWhole(row.total)}</span>
          {sparkline && <Sparkline values={sparkline} category={row.category} />}
        </span>
        {open ? <ChevronUp aria-hidden size={20} className="shrink-0 text-text-muted" /> : <ChevronDown aria-hidden size={20} className="shrink-0 text-text-muted" />}
      </button>

      {(showLifestyle || hasBudget || insightLabel) && (
        <div className="flex flex-col gap-t3 pb-t4 pl-[76px] sm:pl-[84px] pr-t4">
          {showLifestyle && row.type === "lifestyle" && (
            <span className="inline-flex min-h-[24px] w-fit items-center rounded-xs bg-neutral-soft px-t2 text-caption text-neutral">{t.lifestyle}</span>
          )}
          {hasBudget && <BudgetSlot spent={row.total} budget={budget ?? null} onEdit={onEditBudget} />}
          {insightLabel && (
            <button type="button" onClick={onInsight} className="inline-flex min-h-tap w-fit items-center gap-t2 rounded-pill bg-accent-soft px-t3 py-t1 text-left text-small text-accent hover:shadow-[inset_0_0_0_2px_var(--color-accent)]">
              <Info aria-hidden size={16} />
              {insightLabel}
            </button>
          )}
        </div>
      )}

      <div id={id} hidden={!open} className="pb-t2 pl-[76px] sm:pl-[84px] pr-t4">
        <ul>
          {merchants.map((m) => (
            <li key={m.merchant} className="border-t border-divider">
              <button type="button" onClick={() => onMerchant?.(m)} className="flex min-h-[52px] w-full items-center justify-between gap-t3 rounded-xs text-left text-small text-text hover:bg-surface2">
                <span>{m.merchant}</span>
                <span className="tnum font-numeric">{formatCents(m.total)}</span>
              </button>
            </li>
          ))}
        </ul>
        {onViewAll && <button type="button" onClick={onViewAll} className="min-h-tap w-full rounded-sm text-left text-small text-accent hover:bg-surface2">{t.viewTransactions}</button>}
        {budget === null && onEditBudget && <button type="button" onClick={onEditBudget} className="min-h-tap w-full rounded-sm text-left text-small text-accent hover:bg-surface2">{t.setBudget}</button>}
      </div>
    </section>
  );
}

function BudgetSlot({ spent, budget, onEdit }: { spent: number; budget: number | null; onEdit?: () => void }) {
  if (budget === null) {
    return <button type="button" onClick={onEdit} className="min-h-tap w-fit rounded-sm text-small text-accent hover:bg-surface2">{t.setBudget}</button>;
  }
  if (budget === 0) {
    return (
      <div>
        <p className="text-small text-text-muted">{t.budgetZero}</p>
        <button type="button" onClick={onEdit} className="min-h-tap rounded-sm text-small text-accent hover:bg-surface2">{t.editBudget}</button>
      </div>
    );
  }
  const frac = Math.min(spent / budget, 1);
  const diff = Math.round((budget - spent) * 100) / 100;
  const note = diff > 0 ? t.budgetLeft(formatWhole(diff)) : diff === 0 ? t.budgetReached : t.budgetOver(formatWhole(-diff));
  return (
    <div>
      <p className="tnum text-small text-text-muted">{t.budgetOf(formatWhole(spent), formatWhole(budget))}</p>
      <div aria-hidden className="mt-t2 h-t2 overflow-hidden rounded-pill" style={{ background: "var(--chart-ring-track)" }}>
        <div className="h-full bg-accent" style={{ width: `${frac * 100}%` }} />
      </div>
      <div className="mt-t1 flex items-center justify-between gap-t3">
        <p className={cx("tnum text-caption", diff < 0 ? "text-neutral" : "text-text-muted")}>{note}</p>
        <button type="button" onClick={onEdit} className="min-h-tap rounded-sm px-t1 text-small text-accent hover:bg-surface2">{t.editBudget}</button>
      </div>
    </div>
  );
}
