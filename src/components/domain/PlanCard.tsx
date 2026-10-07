"use client";
// Spec 07 plan card ("Your plan") and its compact form for Today and the score page. Switching is free:
// no penalty and no guilt copy. Steps the app can check tick themselves; the rest have "Mark as done".
import Link from "next/link";
import { Check, ChevronRight, Circle, CircleDot, ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import { planCopy as t } from "@/content/plans";
import { formatDayMonth } from "@/lib/format";
import type { PersonaId } from "@/lib/api/types";
import type { AccountState, PlanType } from "@/lib/account/state";
import type { PlanProgress } from "@/lib/selectors/plans";
import { useAccount } from "@/lib/account/client";
import { track } from "@/lib/analytics/client";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Form";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Feedback";
import { cx } from "@/components/ui/cx";

/** Record each step once when it first shows as done (auto-checked steps complete without a tap). */
function useStepEvents(plan: PlanProgress) {
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

export function PlanCard({ persona, account, asOf, plan, options, suggested }: { persona: PersonaId; account: AccountState; asOf: string; plan: PlanProgress; options: PlanType[]; suggested: PlanType | null }) {
  const { update } = useAccount(persona, account);
  const toast = useToast();
  const [switching, setSwitching] = useState(false);
  const [limit, setLimit] = useState("");
  useStepEvents(plan);
  const start = (type: PlanType) => {
    track(account.plan || plan.explicit ? "plan_switched" : "plan_started", { plan_type: type });
    update((l) => ({ ...l, plan: { type, startedAt: asOf } }));
    setSwitching(false);
    toast({ kind: "confirm", message: t.started(t.titles[type]) });
  };
  // Marking a step done (or setting the limit) also makes a suggested plan the member's own.
  const markDone = (i: number) => update((l) => ({ ...l, plan: { ...(l.plan ?? { type: plan.type, startedAt: plan.startedAt }), manual: { ...l.plan?.manual, [String(i)]: asOf } } }));
  const saveLimit = () => {
    const n = Number(limit.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(n) || n < 0 || n > 5000) return;
    update((l) => ({ ...l, plan: { ...(l.plan ?? { type: plan.type, startedAt: plan.startedAt }), limit: Math.round(n) } }));
  };
  return (
    <section aria-labelledby="plan-h" className="mt-t2 rounded-card-s bg-surface shadow-card sm:rounded-card p-t5">
      <p className="text-caption text-text-muted">{plan.explicit ? t.heading : t.suggested} · {t.linked(plan.factor)}</p>
      <h2 id="plan-h" className="text-card text-text sm:text-card-l">{plan.title}</h2>
      {plan.type === "gambling_less" && <p className="text-caption text-text-muted">{t.optIn}</p>}
      <ol className="mt-t4 flex flex-col gap-t3">
        {plan.steps.map((s, i) => {
          const Icon = s.status === "done" ? Check : s.status === "current" ? CircleDot : Circle;
          return (
            <li key={s.label} aria-current={s.status === "current" ? "step" : undefined} className={cx("flex gap-t3", s.status === "upcoming" && "text-text-muted")}>
              <Icon aria-hidden size={20} className={cx("mt-[2px] shrink-0", s.status === "upcoming" ? "text-text-muted" : "text-accent")} />
              <div className="min-w-0 flex-1">
                <p className="text-caption text-text-muted">{t.stepOf(i + 1, plan.steps.length)}</p>
                <p className={cx("text-body", s.status === "current" ? "text-body-strong text-text" : "text-text")}>{s.label}</p>
                {s.doneOn && <p className="text-caption text-text-muted">{t.done(formatDayMonth(s.doneOn))}</p>}
                {s.status === "current" && (
                  <div className="mt-t1 flex flex-col gap-t2">
                    {s.soFar && <p className="text-small text-text"><span className="text-text-muted">{t.thisCycle}: </span>{s.soFar}</p>}
                    {s.kind === "cycle" && <p className="text-caption text-text-muted">{t.carriesOver}</p>}
                    {plan.type === "gambling_less" && i === 0 && (
                      <form noValidate className="flex items-end gap-t2" onSubmit={(e) => { e.preventDefault(); saveLimit(); }}>
                        <div className="flex-1"><TextInput label={t.limitLabel} inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} /></div>
                        <Button type="submit" variant="secondary">{t.setLimit}</Button>
                      </form>
                    )}
                    {s.kind === "manual" && (
                      <div className="flex flex-wrap gap-t2">
                        {s.link && <Link href={s.link} className="inline-flex min-h-tap items-center text-small text-accent underline-offset-2 hover:underline">{plan.type === "gambling_less" ? t.blockLink : s.label}</Link>}
                        <Button variant="secondary" onClick={() => markDone(i)}>{t.manual}</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {plan.completed && <p role="status" className="mt-t3 text-small text-text">{t.completed}</p>}
      <Button variant="tertiary" className="mt-t3" onClick={() => setSwitching(true)}>{t.switch}</Button>
      <Sheet open={switching} onClose={() => setSwitching(false)} title={t.switchTitle} subtitle={t.switchIntro}>
        <ul className="flex flex-col gap-t2">
          {options.map((type) => (
            <li key={type}>
              <button type="button" onClick={() => start(type)} aria-current={type === plan.type || undefined}
                className={cx("flex min-h-tap w-full items-center justify-between gap-t3 rounded-md border p-t4 text-left", type === plan.type ? "border-accent bg-accent-soft" : "border-divider bg-surface")}>
                <span>
                  <span className="block text-body text-text">{t.titles[type]}</span>
                  <span className="block text-caption text-text-muted">{t.linked(t.factor[type])}{type === suggested ? ` · ${t.suggested}` : ""}{type === "gambling_less" ? ` · ${t.optIn}` : ""}</span>
                </span>
                <ChevronRight aria-hidden size={20} className="shrink-0 text-accent" />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </section>
  );
}

/** Compact: Today and the score page. The gambling plan is never named here. */
export function PlanCompact({ plan, title }: { plan: PlanProgress; title: string }) {
  const step = plan.current !== null ? plan.steps[plan.current]! : null;
  return (
    <Link href="/savings" className="flex min-h-tap items-center gap-t3 rounded-card-s bg-surface shadow-card sm:rounded-card p-t4 hover:bg-surface2">
      <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-surface2 text-neutral"><ListChecks size={24} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-strong text-text">{t.heading}</span>
        <span className="block text-small text-text-muted">{step ? t.home(title, t.stepOf(plan.current! + 1, plan.steps.length), plan.type === "gambling_less" ? "" : step.label).replace(/: $/, "") : t.homeDone(title)}</span>
      </span>
      <ChevronRight aria-hidden size={20} className="text-accent" />
    </Link>
  );
}
