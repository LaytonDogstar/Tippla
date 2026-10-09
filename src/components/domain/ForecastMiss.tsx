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
    // Today (09/10/2026): housekeeping, so an outlined strip with no fill and a smaller heading, at the bottom.
    <section aria-labelledby="miss" className="flex flex-col gap-t2 rounded-card-s border border-line px-t4 py-t3 sm:rounded-card sm:px-t5">
      <h2 id="miss" className="text-body14 font-bold text-text">{t.missTitle(formatShortDay(miss.forDate))}</h2>
      <p className="text-meta text-text-muted">{t.missBody(formatShortDay(miss.forDate), money(miss.predicted), money(miss.actual))}</p>
      <div className="flex flex-wrap gap-t2">
        {Object.entries(t.answers).map(([k, label]) => (
          <button key={k} type="button" onClick={() => answer(k)} className="pressable min-h-tap rounded-pill bg-chip px-[14px] text-meta font-semibold text-text-secondary hover:bg-surface2">{label}</button>
        ))}
      </div>
    </section>
  );
}
