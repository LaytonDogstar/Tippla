"use client";
// Component 13. Objective and comparable; fixed field order; no urgency devices, no badges, no ranking.
import { ChevronDown, ChevronUp, Landmark } from "lucide-react";
import { useId, useState } from "react";
import { offer as t } from "@/content/components";
import { formatCents, formatPercent, formatWhole } from "@/lib/format";
import { sumMoney } from "@/lib/format/money";
import type { Offer } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";

export function OfferCard({ offer: o, onDetails, onNotInterested }: { offer: Offer; onDetails?: () => void; onNotInterested?: () => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const totalCost = sumMoney([o.total_repayable, -o.amount]);
  return (
    <article className="rounded-md bg-surface p-t5">
      <div className="flex items-center gap-t3">
        <span aria-hidden className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-sm bg-surface2 text-neutral"><Landmark size={24} /></span>
        <div><h3 className="text-h3 text-text">{o.lender}</h3></div>
      </div>
      <dl>
        <div className="mt-t6"><dt className="text-small text-text-muted">{t.amount}</dt><dd className="tnum mt-t2 text-figure-l font-numeric text-text">{formatWhole(o.amount)}</dd></div>
      </dl>
      <dl className="mt-t4 grid grid-cols-2 gap-t4">
        <div><dt className="text-small text-text-muted">{t.term}</dt><dd className="text-h3 text-text">{t.weeks(o.term_weeks)}</dd></div>
        <div><dt className="text-small text-text-muted">{t.comparisonRate}</dt><dd className="tnum text-h3 text-text">{t.pa(formatPercent(o.comparison_rate_pct))}</dd></div>
      </dl>
      <dl>
        <div className="mt-t4"><dt className="text-small text-text-muted">{t.fees}</dt><dd className="text-body-strong text-text">{t.establishmentIncluded(formatWhole(o.establishment_fee))}</dd></div>
        <div className="mt-t4"><dt className="text-small text-text-muted">{t.perFortnight}</dt><dd className="tnum mt-t2 text-figure-l font-numeric text-text">{formatCents(o.repayment_per_fortnight)}</dd></div>
        <div className="mt-t4"><dt className="text-caption text-text-muted">{t.totalCost}</dt><dd className="tnum text-body-strong text-text">{formatCents(totalCost)}</dd></div>
        <div className="mt-t4"><dt className="text-caption text-text-muted">{t.totalRepaid}</dt><dd className="tnum text-body-strong text-text">{formatCents(o.total_repayable)}</dd></div>
      </dl>
      <hr aria-hidden className="mt-t5 border-line" />
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} className="mt-t2 flex min-h-tap w-full items-center justify-between rounded-sm text-small text-accent hover:bg-surface2">
        {t.whyMatched}
        {open ? <ChevronUp aria-hidden size={20} /> : <ChevronDown aria-hidden size={20} />}
      </button>
      <div id={id} hidden={!open} className="mt-t4">
        <ul className="list-disc pl-t5 text-body text-text">{o.matched_on.map((m) => <li key={m}>{m}</li>)}</ul>
        <p className="mt-t3 text-small text-text-muted">{t.notApproval}</p>
      </div>
      <div className="mt-t4 flex flex-col gap-t2">
        <Button variant="secondary" full onClick={onDetails}>{t.viewDetails}</Button>
        <Button variant="tertiary" full onClick={onNotInterested}>{t.notInterested}</Button>
      </div>
    </article>
  );
}
