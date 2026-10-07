"use client";
import { Landmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { onboarding } from "@/content/onboarding";
import { OnboardingShell } from "@/components/shell/Shells";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

const t = onboarding.connect;

export function ConnectedAccounts({ accounts }: { accounts: { id: number; bank: string; nickname: string; last4: string }[] }) {
  const router = useRouter();
  const [sheet, setSheet] = useState(false);
  return (
    <OnboardingShell step="connect_bank" connected backHref="/onboarding/connect-bank" title={t.otherTitle}
      footer={<>
        <Button size="standard" full onClick={() => router.push("/onboarding/analysing")}>{t.thatsAll}</Button>
        <Button variant="secondary" size="standard" full onClick={() => setSheet(true)}>{t.addAnother}</Button>
      </>}>
      <ul className="flex flex-col gap-t2">
        {accounts.map((a) => (
          <li key={a.id} className="flex items-center gap-t3 rounded-card-s bg-surface shadow-card sm:rounded-card p-t4">
            <span aria-hidden className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-sm bg-surface2 text-neutral"><Landmark size={24} /></span>
            <span className="text-body-strong text-text">{t.connected(a.bank, a.nickname, a.last4)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-t5 text-body text-text-muted">{t.otherBody}</p>
      <Sheet open={sheet} onClose={() => setSheet(false)} title={t.addAnotherSheetTitle} footer={<Button full onClick={() => setSheet(false)}>{t.addAnotherOk}</Button>}>
        <p className="text-body text-text-muted">{t.addAnotherSheetBody}</p>
      </Sheet>
    </OnboardingShell>
  );
}
