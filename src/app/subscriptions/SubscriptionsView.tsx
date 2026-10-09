"use client";
// Progressive disclosure per row (UX round 2, 6.5): "Still using it? Yes / No" first; Yes → Kept (with an optional
// reminder), No → How to cancel and a reminder. "Not right?" and How to cancel are always in the ⋯ menu. Answers
// persist per persona (mock: localStorage). Nothing here is urgent and nothing is pre-ticked.
import { cancelExtraCopy as cx_ } from "@/content/actions";
import { cancelGuide } from "@/data/directories";
import { RuleChoiceSheet, SUBSCRIPTION_OPTIONS } from "@/components/domain/RuleChoice";
import { correctionCopy } from "@/content/corrections";
import { BellRing, Check, Ellipsis, ExternalLink, Repeat } from "lucide-react";
import { PageColumns } from "@/components/shell/PageColumns";
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
interface Prefs { kept: Record<string, boolean>; reminders: Record<string, string>; notUsing?: Record<string, boolean> }
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
  const [menu, setMenu] = useState<string | null>(null);
  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem(key) ?? "null") as Prefs | null; if (v?.kept && v?.reminders) setPrefs(v); } catch { /* fall back to defaults */ }
  }, [key]);
  useEffect(() => { if (cancelHelper && chargedAgain.length) track("cancel_failed_detected", {}); }, [cancelHelper, chargedAgain.length]);
  const save = (next: Prefs) => { setPrefs(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* in memory only */ } };

  if (!subs.rows.length) return <div className="mt-t4"><EmptyState variant="noSubscriptions" onAction={() => router.push("/spending")} /></div>;
  const row = subs.rows.find((r) => r.merchant === howTo);
  const guide = row ? cancelGuide(row.merchant) : null;

  const notUsing = subs.rows.filter((r) => prefs.notUsing?.[r.merchant] && !cancelled.has(r.merchant));
  const answer = (merchant: string, using: boolean) => {
    const before = prefs;
    save({ ...prefs, kept: { ...prefs.kept, [merchant]: using }, notUsing: { ...prefs.notUsing, [merchant]: !using } });
    if (using) toast({ kind: "confirm", message: t.keptToast(merchant), onUndo: () => save(before) });
    else track("cancel_guide_opened", { merchant });
  };
  const remind = (s: Subs["rows"][number]) => {
    const before = prefs;
    save({ ...prefs, reminders: { ...prefs.reminders, [s.merchant]: s.remindOn } });
    toast({ kind: "confirm", message: t.reminderToast(s.merchant, formatShortDay(s.remindOn)), onUndo: () => save(before) });
  };
  const reminderButton = (s: Subs["rows"][number]) => prefs.reminders[s.merchant]
    ? <Button variant="tertiary" onClick={() => { const r = { ...prefs.reminders }; delete r[s.merchant]; save({ ...prefs, reminders: r }); }}>{t.cancelReminder}</Button>
    : <Button variant="link" onClick={() => remind(s)}>{t.remind}</Button>;

  // Rail (UX round 2, 4.1): the totals, and the ones you said you don't use with what cancelling would save.
  const rail = (
    <>
      <section className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
        <p className="text-body14 text-text-muted">{t.count(subs.rows.length)}</p>
        <p className="tnum mt-t2 text-section-num text-text">{formatWhole(subs.totalPerPayCycle)} <span className="text-body14 font-semibold text-text-secondary">{t.perCycleShort}</span></p>
        <p className="tnum text-body14 text-text-secondary">{t.perYearLine(formatWhole(subs.totalPerYear))}</p>
        <p className="mt-t2 text-meta text-text-muted">{t.intro}</p>
      </section>
      <section aria-labelledby="not-using-h" className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
        <h2 id="not-using-h" className="text-card text-text sm:text-card-l">{t.notUsingHeading}</h2>
        {notUsing.length ? (
          <>
            <ul className="mt-t2 flex flex-col">
              {notUsing.map((r) => (
                <li key={r.merchant} className="flex min-h-[52px] items-center justify-between gap-t3 border-t border-divider first:border-t-0">
                  <span className="text-body14 font-semibold text-text">{r.merchant}</span>
                  <span className="tnum text-body14 text-text">{t.perYearShort(formatCents(r.perYear))}</span>
                </li>
              ))}
            </ul>
            <p className="tnum mt-t3 rounded-inset bg-positive-soft px-t4 py-t3 text-body14 font-semibold text-positive">{t.notUsingSaving(formatWhole(notUsing.reduce((n, r) => n + r.perYear, 0)))}</p>
          </>
        ) : <p className="mt-t2 text-body14 text-text-muted">{t.notUsingNone}</p>}
      </section>
    </>
  );

  return (
    <div className="pb-t6">
      <PageColumns railLabel={t.railLabel} rail={rail} main={
      <ul className="mt-t2 flex flex-col gap-t3">
        {subs.rows.map((s) => {
          const id = `sub-${s.merchant.replace(/\W+/g, "-")}`;
          // Progressive disclosure (UX round 2, 6.5): the question first; Yes → Kept; No → how to cancel.
          const asked = cancelHelper && s.amount > USAGE_CHECK_MIN;
          const state = cancelled.has(s.merchant) ? "cancelled" : prefs.notUsing?.[s.merchant] ? "no" : prefs.kept[s.merchant] ? "kept" : asked ? "ask" : "quiet";
          const reminder = prefs.reminders[s.merchant];
          return (
            <li key={s.merchant}>
              <article aria-labelledby={id} className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
                <div className="flex items-start gap-t3">
                  <span aria-hidden className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-pill bg-chip" style={{ color: catVar("subscriptions") }}><Repeat size={20} strokeWidth={1.8} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-t3">
                      <h2 id={id} className="text-row text-text">{s.merchant}</h2>
                      <span className="tnum text-row text-text">{t.amount(formatCents(s.amount), t.cadence[s.cadence])}</span>
                    </div>
                    <p className="mt-t1 text-meta text-text-muted">{t.nextCharge(formatShortDay(s.nextCharge))} · {t.perYear(formatCents(s.perYear))}</p>
                  </div>
                  <button type="button" onClick={() => setMenu(s.merchant)} aria-label={t.moreFor(s.merchant)} aria-haspopup="dialog"
                    className="-mr-t2 -mt-t2 flex h-tap w-tap shrink-0 items-center justify-center rounded-pill text-icon-muted hover:bg-surface2">
                    <Ellipsis aria-hidden size={20} strokeWidth={1.8} />
                  </button>
                </div>
                <div className="mt-t3 border-t border-divider pt-t3">
                  {state === "ask" && (
                    <div className="flex flex-wrap items-center gap-x-t2">
                      <span className="text-body14 font-semibold text-text">{cx_.stillUsing(s.merchant)}</span>
                      <Button variant="secondary" onClick={() => answer(s.merchant, true)} aria-label={`${cx_.yes}: ${cx_.stillUsing(s.merchant)}`}>{cx_.yes}</Button>
                      <Button variant="secondary" onClick={() => answer(s.merchant, false)} aria-label={`${cx_.no}: ${cx_.stillUsing(s.merchant)}`}>{cx_.no}</Button>
                    </div>
                  )}
                  {(state === "kept" || state === "quiet") && (
                    <div className="flex flex-wrap items-center gap-x-t3">
                      {state === "kept" && <span className="inline-flex items-center gap-t1 rounded-pill bg-positive-soft px-t3 py-[3px] text-meta font-semibold text-positive"><Check aria-hidden size={14} />{t.kept}</span>}
                      {reminderButton(s)}
                    </div>
                  )}
                  {state === "no" && (
                    <div className="flex flex-wrap items-center gap-t2">
                      <Button variant="secondary" onClick={() => { track("cancel_guide_opened", { merchant: s.merchant }); setHowTo(s.merchant); }}>{t.howToCancel}</Button>
                      {reminderButton(s)}
                    </div>
                  )}
                  {state === "cancelled" && <p className="text-body14 text-text-muted">{t.cancelledState}</p>}
                  {reminder && <p className="mt-t1 inline-flex items-center gap-t1 text-meta text-text-muted"><BellRing aria-hidden size={14} />{t.reminderSet(formatShortDay(reminder))}</p>}
                </div>
              </article>
            </li>
          );
        })}
      </ul>} />
      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu ?? ""}>
        {menu && (
          <div className="flex flex-col gap-t2">
            <Button full variant="secondary" onClick={() => { const m = menu; setMenu(null); track("cancel_guide_opened", { merchant: m }); setHowTo(m); }}>{t.howToCancel}</Button>
            {(prefs.kept[menu] || prefs.notUsing?.[menu]) && <Button full variant="link" onClick={() => { const m = menu; setMenu(null); const k = { ...prefs.kept }; delete k[m]; const n = { ...prefs.notUsing }; delete n[m]; save({ ...prefs, kept: k, notUsing: n }); }}>{t.changeAnswer}</Button>}
            {corrections && <Button full variant="link" onClick={() => { const m = menu; setMenu(null); setFixing(m); }} aria-label={correctionCopy.notRightFor(menu)}>{correctionCopy.notRight}</Button>}
          </div>
        )}
      </Sheet>
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
