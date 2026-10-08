"use client";
// Spending by category (08/10/2026; replaced the donut). One ranked list: the answer in a sentence at the top,
// then each category with a bar scaled to the largest one, the amount and the change against the previous period.
// Top five, then "Show N more" inline (no Other bucket that can outweigh named categories). Tapping a row opens
// its transactions in place, one row at a time; it never filters the Transactions card. "See all N" does, and the
// card shows that filter as a chip. Gambling and Loan repayments carry a "Lenders look at this" link.
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Transaction } from "@/lib/api/types";
import { spending as s } from "@/content/spending";
import { formatCents, formatPercent, formatShortDay, formatWhole } from "@/lib/format";
import { isLenderCategory, type CategoryRow, type SpendCategory } from "@/lib/selectors/spending";
import { catVar } from "@/components/icons";
import { cx } from "@/components/ui/cx";

const t = s.breakdown;
const TOP = 5;
const PREVIEW = 5;

export function CategoryBreakdown({ rows, total, periodLabel, vsLabel, comparable, transactionsFor, onTransaction, onSeeAll, lenderLink, initialOpen = null, onOpenCategory }: {
  rows: CategoryRow[]; total: number; periodLabel: string;
  /** "last pay cycle" etc. comparable=false hides the change column (not enough history). */
  vsLabel: string; comparable: boolean;
  /** The category's transactions in the period, newest first (money out, posted and pending). */
  transactionsFor: (c: SpendCategory) => Transaction[];
  onTransaction: (id: string) => void;
  /** Opens the Transactions list filtered to this category. */
  onSeeAll: (c: SpendCategory) => void;
  /** Where "Lenders look at this" goes: a href, or a handler (e.g. the gambling insight sheet). */
  lenderLink: (c: SpendCategory) => { href: string } | { onClick: () => void };
  initialOpen?: SpendCategory | null;
  /** Follow-up hook: point a row at a category sheet instead of expanding it in place. */
  onOpenCategory?: (c: SpendCategory) => void;
}) {
  const sorted = [...rows].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const [open, setOpen] = useState<SpendCategory | null>(initialOpen);
  const startIndex = initialOpen ? sorted.findIndex((r) => r.category === initialOpen) : -1;
  const [more, setMore] = useState(startIndex >= TOP);
  if (!sorted.length || total <= 0) {
    return (
      <section aria-labelledby="bycat-h" className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card sm:p-t6">
        <h2 id="bycat-h" className="text-card text-text sm:text-card-l">{t.heading}</h2>
        <p className="mt-t3 text-small text-text">{t.empty}</p>
      </section>
    );
  }
  const max = sorted[0]!.total;
  const shown = more ? sorted : sorted.slice(0, TOP);
  const hidden = sorted.length - TOP;
  const tap = (c: SpendCategory) => (onOpenCategory ? onOpenCategory(c) : setOpen((v) => (v === c ? null : c)));

  return (
    <section aria-labelledby="bycat-h" className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card sm:p-t6">
      <h2 id="bycat-h" className="text-card text-text sm:text-card-l">{t.heading}</h2>
      <p className="tnum mt-t1 text-meta text-text-muted">{t.lead(formatWhole(total), periodLabel)}</p>
      <p className="tnum mt-t2 text-body14 text-text">{t.biggest(sorted[0]!.name, formatWhole(max), formatPercent((max / total) * 100, 0))}</p>
      <ul className="-mx-t2 mt-t3 flex flex-col">
        {shown.map((r) => {
          const isOpen = open === r.category;
          const panel = `bycat-${r.category}`;
          const lender = isLenderCategory(r.category);
          const link = lender ? lenderLink(r.category) : null;
          return (
            <li key={r.category} className="border-t border-divider first:border-t-0">
              <button type="button" aria-expanded={onOpenCategory ? undefined : isOpen} aria-controls={onOpenCategory ? undefined : panel} onClick={() => tap(r.category)}
                className="flex min-h-[60px] w-full flex-col justify-center gap-[6px] rounded-sm px-t2 py-t2 text-left hover:bg-surface2">
                <span className="flex w-full items-center gap-t2">
                  <span aria-hidden className="h-[10px] w-[10px] shrink-0 rounded-pill" style={{ background: catVar(r.category) }} />
                  <span className="min-w-0 flex-1 text-body14 font-semibold text-text">{r.name}</span>
                  <span className="tnum text-body14 font-bold text-text">{formatWhole(r.total)}</span>
                  {comparable && <Change row={r} vs={vsLabel} />}
                  <ChevronDown aria-hidden size={18} className={cx("shrink-0 text-icon-muted transition-transform duration-fast motion-reduce:transition-none", isOpen && "rotate-180")} />
                </span>
                {/* Share of spending, scaled so the biggest category fills the row. */}
                <span aria-hidden className="ml-[18px] block h-[6px] overflow-hidden rounded-pill" style={{ background: "var(--chart-ring-track)", width: "calc(100% - 18px - 26px)" }}>
                  <span className="block h-full rounded-pill" style={{ width: `${Math.max(2, (r.total / max) * 100)}%`, background: catVar(r.category) }} />
                </span>
                <span className="sr-only">{t.shareSr(formatPercent(r.share * 100, 0))}</span>
              </button>
              {link && (
                <div className="ml-[26px] pb-t2">
                  {"href" in link ? (
                    <Link href={link.href} className="inline-flex min-h-tap items-center gap-t1 rounded-pill text-meta font-semibold text-accent hover:underline">
                      {t.lenders}<span className="sr-only">{t.lendersSr(r.name)}</span><ChevronRight aria-hidden size={14} />
                    </Link>
                  ) : (
                    <button type="button" onClick={link.onClick} className="inline-flex min-h-tap items-center gap-t1 rounded-pill text-meta font-semibold text-accent hover:underline">
                      {t.lenders}<span className="sr-only">{t.lendersSr(r.name)}</span><ChevronRight aria-hidden size={14} />
                    </button>
                  )}
                </div>
              )}
              {isOpen && !onOpenCategory && <Panel id={panel} row={r} txs={transactionsFor(r.category)} onTransaction={onTransaction} onSeeAll={() => onSeeAll(r.category)} />}
            </li>
          );
        })}
      </ul>
      {hidden > 0 && (
        <button type="button" aria-expanded={more} onClick={() => setMore((v) => !v)}
          className="mt-t2 flex min-h-tap w-full items-center justify-center gap-t1 rounded-pill bg-surface2 text-body14 font-semibold text-accent hover:bg-chip">
          {more ? t.showFewer : t.showMore(hidden)}
          <ChevronDown aria-hidden size={18} className={cx(more && "rotate-180")} />
        </button>
      )}
    </section>
  );
}

/** ▲/▼ and the amount. Neutral, except Gambling and Loan repayments going up (soft caution, never red). */
function Change({ row, vs }: { row: CategoryRow; vs: string }) {
  const amt = Math.round(row.change);
  if (amt === 0) return <span className="w-[64px] shrink-0 text-right text-meta text-text-muted"><span aria-hidden>—</span><span className="sr-only">{t.same(vs)}</span></span>;
  const up = amt > 0;
  const warn = up && isLenderCategory(row.category);
  return (
    <span className="flex w-[64px] shrink-0 justify-end">
      <span className={cx("tnum whitespace-nowrap rounded-pill text-meta", warn ? "bg-caution-soft px-t2 font-semibold text-caution" : "text-text-muted")}>
        <span aria-hidden>{up ? "▲" : "▼"} {formatWhole(Math.abs(amt))}</span>
        <span className="sr-only">{up ? t.up(formatWhole(amt), vs) : t.down(formatWhole(-amt), vs)}</span>
      </span>
    </span>
  );
}

function Panel({ id, row, txs, onTransaction, onSeeAll }: { id: string; row: CategoryRow; txs: Transaction[]; onTransaction: (id: string) => void; onSeeAll: () => void }) {
  const list = txs.slice(0, PREVIEW);
  return (
    <div id={id} className="mb-t3 ml-[18px] mr-t2 rounded-inset bg-surface2 px-t2 py-t1">
      {list.length ? (
        <ul>
          {list.map((x) => (
            <li key={x.id} className="border-t border-divider first:border-t-0">
              <button type="button" onClick={() => onTransaction(x.id)} className="flex min-h-[52px] w-full items-center gap-t2 rounded-sm px-t2 text-left hover:bg-surface">
                <span className="min-w-0 flex-1">
                  <span className="block text-body14 text-text">{x.merchant}</span>
                  <span className="tnum block text-meta text-text-muted">{formatShortDay(x.date)}{x.status === "pending" ? ` · ${t.pending}` : ""}</span>
                </span>
                <span className="tnum text-body14 font-semibold text-text">−{formatCents(-x.amount)}</span>
                <ChevronRight aria-hidden size={16} className="shrink-0 text-icon-muted" />
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="p-t3 text-body14 text-text-muted">{t.noTransactions}</p>}
      {txs.length > PREVIEW && (
        <button type="button" onClick={onSeeAll} className="flex min-h-tap w-full items-center justify-between gap-t2 border-t border-divider px-t2 text-body14 font-semibold text-accent">
          <span>{t.seeAll(txs.length)}<span className="sr-only">{t.seeAllSr(row.name)}</span></span><ChevronRight aria-hidden size={18} />
        </button>
      )}
    </div>
  );
}
