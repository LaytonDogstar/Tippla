"use client";
// O4: four plain steps, ~8 s simulated (real: 30–90 s). No spinner theatre; reduced motion changes nothing
// because nothing moves. ?fast=1 shortens it for tests.
import { Check, Circle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { onboarding } from "@/content/onboarding";
import { OnboardingShell } from "@/components/shell/Shells";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";

const t = onboarding.analysing;
// The first insight (spec 04); it hands over to the score reveal itself when onboarding_v2 is off.
const NEXT = "/onboarding/insight";

function Steps() {
  const router = useRouter();
  const fast = useSearchParams().get("fast") === "1";
  const [done, setDone] = useState(0);
  const finished = done >= t.steps.length;
  useEffect(() => {
    if (finished) {
      const h = setTimeout(() => router.push(NEXT), fast ? 100 : 1200);
      return () => clearTimeout(h);
    }
    const h = setTimeout(() => setDone((n) => n + 1), fast ? 150 : 2000);
    return () => clearTimeout(h);
  }, [done, finished, fast, router]);
  return (
    <OnboardingShell step="analysing" title={t.title} footer={finished ? <Button size="standard" full onClick={() => router.push(NEXT)}>{t.continue}</Button> : undefined}>
      <p className="text-body text-text-muted">{t.intro}</p>
      <ol className="mt-t5 flex flex-col gap-t2" aria-busy={!finished}>
        {t.steps.map((s, i) => {
          const state = i < done ? "done" : i === done ? "active" : "waiting";
          return (
            <li key={s} className="flex items-center gap-t3 rounded-card-s bg-surface shadow-card sm:rounded-card p-t4">
              {state === "done"
                ? <Check aria-hidden size={20} className="shrink-0 text-accent" />
                : <Circle aria-hidden size={20} className={cx("shrink-0", state === "active" ? "text-accent" : "text-text-muted")} />}
              <span className={cx("flex-1 text-body", state === "waiting" ? "text-text-muted" : "text-text")}>{s}</span>
              <span className="sr-only">{state === "done" ? t.done : state === "active" ? t.inProgress : t.waiting}</span>
            </li>
          );
        })}
      </ol>
      <p role="status" className="mt-t4 text-small text-text-muted">{finished ? t.finished : t.steps[done]}</p>
    </OnboardingShell>
  );
}

export default function Analysing() {
  return <Suspense><Steps /></Suspense>;
}
