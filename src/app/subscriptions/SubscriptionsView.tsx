"use client";
// Subscriptions (redesign 12/10/2026; reference: subscriptions-mockup.dc.html). One column, like Spending:
// 1 Your subscriptions (the average per pay cycle, next charge, how many checked, and a streaming insight when there
// are two or more), 2 Quick check (one subscription at a time: Yes / No / Not sure), 3 Coming up (every subscription
// by pay cycle; a row opens to its figures, a reminder, how to cancel, "Not a subscription" and the answer), and
// 4 Could save (only once something is marked "Not using"). Answers and reminders persist per persona (mock:
// localStorage). Nothing here is urgent and nothing is pre-ticked.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BellRing, Check, ChevronDown, ExternalLink, Tv } from "lucide-react";
import type { PersonaId } from "@/lib/api/types";
import { cancelExtraCopy as cx_ } from "@/content/actions";
import { cancelGuide } from "@/data/directories";
import { subscriptionsPage as t } from "@/content/spending";
import { tallyCopy } from "@/content/loop";
import { addDays, formatCents, formatDayMonth, formatShortDay, formatWhole } from "@/lib/format";
import {
  checkedCounts, couldSave, cycleGroups, nextCharge, reviewQueue, statusOf, streamingInsight,
  type Answer, type Answers, type CycleGroup, type SubRow,
} from "@/lib/selectors/subscriptionReview";
import type { ChargedAgain } from "@/lib/selectors/tally";
import { track } from "@/lib/analytics/client";
import { useAccount } from "@/lib/account/client";
import { RuleChoiceSheet, SUBSCRIPTION_OPTIONS } from "@/components/domain/RuleChoice";
import { correctionCopy } from "@/content/corrections";
import { mockNow, type AccountState } from "@/lib/account/state";
import { Section, GROUP_GAP } from "@/components/shell/Sections";
import { Button } from "@/components/ui/Button";
import { EmptyState, useToast } from "@/components/ui/Feedback";
import { SampleTag } from "@/components/ui/SampleTag";
import { Sheet } from "@/components/ui/Sheet";
import { cx } from "@/components/ui/cx";
import { useRouter } from "next/navigation";

type Row = SubRow & { perYear: number; remindOn: string };
interface Prefs { answers?: Answers; reminders: Record<string, string>; kept?: Record<string, boolean>; notUsing?: Record<string, boolean> }
const KEY = "tippla-subscriptions";

/** Answers saved before the redesign (kept / notUsing) read as Yes / No. */
const answersOf = (p: Prefs): Answers => p.answers ?? Object.fromEntries([
  ...Object.entries(p.kept ?? {}).filter(([, v]) => v).map(([m]) => [m, "keep" as const]),
  ...Object.entries(p.notUsing ?? {}).filter(([, v]) => v).map(([m]) => [m, "drop" as const]),
]);

/** A soft tint per subscription for its initial (no brand logos). */
const TINTS = ["bg-accent-soft text-accent-strong", "bg-positive-soft text-positive", "bg-caution-soft text-caution", "bg-info-soft text-info", "bg-surface2 text-text-secondary"];
const tintFor = (m: string) => TINTS[[...m].reduce((n, ch) => n + ch.charCodeAt(0), 0) % TINTS.length]!;
const STATUS = {
  using: "bg-positive-soft text-positive",
  notUsing: "bg-negative-soft text-negative",
  toCheck: "bg-chip text-text-secondary",
  cancelled: "bg-surface2 text-text-secondary",
} as const;

export function SubscriptionsView({ persona, rows, account, asOf, nextPayday, cycleDays, confirm, chargedAgain, cancelHelper = true, corrections = false, present = false }: {
  persona: PersonaId; rows: Row[]; account: AccountState; asOf: string; nextPayday: string; cycleDays: number;
  confirm: Record<string, string>; chargedAgain: ChargedAgain[]; cancelHelper?: boolean; corrections?: boolean; present?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { account: acct, update } = useAccount(persona, account);
  const [fixing, setFixing] = useState<string | null>(null);
  const cancelled = useMemo(() => new Set((acct.actions ?? []).filter((a) => a.type === "cancelled_subscription").map((a) => a.key ?? "")), [acct.actions]);
  const key = `${KEY}:${persona}`;
  const [prefs, setPrefs] = useState<Prefs>({ reminders: {} });
  const [open, setOpen] = useState<string | null>(null);
  const [howTo, setHowTo] = useState<string | null>(null);
  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem(key) ?? "null") as Prefs | null; if (v?.reminders) setPrefs(v); } catch { /* fall back to defaults */ }
  }, [key]);
  useEffect(() => { if (cancelHelper && chargedAgain.length) track("cancel_failed_detected", {}); }, [cancelHelper, chargedAgain.length]);
  const save = (next: Prefs) => { setPrefs(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* in memory only */ } };

  const answers = answersOf(prefs);
  const setAnswer = (merchant: string, a: Answer | undefined) => {
    const before = prefs;
    const next = { ...answers };
    if (a) next[merchant] = a; else delete next[merchant];
    save({ reminders: prefs.reminders, answers: next });
    if (a === "drop") track("cancel_guide_opened", { merchant });
    toast({ kind: "confirm", message: a === "keep" ? t.keptToast(merchant) : a === "drop" ? t.droppedToast(merchant) : t.laterToast(merchant), onUndo: () => save(before) });
  };
  const remind = (s: Row) => {
    const before = prefs;
    save({ ...prefs, answers, reminders: { ...prefs.reminders, [s.merchant]: s.remindOn } });
    toast({ kind: "confirm", message: t.reminderToast(s.merchant, formatShortDay(s.remindOn)), onUndo: () => save(before) });
  };
  const unremind = (m: string) => { const r = { ...prefs.reminders }; delete r[m]; save({ ...prefs, answers, reminders: r }); };
  const markCancelled = (merchant: string) => {
    track("cancel_marked", { merchant });
    update((l) => ({ ...l, actions: [...(l.actions ?? []).filter((a) => !(a.type === "cancelled_subscription" && a.key === merchant)), { type: "cancelled_subscription", key: merchant, at: mockNow({ asOf }) }] }));
    toast({ kind: "confirm", message: tallyCopy.cancelledToast(merchant) });
  };
  const openHowTo = (m: string) => { track("cancel_guide_opened", { merchant: m }); setHowTo(m); };

  if (!rows.length) return <div className="mx-auto mt-t4 w-full max-w-[660px]"><EmptyState variant="noSubscriptions" onAction={() => router.push("/spending")} /></div>;

  const queue = reviewQueue(rows, answers);
  const counts = checkedCounts(rows, answers);
  const groups = cycleGroups(rows, asOf, nextPayday, cycleDays);
  const next = nextCharge(rows, nextPayday);
  const streaming = streamingInsight(rows);
  const saving = couldSave(rows, answers, cancelled, cycleDays);
  const monthly = rows.reduce((n, r) => n + r.amount, 0);
  const perCycleTotal = rows.reduce((n, r) => n + r.perPayCycle, 0);
  const guideRow = rows.find((r) => r.merchant === howTo) ?? null;
  const guide = guideRow ? cancelGuide(guideRow.merchant) : null;

  return (
    <div className={cx("mx-auto flex w-full max-w-[660px] flex-col pb-t6", GROUP_GAP)}>
      <Section id="s-yours" n={1} title={t.sections.yours.title} desc={t.sections.yours.desc}>
        <div className="flex flex-col gap-t4 rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
          <div className="flex items-center justify-between gap-t3">
            <span className="text-meta font-semibold text-text-muted">{t.count(rows.length)}</span>
            <Link href="/calendar" className="inline-flex min-h-tap items-center text-meta font-semibold text-accent">{t.seeInCalendar}</Link>
          </div>
          <div>
            <p className="tnum flex flex-wrap items-baseline gap-x-t2">
              <span className="text-[2.5rem] font-extrabold leading-none tracking-[-0.03em] text-text">{formatWhole(perCycleTotal)}</span>
              <span className="text-body14 font-semibold text-text">{t.perCycleAverage}</span>
            </p>
            <p className="tnum mt-t1 text-meta text-text-muted">{t.spread(formatCents(monthly), formatCents(monthly * 12), cycleDays)}</p>
          </div>
          <dl className="grid grid-cols-2 gap-t2">
            {next && (
              <div className="rounded-inset bg-surface2 px-t3 py-[10px]">
                <dt className="text-meta-s text-text-muted">{t.nextChargeLabel}</dt>
                <dd className="tnum text-body14 font-bold text-text">{t.nextChargeValue(formatCents(next.amount), next.merchant)}</dd>
                <dd className="text-meta-s text-text-muted">{t.nextChargeWhen(formatShortDay(next.nextCharge), next.afterPayday)}</dd>
              </div>
            )}
            <div className="rounded-inset bg-surface2 px-t3 py-[10px]">
              <dt className="text-meta-s text-text-muted">{t.checkedLabel}</dt>
              <dd className="tnum text-body14 font-bold text-text">{t.checkedValue(counts.checked, counts.total)}</dd>
              <dd className="text-meta-s text-text-muted">{t.checkedSub(counts.toCheck)}</dd>
            </div>
          </dl>
          {streaming && (
            <div className="flex items-start gap-t3 rounded-[14px] bg-accent-soft px-[14px] py-t3">
              <Tv aria-hidden size={20} className="mt-[1px] shrink-0 text-accent-strong" />
              <div className="min-w-0 flex-1">
                <p className="text-body14 font-bold text-text">{t.streaming.title(streaming.names.length)}</p>
                <p className="tnum mt-[2px] text-meta text-text-secondary">{t.streaming.body(listNames(streaming.names), formatCents(streaming.monthly), formatCents(streaming.yearly), streaming.names.length)}</p>
                <SampleTag q="Streaming list" present={present} className="mt-t1" />
              </div>
              <a href="#s-check" className="inline-flex min-h-tap shrink-0 items-center self-center text-meta font-bold text-accent-strong">{t.streaming.check}<span className="sr-only"> {t.streaming.checkSr}</span></a>
            </div>
          )}
        </div>
      </Section>

      <Section id="s-check" n={2} title={t.sections.check.title} desc={t.sections.check.desc(queue.length)}>
        <div aria-live="polite" className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
          {queue[0] ? <Review row={queue[0]} step={counts.total - queue.length + 1} of={counts.total} onAnswer={(a) => setAnswer(queue[0]!.merchant, a)} />
            : (
              <div className="flex flex-wrap items-center gap-t3">
                <span aria-hidden className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-pill bg-positive-soft text-positive"><Check size={20} strokeWidth={2.4} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-bold text-text">{t.review.allChecked}</p>
                  <p className="text-meta text-text-muted">{t.review.summary(counts.using, counts.notUsing, counts.later)}. {t.review.again}</p>
                </div>
                <Button variant="secondary" onClick={() => save({ reminders: prefs.reminders, answers: {} })}>{t.review.startAgain}</Button>
              </div>
            )}
        </div>
      </Section>

      <Section id="s-coming" n={3} title={t.sections.coming.title} desc={t.sections.coming.desc}>
        <div className="rounded-card-s bg-surface px-t5 pb-t3 pt-t2 shadow-card sm:rounded-card">
          {groups.map((g) => (
            <div key={g.kind}>
              <h3 className="flex items-center justify-between gap-t3 border-b border-line pb-t2 pt-[14px]">
                <span className="text-meta-s font-bold uppercase tracking-[0.04em] text-text-muted">{groupLabel(g)}</span>
                <span className="tnum text-meta-s font-bold text-text-muted"><span className="sr-only">{t.groups.totalSr(formatCents(g.total))}</span><span aria-hidden>{formatCents(g.total)}</span></span>
              </h3>
              {g.rows.length === 0 && g.kind === "beforePayday" && (
                <p className="flex items-center gap-t2 border-b border-divider py-[14px] text-meta text-positive"><Check aria-hidden size={16} strokeWidth={2.4} />{t.groups.noneBeforePayday}</p>
              )}
              <ul>
                {g.rows.map((r) => {
                  const isOpen = open === r.merchant;
                  const id = `sub-${r.merchant.replace(/\W+/g, "-")}`;
                  const status = cancelled.has(r.merchant) ? "cancelled" : statusOf(answers[r.merchant]);
                  const reminder = prefs.reminders[r.merchant];
                  return (
                    <li key={r.merchant} className="border-b border-divider">
                      <button type="button" aria-expanded={isOpen} aria-controls={`${id}-panel`} onClick={() => setOpen(isOpen ? null : r.merchant)}
                        className="flex min-h-[64px] w-full items-center gap-t3 py-[10px] text-left text-text">
                        <span aria-hidden className={cx("flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[11px] text-body14 font-extrabold", tintFor(r.merchant))}>{r.merchant.charAt(0)}</span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-body font-bold">{r.merchant}</span>
                          <span className="text-meta-s text-text-muted">{t.row.when(formatShortDay(r.nextCharge))}</span>
                        </span>
                        <span className={cx("whitespace-nowrap rounded-pill px-[9px] py-[3px] text-meta-s font-bold", STATUS[status])}>{t.row.status[status]}</span>
                        <span className="tnum min-w-[64px] text-right text-body font-bold">{formatCents(r.amount)}</span>
                        <ChevronDown aria-hidden size={16} className={cx("shrink-0 text-icon-muted transition-transform duration-fast", isOpen && "rotate-180")} />
                      </button>
                      {isOpen && (
                        <div id={`${id}-panel`} className="mb-t3 flex flex-col gap-t3 rounded-[14px] bg-surface2 p-[14px]">
                          <dl className="tnum grid grid-cols-3 gap-t2">
                            <Figure label={t.row.eachCharge} value={formatCents(r.amount)} />
                            <Figure label={t.row.perCycle} value={formatCents(r.perPayCycle)} />
                            <Figure label={t.row.perYear} value={formatCents(r.perYear)} />
                          </dl>
                          <div className="flex flex-wrap gap-t2">
                            {reminder
                              ? <Button variant="tertiary" onClick={() => unremind(r.merchant)}>{t.row.cancelReminder}</Button>
                              : <Button variant="secondary" onClick={() => remind(r)}>{t.row.remind(formatDayMonth(r.nextCharge))}</Button>}
                            <Button variant="secondary" onClick={() => openHowTo(r.merchant)}>{t.row.howToCancel}</Button>
                            {corrections && <Button variant="link" onClick={() => setFixing(r.merchant)}>{t.row.notSub}<span className="sr-only">: {r.merchant}</span></Button>}
                          </div>
                          {reminder && <p className="inline-flex items-center gap-t1 text-meta text-text-muted"><BellRing aria-hidden size={14} />{t.row.reminderSet(formatShortDay(reminder))}</p>}
                          <div role="group" aria-label={`${t.row.stillUsing} ${r.merchant}`} className="flex flex-wrap items-center gap-t2 text-meta text-text-secondary">
                            <span>{t.row.stillUsing}</span>
                            <Toggle on={answers[r.merchant] === "keep"} onClick={() => setAnswer(r.merchant, answers[r.merchant] === "keep" ? undefined : "keep")}>{t.row.yes}</Toggle>
                            <Toggle on={answers[r.merchant] === "drop"} onClick={() => setAnswer(r.merchant, answers[r.merchant] === "drop" ? undefined : "drop")}>{t.row.no}</Toggle>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {saving && (
        <Section id="s-save" n={4} title={t.sections.save.title} desc={t.sections.save.desc}>
          <div className="flex flex-col gap-t3 rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
            <div>
              <p className="tnum flex flex-wrap items-baseline gap-x-t2">
                <span className="text-[2.25rem] font-extrabold leading-none tracking-[-0.03em] text-positive">{formatCents(saving.yearly)}</span>
                <span className="text-body14 font-semibold text-text">{t.save.perYear}</span>
              </p>
              <p className="tnum mt-t1 text-meta text-text-muted">{t.save.line(formatCents(saving.perCycle), formatCents(saving.monthly))}</p>
            </div>
            <ul>
              {saving.rows.map((r) => (
                <li key={r.merchant} className="flex items-center gap-t3 border-t border-divider py-t3">
                  <span aria-hidden className={cx("flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[11px] text-body14 font-extrabold", tintFor(r.merchant))}>{r.merchant.charAt(0)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body14 font-bold text-text">{r.merchant}</p>
                    <p className="tnum text-meta-s text-text-muted">{t.save.row(formatShortDay(r.nextCharge), formatCents(r.amount))}</p>
                  </div>
                  <Button variant="link" onClick={() => openHowTo(r.merchant)}>{t.save.howToCancel}<span className="sr-only">: {r.merchant}</span></Button>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {/* "Not a subscription" or "This has ended": the merchant rule takes it off the list (with Undo). */}
      <RuleChoiceSheet persona={persona} merchant={fixing ?? ""} title={fixing ? correctionCopy.subscription.title(fixing) : ""} options={SUBSCRIPTION_OPTIONS} open={!!fixing} onClose={() => setFixing(null)} />
      <Sheet open={!!guideRow} onClose={() => setHowTo(null)} title={guideRow ? t.cancelTitle(guideRow.merchant) : ""}
        footer={guideRow && cancelHelper ? (cancelled.has(guideRow.merchant)
          ? <p role="status" className="text-small text-text-muted">{(() => {
              const again = chargedAgain.find((c) => c.merchant === guideRow.merchant);
              return again ? tallyCopy.chargedAgain(guideRow.merchant, formatCents(again.amount), formatDayMonth(again.date))
                : tallyCopy.cancelledNote(formatDayMonth(confirm[guideRow.merchant] ?? addDays(guideRow.nextCharge, 3)));
            })()}</p>
          : <Button full variant="secondary" onClick={() => markCancelled(guideRow.merchant)}>{tallyCopy.cancelled}</Button>) : undefined}>
        {guideRow && (
          <div className="flex flex-col gap-t4">
            <ol className="flex list-decimal flex-col gap-t2 pl-t5 text-body text-text">
              {(guide?.steps ?? t.cancelSteps(guideRow.merchant, formatShortDay(guideRow.nextCharge))).map((step) => <li key={step}>{step}</li>)}
            </ol>
            {guide?.deepLink && (
              <a href={guide.deepLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-tap items-center gap-t2 text-body-strong text-accent underline-offset-2 hover:underline">
                {cx_.openCancelPage(guideRow.merchant)}<ExternalLink aria-hidden size={16} /><span className="sr-only"> {cx_.opensInNewTab}</span>
              </a>
            )}
            {guide?.steps && <p className="text-small text-text">{cx_.nextCharge(formatShortDay(guideRow.nextCharge))}</p>}
            {guide?.notes && <p className="text-small text-text">{guide.notes}</p>}
            {guide?.steps && <p className="text-caption text-text-muted">{cx_.stepsChange(guideRow.merchant)}</p>}
            {!guide?.notes && <p className="text-small text-text-muted">{t.cancelStore}</p>}
            <p className="text-small text-text-muted">{t.cancelAfter}</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}

const listNames = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

function groupLabel(g: CycleGroup<Row>): string {
  if (g.kind === "beforePayday") return t.groups.beforePayday(formatShortDay(addDays(g.to!, 1)));
  if (g.kind === "next") return t.groups.next(formatDayMonth(g.from), formatDayMonth(g.to!));
  return t.groups.following(formatDayMonth(g.from));
}

function Review({ row, step, of, onAnswer }: { row: Row; step: number; of: number; onAnswer: (a: Answer) => void }) {
  return (
    <div className="flex flex-col gap-t4">
      <div className="flex items-center gap-t3">
        <span className="whitespace-nowrap text-meta-s font-bold text-text-muted">{t.review.step(step, of)}</span>
        <div aria-hidden className="h-[6px] flex-1 overflow-hidden rounded-pill bg-surface2">
          <div className="h-full rounded-pill bg-accent" style={{ width: `${Math.round(((step - 1) / of) * 100)}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-t3">
        <span aria-hidden className={cx("flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] text-[1.0625rem] font-extrabold", tintFor(row.merchant))}>{row.merchant.charAt(0)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[1.0625rem] font-bold text-text">{row.merchant}</p>
          <p className="tnum text-meta text-text-muted">{t.review.line(formatCents(row.amount), formatShortDay(row.nextCharge), formatCents(row.perYear))}</p>
        </div>
      </div>
      <h3 className="text-[1.25rem] font-bold tracking-[-0.01em] text-text">{t.review.question(row.merchant)}</h3>
      <div className="flex flex-wrap gap-t2">
        <Button size="standard" className="flex-[1_1_160px]" onClick={() => onAnswer("keep")}>{t.review.keep}</Button>
        <Button size="standard" variant="secondary" className="flex-[1_1_160px]" onClick={() => onAnswer("drop")}>{t.review.drop}</Button>
      </div>
      <Button variant="link" className="self-center" onClick={() => onAnswer("later")}>{t.review.later}</Button>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.75rem] text-text-muted">{label}</dt>
      <dd className="text-body14 font-bold text-text">{value}</dd>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cx("inline-flex min-h-tap min-w-tap items-center justify-center rounded-pill px-t3 text-meta font-bold", on ? "bg-accent text-on-accent" : "bg-surface text-text shadow-[inset_0_0_0_1px_var(--color-line)]")}>
      {children}
    </button>
  );
}
