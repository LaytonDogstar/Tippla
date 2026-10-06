"use client";
// Onboarding funnel (spec 04/09): one event per step viewed; the bank connection time is measured from the
// connect step to the connected screen.
import { useEffect } from "react";
import { track } from "@/lib/analytics/client";
import type { EventProps } from "@/lib/analytics/registry";

export type OnboardingStepId = EventProps<"onboarding_step_viewed">["step"];
const START = "tippla-connect-start";

export function OnboardingStep({ step, connected }: { step: OnboardingStepId; connected?: boolean }) {
  useEffect(() => {
    track("onboarding_step_viewed", { step });
    try {
      if (step === "connect_bank" && !connected) sessionStorage.setItem(START, String(Date.now()));
      if (connected) {
        const start = Number(sessionStorage.getItem(START));
        if (start) { track("bank_connected", { duration_ms: Date.now() - start }); sessionStorage.removeItem(START); }
      }
    } catch { /* no storage: skip the timing */ }
  }, [step, connected]);
  return null;
}
