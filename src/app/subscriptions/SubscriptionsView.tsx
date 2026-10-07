"use client";
// Actions per row: Keep · Remind me before next charge · How to cancel. Choices persist per persona (mock:
// localStorage). Nothing here is urgent and nothing is pre-ticked.
import { cancelExtraCopy as cx_ } from "@/content/actions";
import { cancelGuide } from "@/data/directories";
import { RuleChoiceSheet, SUBSCRIPTION_OPTIONS } from "@/components/domain/RuleChoice";
import { correctionCopy } from "@/content/corrections";
import { BellRing, Check, ExternalLink, Repeat } from "lucide-react";
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
/** Spec 06: "Still using this?" for subscriptions over this much a month. */
const USAGE_CHECK_MIN = 10;

export function SubscriptionsView({ persona, subs, account, asOf, confirm, chargedAgain, cancelHelper = true, corrections = false }: { persona: PersonaId; subs: Subs; account: AccountState; asOf: string; confirm: Record<string, string>; chargedAgain: ChargedAgain[]; cancelHelper?: boolean; corrections?: boolean }) {
  const [fixing, setFixing] = useState<string | null>(null);
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
  useEffect(() => { if (cancelHelper && chargedAgain.length) track("cancel_failed_detected", {}); }, [cancelHelper, chargedAgain.length]);
  const save = (next: Prefs) => { setPrefs(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* in memory only */ } };

  if (!subs.rows.length) return <div className="mt-t4"><EmptyState variant="noSubscriptions" onAction={() => router.push("/spending")} /></div>;
  const row = subs.rows.find((r) => r.merchant === howTo);
  const guide = row ? cancelGuide(row.merchant) : null;

  return (
    <div className="pb-t6">
      <section className="mt-t2 rounded-card-s bg-surface shadow-card sm:rounded-card p-t5">
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
              <article aria-labelledby={`sub-${s.merchant.replace(/\W+/g, "-")}`} className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t4">
                <div className="flex items-start gap-t3">
                  <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-surface2" style={{ color: catVar("subscriptions") }}><Repeat size={24} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-t3">
                      <h2 id={`sub-${s.merchant.replace(/\W+/g, "-")}`} className="text-card text-text sm:text-card-l">{s.merchant}</h2>
                      <span className="tnum text-body-strong text-text">{t.amount(formatCents(s.amount), t.cadence[s.cadence])}</span>
                    </div>
                    <p className="mt-t1 text-caption text-text-muted">{t.lastCharged(formatShortDay(s.last_charged))} · {t.nextCharge(formatShortDay(s.nextCharge))}</p>
                    <p className="tnum mt-t1 text-small text-text">{t.perCycle(formatCents(s.perPayCycle))} · {t.perYear(formatCents(s.perYear))}</p>
                    {/* Spec 06: usage check for subscriptions over $10 a month (until answered or cancelled). */}
                    {cancelHelper && s.amount > USAGE_CHECK_MIN && !kept && !cancelled.has(s.merchant) && (
                      <div className="mt-t2 flex flex-wrap items-center gap-x-t2 rounded-sm bg-surface2 px-t3 py-t1">
                        <span className="text-small text-text">{cx_.stillUsing(s.merchant)}</span>
                        <Button variant="tertiary" onClick={() => save({ ...prefs, kept: { ...prefs.kept, [s.merchant]: true } })} aria-label={`${cx_.yes}: ${cx_.stillUsing(s.merchant)}`}>{cx_.yes}</Button>
                        <Button variant="tertiary" onClick={() => { track("cancel_guide_opened", { merchant: s.merchant }); setHowTo(s.merchant); }} aria-label={`${cx_.no}: ${cx_.stillUsing(s.merchant)}`}>{cx_.no}</Button>
                      </div>
                    )}
                    {(kept || reminder) && (
                      <p className="mt-t2 flex flex-wrap gap-t3 text-caption text-text-muted">
                        {kept && <span className="inline-flex items-center gap-t1"><Check aria-hidden size={16} />{t.kept}</span>}
                        {reminder && <span className="inline-flex items-center gap-t1"><BellRing aria-hidden size={16} />{t.reminderSet(formatShortDay(reminder))}</span>}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-t3 flex flex-wrap gap-t2 border-t border-divider pt-t3">
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
                  {corrections && <Button variant="tertiary" onClick={() => setFixing(s.merchant)} aria-label={correctionCopy.notRightFor(s.merchant)}>{correctionCopy.notRight}</Button>}
                </div>
              </article>
            </li>
          );
        })}
      </ul>
      <RuleChoiceSheet persona={persona} merchant={fixing ?? ""} title={fixing ? correctionCopy.subscription.title(fixing) : ""} options={SUBSCRIPTION_OPTIONS} open={!!fixing} onClose={() => setFixing(null)} />
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
              {(guide?.steps ?? t.cancelSteps(row.merchant, formatShortDay(row.nextCharge))).map((step) => <li key={step}>{step}</li>)}
            </ol>
            {guide?.deepLink && (
              <a href={guide.deepLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-tap items-center gap-t2 text-body-strong text-accent underline-offset-2 hover:underline">
                {cx_.openCancelPage(row.merchant)}<ExternalLink aria-hidden size={16} /><span className="sr-only"> {cx_.opensInNewTab}</span>
              </a>
            )}
            {guide?.steps && <p className="text-small text-text">{cx_.nextCharge(formatShortDay(row.nextCharge))}</p>}
            {guide?.notes && <p className="text-small text-text">{guide.notes}</p>}
            {guide?.steps && <p className="text-caption text-text-muted">{cx_.stepsChange(row.merchant)}</p>}
            {/* Merchant notes already say where to cancel when it's billed through an app store or a partner. */}
            {!guide?.notes && <p className="text-small text-text-muted">{t.cancelStore}</p>}
            <p className="text-small text-text-muted">{t.cancelAfter}</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
