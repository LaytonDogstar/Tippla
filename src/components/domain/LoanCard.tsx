"use client";
// Component 12. Header button owns expansion. "Estimated" is attached to each estimated value.
import { ChevronDown, ChevronUp, Landmark } from "lucide-react";
import { useId, useState } from "react";
import { loan as t } from "@/content/components";
import { copy } from "@/content/en-AU";
import { formatShortDay, formatWhole } from "@/lib/format";
import type { Loan } from "@/lib/selectors/loans";
import { Button } from "@/components/ui/Button";

const typeLabel = { SACC: copy.loans.typeSACC, MACC: copy.loans.typeMACC, AOCC: copy.loans.typeAOCC, NON_SACC: copy.loans.typeMACC } as const;

export function LoanCard({ loan, combinedBalance, onViewRepayments, defaultExpanded }: {
  loan: Loan;
  /** When the balance can't be split per lender: e.g. "About $1,060 left across 2 small loans (estimated)". */
  combinedBalance?: string;
  onViewRepayments?: () => void;
  defaultExpanded?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultExpanded);
  const id = useId();
  return (
    <article className="rounded-md bg-surface p-t5">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} className="-m-t2 flex min-h-[64px] w-[calc(100%+16px)] items-center gap-t3 rounded-sm p-t2 text-left hover:bg-surface2">
        <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-surface2 text-neutral"><Landmark size={24} /></span>
        <span className="flex-1">
          <span className="block text-h3 text-text">{loan.provider}</span>
          <span className="block text-caption text-text-muted">{typeLabel[loan.type]}</span>
        </span>
        {open ? <ChevronUp aria-hidden size={20} className="text-accent" /> : <ChevronDown aria-hidden size={20} className="text-accent" />}
      </button>

      <div className="mt-t6">
        {loan.estimatedBalance !== null ? (
          <>
            <p className="text-small text-text-muted">{t.balance}</p>
            <p className="tnum mt-t2 text-figure-l font-numeric text-text">{formatWhole(loan.estimatedBalance)}</p>
          </>
        ) : (
          <>
            <p className="text-h3 text-text">{t.missing}</p>
            {combinedBalance && <p className="mt-t1 text-small text-text-muted">{combinedBalance}</p>}
          </>
        )}
      </div>
      <div className="mt-t5">
        <p className="text-caption text-text-muted">{t.nextRepayment}</p>
        <p className="tnum text-small font-numeric text-text">{formatWhole(loan.repayment)}{loan.nextDue ? ` · ${formatShortDay(loan.nextDue)}` : ""}</p>
      </div>

      <div id={id} hidden={!open}>
        <hr aria-hidden className="mt-t5 border-line" />
        <dl className="mt-t5 flex flex-col gap-t3">
          {loan.cadenceDays && (
            <div className="min-h-[52px]"><dt className="text-caption text-text-muted">{t.frequency}</dt><dd className="text-small text-text">{t.everyDays(loan.cadenceDays)}</dd></div>
          )}
          <div className="min-h-[52px]">
            <dt className="text-caption text-text-muted">{t.repaid90}</dt>
            <dd className="tnum text-small text-text">{copy.loans.repaid(loan.provider, formatWhole(loan.activity.repaid90), loan.activity.repayments90)}</dd>
          </div>
        </dl>
        <p className="mt-t4 rounded-sm bg-neutral-soft p-t3 text-small text-text-muted">{t.estimateNote}</p>
        <Button variant="secondary" full className="mt-t3" onClick={onViewRepayments}>{t.viewRepayments}</Button>
      </div>
    </article>
  );
}
