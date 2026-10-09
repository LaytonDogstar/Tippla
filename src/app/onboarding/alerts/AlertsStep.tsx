"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { notifyOptInCopy as t } from "@/content/firstValue";
import type { AccountState } from "@/lib/account/state";
import type { PersonaId } from "@/lib/api/types";
import { useAccount } from "@/lib/account/client";
import { track } from "@/lib/analytics/client";
import { enablePush } from "@/lib/notify/enablePush";
import { OnboardingShell } from "@/components/shell/Shells";
import { Button } from "@/components/ui/Button";

export function AlertsStep({ persona, account, asOf }: { persona: PersonaId; account: AccountState; asOf: string }) {
  const router = useRouter();
  const { update } = useAccount(persona, account);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // Finishing onboarding: remember the date (first-week nudge, first payday) and land on Today.
  const finish = () => { update((l) => ({ ...l, onboardedAt: asOf })); router.push("/"); };
  const yes = async () => {
    setBusy(true);
    const r = await enablePush();
    track("push_opt_in", { accepted: r === "on" });
    setBusy(false);
    if (r === "on") finish();
    else setNote(t.blocked);
  };
  const no = () => { track("push_opt_in", { accepted: false }); finish(); };
  return (
    <OnboardingShell step="notifications" backHref="/onboarding/goal" title={t.title}
      footer={note
        ? <Button size="standard" full onClick={finish}>{t.done}</Button>
        : <><Button size="standard" full disabled={busy} onClick={yes}>{t.yes}</Button><Button size="standard" variant="link" full disabled={busy} onClick={no}>{t.no}</Button></>}>
      <p className="mt-t2 text-body text-text">{t.body}</p>
      <p className="mt-t4 text-small text-text-muted">{t.later}</p>
      {note && <p role="status" className="mt-t4 rounded-md bg-info-soft p-t4 text-small text-text">{note}</p>}
    </OnboardingShell>
  );
}
