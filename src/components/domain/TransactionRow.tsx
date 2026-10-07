// Component 08. One native button per row. Direction shown with a sign and accessible text, never red/green.
import { ChevronRight, Copy, Pencil } from "lucide-react";
import { transaction as t } from "@/content/components";
import { categoryNames } from "@/content/en-AU";
import { formatCents, formatDate } from "@/lib/format";
import type { Transaction } from "@/lib/api/types";
import { categoryIcons, catVar } from "@/components/icons";

export function TransactionRow({ tx, edited, onOpen, flag, showDate = true }: {
  tx: Transaction; edited?: boolean; onOpen?: () => void;
  /** "Possible double charge": the duplicate-charge rule matched this transaction (1.8). */
  flag?: string | null;
  /** Off under a date heading, which already says the day (6.2). */
  showDate?: boolean;
}) {
  const icon = tx.subcategory === "centrelink" ? "centrelink" : tx.category;
  const Icon = categoryIcons[icon];
  const pending = tx.status === "pending";
  const out = tx.amount < 0;
  const status = pending && edited ? t.pendingEdited : pending ? t.pending : edited ? t.edited : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-[88px] w-full items-center gap-t3 bg-surface p-t4 text-left hover:bg-surface2 active:bg-surface2"
    >
      <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-surface2" style={{ color: catVar(icon === "centrelink" ? "centrelink" : tx.category) }}>
        <Icon size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-t3">
          <span className="text-body-strong text-text">{tx.merchant}</span>
          <span className="tnum text-body-strong font-numeric text-text">{out ? "−" : "+"}{formatCents(Math.abs(tx.amount))}<span className="sr-only">, {out ? t.moneyOut : t.moneyIn},</span></span>
        </span>
        <span className="mt-t1 block text-meta text-text-muted">{categoryNames[tx.category]}{showDate ? ` · ${formatDate(tx.date)}` : ""}</span>
        {flag && <span className="mt-t2 inline-flex items-center gap-t1 rounded-pill bg-caution-soft px-t2 py-[2px] text-meta font-semibold text-caution"><Copy aria-hidden size={14} />{flag}</span>}
        {status && (
          <span className="mt-t2 flex items-center gap-t2 text-caption text-text-muted">
            {edited && <Pencil aria-hidden size={16} />}
            {status}
          </span>
        )}
      </span>
      <ChevronRight aria-hidden size={20} className="shrink-0 text-text-muted" />
    </button>
  );
}
