"use client";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { entitlementsCopy as t } from "@/content/actions";
import type { PersonaId } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import { useAccount } from "@/lib/account/client";
import { track } from "@/lib/analytics/client";
import { pointers, type Answers } from "@/lib/entitlements/pointers";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Form";
import { cx } from "@/components/ui/cx";

type Q = keyof typeof t.q;
const QUESTIONS = Object.keys(t.q) as Q[];

export function EntitlementsCheck({ persona, account, asOf, context }: { persona: PersonaId; account: AccountState; asOf: string; context: { state: string; hasEnergyBill: boolean; usesPayAdvances: boolean } }) {
  const { update } = useAccount(persona, account);
  // Saved answers come back only if the member chose to keep them.
  const [answers, setAnswers] = useState<Answers>(account.entitlements?.answers ?? {});
  const [remember, setRemember] = useState(!!account.entitlements?.answers);
  const [shown, setShown] = useState(false);
  useEffect(() => { track("entitlements_started", {}); }, []);
  const see = () => {
    track("entitlements_completed", {});
    update((l) => ({ ...l, entitlements: { completedAt: asOf, ...(remember ? { answers: answers as Record<string, string> } : {}) } }));
    setShown(true);
  };
  const list = pointers(answers, context);
  return (
    <div className="flex flex-col gap-t5 pb-t6">
      <p className="mt-t2 text-body text-text-muted">{t.intro}</p>
      {QUESTIONS.map((q) => (
        <fieldset key={q}>
          <legend className="text-body-strong text-text">{t.q[q].label}</legend>
          <div className="mt-t2 flex flex-wrap gap-t2">
            {Object.entries(t.q[q].options).map(([k, v]) => (
              <button key={k} type="button" aria-pressed={answers[q] === k} onClick={() => setAnswers((a) => ({ ...a, [q]: a[q] === k ? undefined : k }))}
                className={cx("min-h-tap rounded-pill border px-t4 text-small", answers[q] === k ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-text")}>{v}</button>
            ))}
          </div>
        </fieldset>
      ))}
      <div>
        <Checkbox label={t.remember} checked={remember} onChange={setRemember} />
        <p className="mt-t1 text-caption text-text-muted">{t.rememberNote}</p>
      </div>
      <Button full onClick={see}>{t.see}</Button>
      {shown && (
        <section aria-labelledby="ent-results" className="flex flex-col gap-t3">
          <h2 id="ent-results" className="text-h2 font-display text-text">{t.resultsTitle}</h2>
          <ul className="flex flex-col gap-t3">
            {list.map((p) => (
              <li key={p.id} className="rounded-md bg-surface p-t4">
                <h3 className="text-h3 text-text">{t.programs[p.id]!.title}</h3>
                <p className="mt-t1 text-small text-text-muted">{t.programs[p.id]!.body}</p>
                <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={() => track("entitlement_link_opened", { program: p.id })}
                  className="mt-t2 inline-flex min-h-tap items-center gap-t2 text-body-strong text-accent underline-offset-2 hover:underline">
                  {t.open(t.programs[p.id]!.title)}<ExternalLink aria-hidden size={16} />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-small text-text-muted">{t.general}</p>
        </section>
      )}
    </div>
  );
}
