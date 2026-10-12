"use client";
// Spec 07 plan: the step events and the compact form for Today and the score page (the full card is on the money
// plan page, app/money-plan/MoneyPlanView). Steps the app can check tick themselves; the rest have "Mark as done".
import Link from "next/link";
import { ChevronRight, ListChecks } from "lucide-react";
import { useEffect } from "react";
import { planCopy as t } from "@/content/plans";
import type { PlanProgress } from "@/lib/selectors/plans";
import { track } from "@/lib/analytics/client";

/** Record each step once when it first shows as done (auto-checked steps complete without a tap). */
export function useStepEvents(plan: PlanProgress) {
  useEffect(() => {
    plan.steps.forEach((s, i) => {
      if (s.status !== "done") return;
      const k = `tippla-plan:${plan.type}:${plan.startedAt}:${i}`;
      try { if (localStorage.getItem(k)) return; localStorage.setItem(k, "1"); } catch { return; }
      track("plan_step_completed", { plan_type: plan.type, step: i + 1 });
      if (plan.completed && i === plan.steps.length - 1) track("plan_completed", { plan_type: plan.type });
    });
  }, [plan]);
}

/** Compact: Today and the score page. The gambling plan is never named here. */
export function PlanCompact({ plan, title }: { plan: PlanProgress; title: string }) {
  const step = plan.current !== null ? plan.steps[plan.current]! : null;
  return (
    <Link href="/money-plan" className="flex min-h-tap items-center gap-t3 rounded-card-s bg-surface shadow-card sm:rounded-card p-t4 hover:bg-surface2">
      <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-surface2 text-neutral"><ListChecks size={24} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-strong text-text">{t.heading}</span>
        <span className="block text-small text-text-muted">{step ? t.home(title, t.stepOf(plan.current! + 1, plan.steps.length), plan.type === "gambling_less" ? "" : step.label).replace(/: $/, "") : t.homeDone(title)}</span>
      </span>
      <ChevronRight aria-hidden size={20} className="text-accent" />
    </Link>
  );
}
