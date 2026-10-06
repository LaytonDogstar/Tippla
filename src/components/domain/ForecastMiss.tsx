"use client";
// Spec 05: when yesterday's forecast was badly wrong, ask once what happened. Quick answers; "A bill came
// out on a different day" goes straight to fixing the bill. Never a warning tone.
import { useEffect } from "react";
import { accuracyCopy as t } from "@/content/corrections";
import { formatShortDay, formatWhole } from "@/lib/format";
import type { ForecastPoint } from "@/lib/selectors/forecastAccuracy";
import type { PersonaId } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import { useAccount } from "@/lib/account/client";
import { track } from "@/lib/analytics/client";
import { useToast } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";

const money = (n: number) => (n < 0 ? `−${formatWhole(-n)}` : formatWhole(n));

export function ForecastMissCard({ persona, account, miss, onFixBill }: { persona: PersonaId; account: AccountState; miss: ForecastPoint; onFixBill: () => void }) {
  const { update } = useAccount(persona, account);
  const toast = useToast();
  useEffect(() => { track("forecast_error_prompt_shown", {}); }, [miss.forDate]);
  const answer = (a: string) => {
    track("forecast_error_prompt_answered", { answer: a });
    update((l) => ({ ...l, forecastAnswers: { ...l.forecastAnswers, [miss.forDate]: a } }));
    if (a === "bill_moved") onFixBill();
    else toast({ kind: "confirm", message: t.thanks });
  };
  return (
    <section aria-labelledby="miss" className="rounded-lg bg-surface p-t4">
      <h2 id="miss" className="text-h3 text-text">{t.missTitle}</h2>
      <p className="mt-t1 text-small text-text-muted">{t.missBody(formatShortDay(miss.forDate), money(miss.predicted), money(miss.actual))}</p>
      <div className="mt-t3 flex flex-wrap gap-t2">
        {Object.entries(t.answers).map(([k, label]) => <Button key={k} variant="secondary" onClick={() => answer(k)}>{label}</Button>)}
      </div>
    </section>
  );
}
