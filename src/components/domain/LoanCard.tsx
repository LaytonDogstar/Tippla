"use client";
// Component 12, on the shared product card (UX round 2, 3.5): Balance, Next repayment and Frequency as label/value
// pairs. Without a per-lender balance (small loans share one TaleFin total, shown once for the group), the next
// repayment is the main value and "Balance not available" is muted. "Estimated" is attached to each estimate.
import { Landmark } from "lucide-react";
import { correctionCopy } from "@/content/corrections";
import { loan as t } from "@/content/components";
import { copy } from "@/content/en-AU";
import { formatShortDay, formatWhole } from "@/lib/format";
import type { Loan } from "@/lib/selectors/loans";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "./ProductCard";

const typeLabel = { SACC: copy.loans.typeSACC, MACC: copy.loans.typeMACC, AOCC: copy.loans.typeAOCC, NON_SACC: copy.loans.typeMACC } as const;

export function LoanCard({ loan, combinedBalance, onViewRepayments, onNotRight }: {
  /** Spec 05: "Not right?" (this has ended / this isn't a loan). */
  onNotRight?: () => void;
  loan: Loan;
  /** Only where the group line isn't shown (dev showcase): "About $1,060 left across 2 small loans (estimated)". */
  combinedBalance?: string;
  onViewRepayments?: () => void;
  /** Kept for the dev showcase; the card no longer expands. */
  defaultExpanded?: boolean;
}) {
  const noBalance = loan.estimatedBalance === null;
  const next = <>{formatWhole(loan.repayment)}{loan.nextDue ? <span className="text-body14 font-semibold text-text-secondary"> · {formatShortDay(loan.nextDue)}</span> : null}</>;
  return (
    <ProductCard icon={Landmark} name={loan.provider} type={typeLabel[loan.type]} onOpen={onViewRepayments} openLabel={t.viewRepayments}
      pairs={[
        // The main value first, full width on phones; then the rest side by side.
        ...(noBalance ? [{ label: t.nextRepayment, value: next, main: true }] : [{ label: t.balance, value: formatWhole(loan.estimatedBalance!), main: true }, { label: t.nextRepayment, value: next }]),
        ...(noBalance ? [{ label: t.balanceShort, value: t.notAvailable, status: true }] : []),
        ...(loan.cadenceDays ? [{ label: t.frequencyShort, value: t.everyDays(loan.cadenceDays) }] : []),
      ]}
      note={combinedBalance ?? copy.loans.repaid(loan.provider, formatWhole(loan.activity.repaid90), loan.activity.repayments90)}
      action={onNotRight ? <Button variant="tertiary" onClick={onNotRight} aria-label={correctionCopy.notRightFor(loan.provider)}>{correctionCopy.notRight}</Button> : undefined} />
  );
}
