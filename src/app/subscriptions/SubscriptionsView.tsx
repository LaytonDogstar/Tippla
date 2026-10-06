"use client";
// Actions per row: Keep · Remind me before next charge · How to cancel. Choices persist per persona (mock:
// localStorage). Nothing here is urgent and nothing is pre-ticked.
import { BellRing, Check, Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PersonaId } from "@/lib/api/types";
import { subscriptionsPage as t } from "@/content/spending";
import { addDays, formatCents, formatDayMonth, formatShortDay, formatWhole } from "@/lib/format";
import type { subscriptions } from "@/lib/selectors/subscriptions";
import { catVar } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { EmptyState, useToast } from "@/components/ui/Feedback";
import { Sheet } from "@/components/ui/Sheet";
import { tallyCopy } from "@/content/loop";
import { track } from "@/lib/analytics/client";
import { useAccount } from "@/lib/account/client";
import { mockNow, type AccountState } from "@/lib/account/state";
import type { ChargedAgain } from "@/lib/selectors/tally";

type Subs = ReturnType<typeof subscriptions>;
interface Prefs { kept: Record<string, boolean>; reminders: Record<string, string> }
const KEY = "tippla-subscriptions";

export function SubscriptionsView({ persona, subs, account, asOf, confirm, chargedAgain, cancelHelper = true }: { persona: PersonaId; subs: Subs; account: AccountState; asOf: string; confirm: Record<string, string>; chargedAgain: ChargedAgain[]; cancelHelper?: boolean }) {
  const router = useRouter();
  const { account: acct, update } = useAccount(persona, account);
  const cancelled = new Set((acct.actions ?? []).filter((a) => a.type === "cancelled_subscription").map((a) => a.key));
  // Recorded so the value tally can confirm it once the next charge doesn't come out.
  const markCancelled = (merchant: string) => {
    track("cancel_marked", { merchant });
    update((l) => ({ ...l, actions: [...(l.actions ?? []).filter((a) => !(a.type === "cancelled_subscription" && a.key === merchant)), { type: "cancelled_subscription", key: merchant, at: mockNow({ asOf }) }] }));
    toast({ kind: "confirm", message: tallyCopy.cancelledToast(merchant) });
  };
  const toast = useToast();
  const key = `${KEY}:${persona}`;
  const [prefs, setPrefs] = useState<Prefs>({ kept: {}, reminders: {} });
  const [howTo, setHowTo] = useState<string | null>(null);
  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem(key) ?? "null") as Prefs | null; if (v?.kept && v?.reminders) setPrefs(v); } catch { /* fall back to defaults */ }
  }, [key]);
  const save = (next: Prefs) => { setPrefs(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* in memory only */ } };

  if (!subs.rows.length) return <div className="mt-t4"><EmptyState variant="noSubscriptions" onAction={() => router.push("/spending")} /></div>;
  const row = subs.rows.find((r) => r.merchant === howTo);

  return (
    <div className="pb-t6">
      <section className="mt-t2 rounded-lg bg-surface p-t5">
        <p className="text-small text-text-muted">{t.count(subs.rows.length)}</p>
        <p className="tnum mt-t2 text-h2 font-display text-text">{t.total(formatWhole(subs.totalPerPayCycle), formatWhole(subs.totalPerYear))}</p>
        <p className="mt-t2 text-small text-text-muted">{t.intro}</p>
      </section>
      <ul className="mt-t3 flex flex-col gap-t3">
        {subs.rows.map((s) => {
          const kept = !!prefs.kept[s.merchant];
          const reminder = prefs.reminders[s.merchant];
          return (
            <li key={s.merchant}>
              <article aria-labelledby={`sub-${s.merchant}`} className="rounded-md bg-surface p-t4">
                <div className="flex items-start gap-t3">
                  <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-surface2" style={{ color: catVar("subscriptions") }}><Repeat size={24} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-t3">
                      <h2 id={`sub-${s.merchant}`} className="text-h3 text-text">{s.merchant}</h2>
                      <span className="tnum text-body-strong text-text">{t.amount(formatCents(s.amount), t.cadence[s.cadence])}</span>
                    </div>
                    <p className="mt-t1 text-caption text-text-muted">{t.lastCharged(formatShortDay(s.last_charged))} · {t.nextCharge(formatShortDay(s.nextCharge))}</p>
                    <p className="tnum mt-t1 text-small text-text">{t.perCycle(formatCents(s.perPayCycle))} · {t.perYear(formatCents(s.perYear))}</p>
                    {(kept || reminder) && (
                      <p className="mt-t2 flex flex-wrap gap-t3 text-caption text-text-muted">
                        {kept && <span className="inline-flex items-center gap-t1"><Check aria-hidden size={16} />{t.kept}</span>}
                        {reminder && <span className="inline-flex items-center gap-t1"><BellRing aria-hidden size={16} />{t.reminderSet(formatShortDay(reminder))}</span>}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-t3 flex flex-wrap gap-t2 border-t border-line pt-t3">
                  <Button variant="tertiary" aria-pressed={kept} onClick={() => {
                    const before = prefs;
                    save({ ...prefs, kept: { ...prefs.kept, [s.merchant]: !kept } });
                    if (!kept) toast({ kind: "confirm", message: t.keptToast(s.merchant), onUndo: () => save(before) });
                  }}>{t.keep}</Button>
                  {reminder ? (
                    <Button variant="tertiary" onClick={() => { const r = { ...prefs.reminders }; delete r[s.merchant]; save({ ...prefs, reminders: r }); }}>{t.cancelReminder}</Button>
                  ) : (
                    <Button variant="tertiary" onClick={() => {
                      const before = prefs;
                      save({ ...prefs, reminders: { ...prefs.reminders, [s.merchant]: s.remindOn } });
                      toast({ kind: "confirm", message: t.reminderToast(s.merchant, formatShortDay(s.remindOn)), onUndo: () => save(before) });
                    }}>{t.remind}</Button>
                  )}
                  <Button variant="tertiary" onClick={() => { track("cancel_guide_opened", { merchant: s.merchant }); setHowTo(s.merchant); }}>{t.howToCancel}</Button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
      <Sheet open={!!row} onClose={() => setHowTo(null)} title={row ? t.cancelTitle(row.merchant) : ""}
        footer={row && cancelHelper ? (cancelled.has(row.merchant)
          ? <p role="status" className="text-small text-text-muted">{(() => {
              const again = chargedAgain.find((c) => c.merchant === row.merchant);
              return again ? tallyCopy.chargedAgain(row.merchant, formatCents(again.amount), formatDayMonth(again.date))
                : tallyCopy.cancelledNote(formatDayMonth(confirm[row.merchant] ?? addDays(row.nextCharge, 3)));
            })()}</p>
          : <Button full variant="secondary" onClick={() => markCancelled(row.merchant)}>{tallyCopy.cancelled}</Button>) : undefined}>
        {row && (
          <div className="flex flex-col gap-t4">
            <ol className="flex list-decimal flex-col gap-t2 pl-t5 text-body text-text">
              {t.cancelSteps(row.merchant, formatShortDay(row.nextCharge)).map((step) => <li key={step}>{step}</li>)}
            </ol>
            <p className="text-small text-text-muted">{t.cancelStore}</p>
            <p className="text-small text-text-muted">{t.cancelAfter}</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
