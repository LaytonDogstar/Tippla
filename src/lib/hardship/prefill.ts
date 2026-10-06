// Spec 06: what the hardship letter can pre-fill, per lender, soonest repayment first (Jess: Beforepay $315
// due Wed 30/09). Pure.
import type { PersonaData } from "@/lib/api/types";
import { lenderEntry } from "@/data/directories";
import { activeLoans, otherCredit } from "@/lib/selectors/loans";
import type { LetterPrefill } from "@/components/domain/HardshipLetter";

export function hardshipPrefill(d: PersonaData): LetterPrefill[] {
  const lenders = [...new Set([...activeLoans(d).map((l) => l.provider), ...otherCredit(d).map((o) => o.provider)])];
  return lenders.map((lender) => {
    const next = d.derived.upcoming_bills.find((b) => b.merchant === lender && b.date > d.asOf);
    return { lender, amount: next?.expected_amount ?? null, date: next?.date ?? null, contact: lenderEntry(lender)?.hardship ?? null };
  }).sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.lender.localeCompare(b.lender));
}
