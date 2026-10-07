"use client";
// Today (redesign 07/10/2026; reference/today-desktop-mockup.html). The pay-cycle figure appears once, in the hero,
// first at every width. One tree of cards, reordered by breakpoint (no card is rendered twice):
//   phones   hero · quick actions · [payday cards] · needs a look · SmartScore · coming up · plan · spending · unusual day
//   tablet   the same, with SmartScore | coming up and plan | unusual day side by side
//   desktop  left: hero, quick actions, [payday cards], needs a look, spending · right: SmartScore, plan, coming up, unusual day
// Every figure comes from the selectors (page.tsx); this file only arranges them and keeps the existing sheets.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dashboard as t } from "@/content/dashboard";
import { formatShortDay, formatWhole } from "@/lib/format";
import type { MonthBar } from "@/lib/selectors/monthly";
import type { PayCycleSummary } from "@/lib/selectors/payCycle";
import type { FirstAction } from "@/lib/selectors/recommendations";
import type { ScoreState } from "@/lib/selectors/score";
import type { ScoreProjection } from "@/lib/scoring/estimate";
import { InsightSheetBody } from "@/components/domain/Insight";
import { DueSheet } from "@/components/domain/DueSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { statesCopy } from "@/content/states";
import { Sheet } from "@/components/ui/Sheet";
import type { PersonaId } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import type { FeedItem } from "@/lib/feed/types";
import type { ScoreAttribution } from "@/lib/selectors/scoreAttribution";
import type { CycleRecap, PaydayCheckIn } from "@/lib/selectors/payCycleLoop";
import type { SafeToSpend } from "@/lib/selectors/safeToSpend";
import type { valueTally } from "@/lib/selectors/tally";
import type { ComingUpItem, SpendGroup } from "@/lib/selectors/today";
import { CheckInAdjustSheet, CheckInCard, PayPendingCard, RecapCard, SafeToSpendSheet, TallyCard, TallySheet } from "@/components/domain/LoopCards";
import { checkInCopy, safeCopy, tallyCopy } from "@/content/loop";
import { track } from "@/lib/analytics/client";
import { useAccount } from "@/lib/account/client";
import { useToast } from "@/components/ui/Feedback";
import { InstallPrompt } from "@/components/notify/InstallPrompt";
import { mockNow } from "@/lib/account/state";
import { ForecastMissCard } from "@/components/domain/ForecastMiss";
import { StageMomentCard } from "@/components/domain/StageMoment";
import type { StageMoment } from "@/lib/selectors/progression";
import type { Streak } from "@/lib/selectors/progress";
import type { PlanProgress } from "@/lib/selectors/plans";
import type { ForecastPoint } from "@/lib/selectors/forecastAccuracy";
import { PayCycleHero } from "@/components/today/PayCycleHero";
import { QuickActions } from "@/components/today/QuickActions";
import { NeedsALook } from "@/components/today/NeedsALook";
import { SmartScoreCard } from "@/components/today/SmartScoreCard";
import { ComingUp } from "@/components/today/ComingUp";
import { PlanCard } from "@/components/today/PlanCard";
import { SpendingSummary } from "@/components/today/SpendingSummary";
import { cx } from "@/components/ui/cx";
import { todayCopy } from "@/content/today";

type SheetId = "due" | "advance" | "action" | "safe" | "tally" | "adjust" | null;

export function HomeView({ persona, account, checked, feedItems, attribution, asOf, score, change, trend, action, projection, payCycle, bars, groups, coming, lapsed, safe, checkIn, recap, feesAvoided, tally, present, movement, adjustBills, oneOffDates, focus, payPending, goalLabel, firstPayday, recapLead, accuracyLine, miss, stsPaused, disconnected, plan, bufferSteps, milestones, surplus, moment, savingsLines, flags }: {
  persona: PersonaId; account: AccountState; checked: string; feedItems: FeedItem[]; attribution: ScoreAttribution | null;
  asOf: string; lapsed?: boolean; score: ScoreState; change: { delta: number; since: string } | null; trend: { date: string; score: number }[];
  action: FirstAction | null; projection: ScoreProjection | null; payCycle: PayCycleSummary; bars: MonthBar[];
  groups: { group: SpendGroup; total: number; share: number }[]; coming: ComingUpItem[];
  safe: SafeToSpend; checkIn: PaydayCheckIn | null; recap: CycleRecap | null; feesAvoided: number; tally: ReturnType<typeof valueTally>; present: boolean;
  movement?: { up: number; since: string } | null; adjustBills?: { id: string; merchant: string; amount: number; date: string; paid: boolean }[];
  oneOffDates?: string[]; focus?: string | null; payPending?: boolean;
  /** Spec 04: the member's goal label (null when none or goals_v1 is off), the enhanced first payday, the recap's lead line. */
  goalLabel?: string | null; firstPayday?: boolean; recapLead?: "balance" | "advances" | "score" | null;
  /** Spec 05: "within $20 on 9 of the last 10 days" (only when accurate enough), and yesterday's bad miss. */
  accuracyLine?: string | null; miss?: ForecastPoint | null;
  /** Spec 05: the data is over 72 h old (safe to spend pauses), or the bank is disconnected. */
  stsPaused?: string | null; disconnected?: boolean;
  /** Spec 07: the plan (the gambling plan is never named here). */
  plan?: { progress: PlanProgress; title: string } | null;
  bufferSteps?: { extra: number[]; next: number | null } | null; milestones?: Streak[]; surplus?: number | null; moment?: StageMoment | null; savingsLines?: string[];
  /** Feature flags (retention pack): each part of Today can be switched off. */
  flags: { feed: boolean; safe: boolean; tally: boolean; buffer: boolean; corrections?: boolean; assistant?: boolean };
}) {
  const router = useRouter();
  const toast = useToast();
  const { account: acct, update } = useAccount(persona, account);
  const trying = (acct.actions ?? []).some((a) => a.type === "skip_advance");
  const tryThis = () => {
    update((l) => ({ ...l, actions: [...(l.actions ?? []).filter((a) => a.type !== "skip_advance"), { type: "skip_advance", at: mockNow({ asOf }) }] }));
    toast({ kind: "confirm", message: tallyCopy.tryThisToast });
  };
  const showTally = flags.tally && (tally.items.length > 0 || tally.pending.length > 0);
  const shownSafe = checkIn?.safe ?? safe;
  // Remember today's safe-to-spend figure (and the last day's), for "Up $4 since yesterday".
  useEffect(() => {
    const s = acct.stsSeen;
    if (s?.date === asOf && s.perDay === shownSafe.perDay) return;
    update((l) => ({ ...l, stsSeen: { date: asOf, perDay: shownSafe.perDay, ...(l.stsSeen && l.stsSeen.date !== asOf ? { prev: { date: l.stsSeen.date, perDay: l.stsSeen.perDay } } : l.stsSeen?.prev ? { prev: l.stsSeen.prev } : {}) } }));
  }, [asOf, shownSafe.perDay]); // eslint-disable-line react-hooks/exhaustive-deps
  const adjusted = (msg: string = checkInCopy.updated) => toast({ kind: "confirm", message: msg });
  const setBuffer = (amount: number) => {
    track("buffer_set", { target_cents: amount * 100 });
    if (checkIn) track("checkin_adjusted", { type: "buffer" });
    update((l) => ({ ...l, buffer: amount }));
    adjusted(safeCopy.bufferSaved(formatWhole(amount)));
  };
  const adjust = acct.billAdjust ?? { paid: [], oneOffs: [] };
  const setPaid = (id: string, v: boolean) => {
    track("checkin_adjusted", { type: "bill_paid" });
    update((l) => { const a = l.billAdjust ?? { paid: [], oneOffs: [] }; return { ...l, billAdjust: { ...a, paid: v ? [...new Set([...a.paid, id])] : a.paid.filter((x) => x !== id) } }; });
    adjusted();
  };
  const addOneOff = (o: { label: string; amount: number; date: string }) => {
    track("checkin_adjusted", { type: "one_off" });
    update((l) => { const a = l.billAdjust ?? { paid: [], oneOffs: [] }; return { ...l, billAdjust: { ...a, oneOffs: [...a.oneOffs, { ...o, id: `o${Date.now().toString(36)}` }] } }; });
    adjusted(checkInCopy.oneOffAdded(o.label));
  };
  const removeOneOff = (id: string) => update((l) => { const a = l.billAdjust ?? { paid: [], oneOffs: [] }; return { ...l, billAdjust: { ...a, oneOffs: a.oneOffs.filter((x) => x.id !== id) } }; });
  const [sheet, setSheet] = useState<SheetId>(null);
  const advance = payCycle.payAdvances[0];

  if (lapsed) {
    // Lapsed subscription: the score stays visible; everything else waits for reactivation.
    return (
      <div className="flex flex-col gap-t4">
        <SmartScoreCard state={score} change={change} attribution={attribution} trend={trend} />
        <section className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card sm:p-t6">
          <p className="text-body14 text-text">{statesCopy.lapsed.homeCard}</p>
          <ButtonLink className="mt-t4" href="/account/subscription">{statesCopy.lapsed.reactivate}</ButtonLink>
        </section>
      </div>
    );
  }

  // Payday and moment cards, shown only when they apply (under the quick actions).
  const loop = [
    moment && <StageMomentCard key="moment" persona={persona} account={account} moment={moment} />,
    checkIn ? <CheckInCard key="checkin" checkIn={checkIn} onHow={() => setSheet("safe")} onAdjust={() => setSheet("adjust")} focus={focus} goal={goalLabel ?? null} firstPayday={firstPayday} extra={savingsLines} />
      : payPending ? <PayPendingCard key="pending" payday={asOf} /> : null,
    recap && <RecapCard key="recap" recap={recap} feesAvoided={feesAvoided} next={focus} lead={recapLead} milestones={milestones}
      surplus={surplus ? { amount: surplus, onProtect: () => setBuffer((acct.buffer ?? 0) + surplus) } : null} />,
  ].filter(Boolean);
  const item = "min-w-0";

  return (
    <div className="flex flex-col gap-t4 sm:grid sm:grid-cols-2 sm:gap-t6 desktop:flex desktop:flex-row desktop:flex-wrap desktop:items-start">
      {/* Left column on desktop; on smaller screens its cards join the single ordered stack. */}
      <div className="contents desktop:flex desktop:min-w-0 desktop:flex-[2_1_560px] desktop:flex-col desktop:gap-t6">
        <div className={cx(item, "order-1 sm:col-span-2")}>
          <PayCycleHero pc={payCycle} safe={safe} asOf={asOf} stsPaused={!!stsPaused} disconnected={disconnected ? { href: "/account/bank" } : null}
            movement={movement ? safeCopy.up(formatWhole(movement.up), movement.since) : null}
            onDue={() => setSheet("due")} onSafe={() => setSheet("safe")} onAdvance={() => setSheet("advance")} />
        </div>
        <div className={cx(item, "order-2 sm:col-span-2")}><QuickActions /></div>
        {loop.length > 0 && <div className={cx(item, "order-3 flex flex-col gap-t4 sm:col-span-2 sm:gap-t6")}>{loop}</div>}
        {flags.feed && (
          <div className={cx(item, "order-4 sm:col-span-2")}>
            <NeedsALook persona={persona} account={account} items={feedItems} asOf={asOf} payday={payCycle.nextPayday} checked={checked} />
          </div>
        )}
        <div className={cx(item, "order-8 sm:order-9 sm:col-span-2")}><SpendingSummary bars={bars} asOf={asOf} groups={groups} /></div>
      </div>
      {/* Right column on desktop. */}
      <div className="contents desktop:flex desktop:min-w-0 desktop:flex-[1_1_320px] desktop:flex-col desktop:gap-t6">
        <div className={cx(item, "order-5")}><SmartScoreCard state={score} change={change} attribution={attribution} trend={trend} /></div>
        <div className={cx(item, "order-7 desktop:order-6")}>
          <PlanCard plan={plan ?? null} action={action ? { title: action.title, summary: action.wouldChange ?? action.summary } : null} projection={projection}
            goal={goalLabel ? { label: goalLabel } : null} onSeeHow={() => setSheet("action")} />
        </div>
        <div className={cx(item, "order-6 desktop:order-7")}><ComingUp items={coming} /></div>
        {miss && <div className={cx(item, "order-9 sm:order-8")}><ForecastMissCard persona={persona} account={account} miss={miss} onFixBill={() => setSheet("due")} /></div>}
        {showTally && <div className={cx(item, "order-10 sm:col-span-2 desktop:col-span-1")}><TallyCard tally={tally} onOpen={() => setSheet("tally")} /></div>}
        <div className={cx(item, "order-11 sm:col-span-2 desktop:col-span-1 empty:hidden")}>
          <InstallPrompt hadValue={Object.values(acct.feed ?? {}).some((f) => f.status === "done") || (acct.actions ?? []).length > 0 || !!acct.goal} />
        </div>
      </div>

      <SafeToSpendSheet safe={shownSafe} open={sheet === "safe"} onClose={() => setSheet(null)} present={present} onBuffer={flags.buffer ? setBuffer : undefined} accuracy={accuracyLine} bufferSteps={bufferSteps} />
      <CheckInAdjustSheet open={sheet === "adjust"} onClose={() => setSheet(null)} bills={adjustBills ?? []} oneOffs={adjust.oneOffs} dates={oneOffDates ?? []}
        onPaid={setPaid} onAddOneOff={addOneOff} onRemoveOneOff={removeOneOff} />
      <TallySheet tally={tally} open={sheet === "tally"} onClose={() => setSheet(null)} present={present} />
      <DueSheet open={sheet === "due"} onClose={() => setSheet(null)} payCycle={payCycle} persona={flags.corrections ? persona : undefined} asOf={asOf} />

      {advance && advance.repayAmount !== null && advance.repayDate && (
        <Sheet open={sheet === "advance"} onClose={() => setSheet(null)} title={t.advanceTitle}>
          <p className="text-body text-text-muted">{t.advanceBody(advance.provider, formatWhole(advance.amount), formatWhole(advance.fee ?? 0), formatWhole(advance.repayAmount), formatShortDay(advance.repayDate))}</p>
        </Sheet>
      )}

      {action && (
        <Sheet open={sheet === "action"} onClose={() => setSheet(null)} title={action.title}
          footer={action.id === "pay-advance" || action.ifYouWant ? <>
            {action.id === "pay-advance" && (trying
              ? <p role="status" className="text-small text-text-muted">{tallyCopy.tryingNote}</p>
              : <Button full onClick={tryThis}>{tallyCopy.tryThis}</Button>)}
            {action.ifYouWant && <><Button full variant={action.id === "pay-advance" ? "secondary" : "primary"} onClick={() => setSheet("due")}>{t.dueTitle}</Button><Button full variant="tertiary" onClick={() => router.push("/hardship")}>{todayCopy.hero.moneyTight}</Button></>}
          </> : undefined}>
          <InsightSheetBody item={{ id: action.id, context: action.factor, title: action.title, summary: action.summary, happening: action.happening, wouldChange: action.wouldChange, ifYouWant: action.ifYouWant }} />
        </Sheet>
      )}
    </div>
  );
}
