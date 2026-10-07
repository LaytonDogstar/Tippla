"use client";
// Spec 07: the "You've reached Healthy" moment. A calm card (no confetti), the journey in facts, then
// "What's next". Shown once: either button records it.
import Link from "next/link";
import { useEffect } from "react";
import { moment as t } from "@/content/plans";
import { stageNames } from "@/content/en-AU";
import { formatDollars } from "@/lib/format";
import type { PersonaId } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import type { StageMoment } from "@/lib/selectors/progression";
import { useAccount } from "@/lib/account/client";
import { track } from "@/lib/analytics/client";
import { Button } from "@/components/ui/Button";

export function StageMomentCard({ persona, account, moment }: { persona: PersonaId; account: AccountState; moment: StageMoment }) {
  const { update } = useAccount(persona, account);
  useEffect(() => { track("band_reached", { band: moment.stage }); }, [moment.stage]);
  const seen = () => update((l) => ({ ...l, bandsSeen: [...new Set([...(l.bandsSeen ?? []), moment.stage])] }));
  return (
    <section aria-labelledby="moment-h" className="rounded-card-s bg-accent-soft sm:rounded-card p-t5">
      <h2 id="moment-h" className="text-card text-text sm:text-card-l">{t.title(stageNames[moment.stage])}</h2>
      <p className="mt-t2 text-body text-text">{t.journey(moment.from, moment.to, moment.cycles)}</p>
      {moment.feesAvoided > 0 && <p className="mt-t1 text-body text-text">{t.fees(formatDollars(moment.feesAvoided))}</p>}
      <div className="mt-t4 flex flex-wrap gap-t2">
        <Link href="/progress/whats-next" onClick={seen} className="inline-flex min-h-[44px] items-center justify-center rounded-sm bg-accent px-t4 text-body-strong text-on-accent">{t.next}</Link>
        <Button variant="tertiary" onClick={seen}>{t.later}</Button>
      </div>
    </section>
  );
}
