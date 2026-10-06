"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { healthCopy as t } from "@/content/corrections";
import type { PersonaId } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import type { ConnectionStatus } from "@/lib/selectors/connection";
import { useAccount } from "@/lib/account/client";
import { track } from "@/lib/analytics/client";
import { useToast } from "@/components/ui/Feedback";
import { OnboardingShell } from "@/components/shell/Shells";
import { Button } from "@/components/ui/Button";
import { TaleFinLogin } from "@/app/onboarding/connect-bank/talefin/TaleFinLogin";

export function ReconnectFlow({ persona, account, asOf, bank, from, returnTo }: { persona: PersonaId; account: AccountState; asOf: string; bank: string; from: ConnectionStatus; returnTo: string }) {
  const router = useRouter();
  const toast = useToast();
  const { update } = useAccount(persona, account);
  const [step, setStep] = useState<"explain" | "talefin">("explain");
  const started = useRef(Date.now());
  useEffect(() => { started.current = Date.now(); track("reconnect_started", {}); }, []);
  const done = () => {
    track("reconnect_completed", { duration_ms: Date.now() - started.current });
    if (from !== "healthy") track("connection_status_changed", { from, to: "healthy" });
    // Renewed today: fresh data and a new 12-month consent.
    update((l) => ({ ...l, bank: { ...l.bank, disconnected: false, renewedOn: asOf } }));
    toast({ kind: "confirm", message: t.flow.done });
    router.push(returnTo);
  };
  if (step === "talefin") return <TaleFinLogin bank={bank} onDone={done} cancelHref={returnTo} />;
  return (
    <OnboardingShell backHref={returnTo} title={t.flow.title} footer={<Button size="standard" full onClick={() => setStep("talefin")}>{t.flow.go}</Button>}>
      <p className="mt-t2 text-body text-text-muted">{t.flow.intro}</p>
    </OnboardingShell>
  );
}
