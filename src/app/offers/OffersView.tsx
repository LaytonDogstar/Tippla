"use client";
import { Info } from "lucide-react";
import { useState } from "react";
import type { Offer, PersonaId } from "@/lib/api/types";
import { offersPage as t } from "@/content/account";
import { offer as oc } from "@/content/components";
import { formatCents, formatPercent, formatWhole } from "@/lib/format";
import { sumMoney } from "@/lib/format/money";
import { useAccount } from "@/lib/account/client";
import type { AccountState } from "@/lib/account/state";
import { OfferCard } from "@/components/domain/OfferCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState, useToast } from "@/components/ui/Feedback";
import { Sheet } from "@/components/ui/Sheet";

export function OffersView({ persona, account: initial, matching, offers }: {
  persona: PersonaId; account: AccountState; matching: boolean; offers: Offer[];
}) {
  const toast = useToast();
  const { account, save } = useAccount(persona, initial);
  const [details, setDetails] = useState<Offer | null>(null);
  const [info, setInfo] = useState(false);
  const dismissed = new Set(account.dismissedOffers ?? []);
  const shown = offers.filter((o) => !dismissed.has(o.id));

  const infoButton = (
    <button type="button" aria-label={t.info} onClick={() => setInfo(true)}
      className="inline-flex h-tap min-w-tap items-center gap-t2 rounded-sm px-t2 text-small text-accent hover:bg-surface2">
      <Info aria-hidden size={20} />{t.info}
    </button>
  );

  return (
    <div className="pb-t6">
      <div className="flex justify-end">{infoButton}</div>
      {!matching ? (
        <section aria-labelledby="off-h" className="mt-t2 rounded-lg bg-surface p-t5">
          <h2 id="off-h" className="text-h2 font-display text-text">{t.off.title}</h2>
          <p className="mt-t3 text-body text-text-muted">{t.off.body}</p>
          <ButtonLink variant="secondary" className="mt-t5" href="/account/consents">{t.off.action}</ButtonLink>
        </section>
      ) : shown.length === 0 ? (
        <div className="mt-t2"><EmptyState variant="noOffers" /></div>
      ) : (
        <ul className="mt-t2 flex flex-col gap-t3">
          {shown.map((o) => (
            <li key={o.id}>
              <OfferCard offer={o} onDetails={() => setDetails(o)} onNotInterested={() => {
                const before = account;
                save({ ...account, dismissedOffers: [...(account.dismissedOffers ?? []), o.id] });
                toast({ kind: "confirm", message: t.dismissed(o.lender.replace(/\s*\(sample\)$/i, "")), onUndo: () => save(before) });
              }} />
            </li>
          ))}
          <li><p className="px-t1 text-caption text-text-muted">{t.notInterestedHint}</p></li>
        </ul>
      )}

      <Sheet open={!!details} onClose={() => setDetails(null)} title={details ? t.detailsTitle(details.lender) : ""}
        footer={<Button full variant="tertiary" onClick={() => setDetails(null)}>{t.close}</Button>}>
        {details && (
          <div className="flex flex-col gap-t4">
            <dl className="grid grid-cols-2 gap-t3">
              {[
                [oc.amount, formatWhole(details.amount)], [oc.term, oc.weeks(details.term_weeks)],
                [oc.comparisonRate, oc.pa(formatPercent(details.comparison_rate_pct))], [oc.fees, formatWhole(details.establishment_fee)],
                [oc.perFortnight, formatCents(details.repayment_per_fortnight)], [oc.totalRepaid, formatCents(details.total_repayable)],
                [oc.totalCost, formatCents(sumMoney([details.total_repayable, -details.amount]))],
              ].map(([k, v]) => (
                <div key={k} className="rounded-sm bg-surface2 p-t3"><dt className="text-caption text-text-muted">{k}</dt><dd className="tnum mt-t1 text-body-strong text-text">{v}</dd></div>
              ))}
            </dl>
            <section>
              <h3 className="text-h3 text-text">{t.detailsWhatNext}</h3>
              {t.detailsNext.map((p) => <p key={p} className="mt-t2 text-body text-text-muted">{p}</p>)}
            </section>
            <p className="text-small text-text-muted">{oc.notApproval}</p>
            <p className="text-caption text-text-muted">{t.detailsHandoff}</p>
          </div>
        )}
      </Sheet>
      <Sheet open={info} onClose={() => setInfo(false)} title={t.info}
        footer={<ButtonLink full variant="secondary" href="/account/consents">{t.off.action}</ButtonLink>}>
        <div className="flex flex-col gap-t3">{t.infoBody.map((p) => <p key={p} className="text-body text-text-muted">{p}</p>)}</div>
      </Sheet>
    </div>
  );
}
