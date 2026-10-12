"use client";
// The "I'm finding things hard right now" switch (docs/09), shared by Hardship, the money's-tight panel and the
// Today prompt. With hardship mode on (flag hardship_mode_v1, journeys A2) turning it on also pauses lender
// matching, says so, and offers to turn matching back on. COMPLIANCE REVIEW before the flag is turned on.
import type { PersonaId } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import { useAccount } from "@/lib/account/client";
import { statesCopy } from "@/content/states";
import { panels as pc } from "@/content/panels";
import { Toggle } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Feedback";

export function HardshipSwitch({ persona, account, asOf, mode }: { persona: PersonaId; account: AccountState; asOf: string; mode: boolean }) {
  const { account: a, update } = useAccount(persona, account);
  const toast = useToast();
  const set = (v: boolean) => {
    update((l) => ({
      ...l,
      hardshipSelfSelected: v || undefined,
      ...(mode && v ? { consents: { ...l.consents, lender_matching: { granted: false, at: asOf } }, matchingPausedForHardship: true } : {}),
    }));
    toast({ kind: "confirm", message: v ? (mode ? pc.hardshipMode.toastOn : statesCopy.hardshipSelf.toastOn) : statesCopy.hardshipSelf.toastOff });
  };
  const matchingBack = () => {
    update((l) => ({ ...l, consents: { ...l.consents, lender_matching: { granted: true, at: asOf } }, matchingPausedForHardship: undefined }));
    toast({ kind: "confirm", message: pc.hardshipMode.matchingOn });
  };
  return (
    <div className="flex flex-col gap-t2">
      <Toggle label={statesCopy.hardshipSelf.label} description={statesCopy.hardshipSelf.description} checked={!!a.hardshipSelfSelected} onChange={set} />
      {a.hardshipSelfSelected && <p role="status" className="px-t1 text-small text-text-muted">{statesCopy.hardshipSelf.on}</p>}
      {mode && a.matchingPausedForHardship && (
        <div className="flex flex-wrap items-center gap-t2 px-t1">
          <p className="text-small text-text-secondary">{pc.hardshipMode.matchingPaused}</p>
          <Button variant="link" onClick={matchingBack}>{pc.hardshipMode.matchingBack}</Button>
        </div>
      )}
    </div>
  );
}

/** Today, once, when strong signals are present (hardshipSignals). Dismissible; never shown again after. */
export function HardshipPrompt({ persona, account, asOf }: { persona: PersonaId; account: AccountState; asOf: string }) {
  const { account: a, update } = useAccount(persona, account);
  if (a.hardshipPromptDismissed || a.hardshipSelfSelected) return null;
  return (
    <section aria-labelledby="hardship-prompt-h" data-testid="hardship-prompt" className="flex flex-col gap-t3 rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
      <h2 id="hardship-prompt-h" className="text-card text-text">{pc.hardshipMode.promptTitle}</h2>
      <p className="text-body14 text-text-secondary">{pc.hardshipMode.promptBody}</p>
      <HardshipSwitch persona={persona} account={account} asOf={asOf} mode />
      <Button variant="tertiary" className="self-start" onClick={() => update((l) => ({ ...l, hardshipPromptDismissed: true }))}>{pc.hardshipMode.notNow}</Button>
    </section>
  );
}
