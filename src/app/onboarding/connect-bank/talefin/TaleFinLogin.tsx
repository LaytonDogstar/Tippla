"use client";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { onboarding } from "@/content/onboarding";
import { writeOnboarding } from "@/lib/onboarding/store";

const t = onboarding.talefin;

/** The mock TaleFin login. Onboarding by default; the reconnect flow (spec 05) passes its own completion. */
export function TaleFinLogin({ bank, onDone, cancelHref = "/onboarding/connect-bank" }: { bank: string; onDone?: () => void; cancelHref?: string }) {
  const router = useRouter();
  const [returning, setReturning] = useState(false);
  const submit = () => {
    setReturning(true);
    if (onDone) { setTimeout(onDone, 900); return; }
    writeOnboarding({ bankConnected: true });
    setTimeout(() => router.push("/onboarding/connect-bank/done"), 900);
  };
  if (returning) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-bg px-gutter text-text">
        <p role="status" className="text-h2 font-display">{onboarding.connect.returning}</p>
      </main>
    );
  }
  // Third-party look: plain neutral page, no Tippla brand, no app chrome.
  return (
    <main className="min-h-[100dvh] bg-surface2 text-text">
      <header className="flex items-center gap-t2 border-b border-divider bg-surface px-gutter py-t4">
        <Lock aria-hidden size={16} className="text-neutral" />
        <p className="text-body-strong">{t.badge}</p>
      </header>
      <div className="mx-auto max-w-[420px] px-gutter py-t5">
        <p className="rounded-sm bg-info-soft p-t3 text-small text-info">{t.note}</p>
        <h1 className="mt-t5 text-h2">{t.loginTitle(bank)}</h1>
        <form className="mt-t4 flex flex-col gap-t4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <label className="text-small">{t.clientNumber}
            <input name="client" autoComplete="off" className="mt-t2 block h-[48px] w-full rounded-xs border border-neutral bg-surface px-t3 text-body" />
          </label>
          <label className="text-small">{t.password}
            <input name="password" type="password" autoComplete="off" className="mt-t2 block h-[48px] w-full rounded-xs border border-neutral bg-surface px-t3 text-body" />
          </label>
          <p className="text-caption text-text-muted">{t.readOnly}</p>
          <button type="submit" className="min-h-[48px] rounded-xs bg-text text-body-strong text-bg">{t.login}</button>
        </form>
        <Link href={cancelHref} className="mt-t4 flex min-h-tap items-center justify-center text-small text-text-muted underline">{t.cancel}</Link>
      </div>
    </main>
  );
}
