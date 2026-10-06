"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dashboard as t } from "@/content/dashboard";
import { payCycleHero } from "@/content/components";
import { formatShortDay, formatWhole } from "@/lib/format";
import type { UpcomingBill } from "@/lib/api/types";
import type { MonthBar } from "@/lib/selectors/monthly";
import type { PayCycleSummary } from "@/lib/selectors/payCycle";
import type { FirstAction } from "@/lib/selectors/recommendations";
import type { ScoreState } from "@/lib/selectors/score";
import { HomeBanner, NextBillCard, NextStepCard, SixMonthChart, SmartScoreCard } from "@/components/domain/DashboardCards";
import { InsightSheetBody } from "@/components/domain/Insight";
import { PayCycleHero } from "@/components/domain/PayCycleHero";
import { DueSheet } from "@/components/domain/DueSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { statesCopy } from "@/content/states";
import { Sheet } from "@/components/ui/Sheet";
import { AttentionFeed } from "@/components/domain/AttentionFeed";
import type { PersonaId } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import type { FeedItem } from "@/lib/feed/types";
import type { ScoreAttribution } from "@/lib/selectors/scoreAttribution";
import type { CycleRecap, PaydayCheckIn } from "@/lib/selectors/payCycleLoop";
import type { SafeToSpend } from "@/lib/selectors/safeToSpend";
import type { valueTally } from "@/lib/selectors/tally";
import { CheckInAdjustSheet, CheckInCard, PayPendingCard, ProgressLink, RecapCard, SafeToSpendCard, SafeToSpendSheet, TallyCard, TallySheet } from "@/components/domain/LoopCards";
import { checkInCopy, safeCopy, tallyCopy } from "@/content/loop";
import { track } from "@/lib/analytics/client";
import { useAccount } from "@/lib/account/client";
import { useToast } from "@/components/ui/Feedback";
import { InstallPrompt } from "@/components/notify/InstallPrompt";
import { mockNow } from "@/lib/account/state";
import { GoalRow } from "@/components/domain/GoalRow";
import type { GoalOption } from "@/components/domain/GoalPicker";
import { ForecastMissCard } from "@/components/domain/ForecastMiss";
import { SafeToSpendPaused } from "@/components/domain/Connection";
import type { ForecastPoint } from "@/lib/selectors/forecastAccuracy";

type SheetId = "due" | "advance" | "action" | "safe" | "tally" | "adjust" | null;

export function HomeView({ persona, account, status, feedItems, attribution, asOf, banner, score, change, action, payCycle, nextBill, bars, lapsed, safe, checkIn, recap, feesAvoided, tally, present, progressText, statusStale = false, checked = "", movement = null, adjustBills = [], oneOffDates = [], focus = null, payPending = false, focusGoal = null, firstPayday = false, recapLead = null, accuracyLine = null, miss = null, stsPaused = null, flags = { feed: true, status: true, safe: true, tally: true, buffer: true } }: {
  persona: PersonaId; account: AccountState; status: string; feedItems: FeedItem[]; attribution: ScoreAttribution | null;
  asOf: string; lapsed?: boolean; banner: { text: string; href: string } | null; score: ScoreState; change: { delta: number; since: string } | null;
  action: FirstAction | null; payCycle: PayCycleSummary; nextBill: UpcomingBill | null; bars: MonthBar[];
  safe: SafeToSpend; checkIn: PaydayCheckIn | null; recap: CycleRecap | null; feesAvoided: number; tally: ReturnType<typeof valueTally>; present: boolean; progressText: string; statusStale?: boolean; checked?: string;
  movement?: { up: number; since: string } | null; adjustBills?: { id: string; merchant: string; amount: number; date: string; paid: boolean }[];
  oneOffDates?: string[]; focus?: string | null; payPending?: boolean;
  /** Spec 04: the member's goal (null when goals_v1 is off), the enhanced first payday, and the recap's lead line. */
  focusGoal?: { current: GoalOption | null; options: GoalOption[] } | null; firstPayday?: boolean; recapLead?: "balance" | "advances" | "score" | null;
  /** Spec 05: "within $20 on 9 of the last 10 days" (only when accurate enough), and yesterday's bad miss. */
  accuracyLine?: string | null; miss?: ForecastPoint | null;
  /** Spec 05: the data is over 72 h old (the day it's from): safe to spend pauses. */
  stsPaused?: string | null;
  /** Feature flags (retention pack): each part of Today can be switched off. */
  flags?: { feed: boolean; status: boolean; safe: boolean; tally: boolean; buffer: boolean; corrections?: boolean };
}) {
  const router = useRouter();
  const toast = useToast();
  const { account: acct, update } = useAccount(persona, account);
  // "I'll try this" on the pay-advance step: recorded so the tally can confirm it at payday.
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
      <div className="flex flex-col gap-t3">
        <SmartScoreCard state={score} change={change} attribution={attribution} />
        <section className="rounded-lg bg-surface p-t5">
          <p className="text-body text-text">{statesCopy.lapsed.homeCard}</p>
          <ButtonLink className="mt-t4" href="/account/subscription">{statesCopy.lapsed.reactivate}</ButtonLink>
        </section>
      </div>
    );
  }
  // Order: what Tippla did → what needs a look → where things stand → the details.
  return (
    <div className="flex flex-col gap-t3 desktop:grid desktop:grid-cols-[minmax(0,656fr)_minmax(0,436fr)] desktop:gap-t6">
      {!flags.status ? null : statusStale
        ? <Link href="/account/bank" className="text-small text-accent underline-offset-2 hover:underline desktop:col-span-2">{status}</Link>
        : <p className="text-small text-text-muted desktop:col-span-2">{status}</p>}
      {banner && <div className="desktop:col-span-2"><HomeBanner {...banner} /></div>}
      {focusGoal && <div className="desktop:col-span-2"><GoalRow persona={persona} account={account} asOf={asOf} goal={focusGoal.current} options={focusGoal.options} /></div>}
      <div className="flex flex-col gap-t3 desktop:gap-t6">
        {checkIn ? <CheckInCard checkIn={checkIn} onHow={() => setSheet("safe")} onAdjust={() => setSheet("adjust")} focus={focus} goal={focusGoal?.current?.label ?? null} firstPayday={firstPayday} />
          : payPending ? <PayPendingCard payday={asOf} />
          : flags.safe ? (stsPaused ? <SafeToSpendPaused dataFrom={stsPaused} /> : <SafeToSpendCard safe={safe} onHow={() => setSheet("safe")} movement={movement} />) : null}
        {flags.feed && <AttentionFeed persona={persona} account={account} items={feedItems} asOf={asOf} payday={payCycle.nextPayday} checked={checked} />}
        {miss && <ForecastMissCard persona={persona} account={account} miss={miss} onFixBill={() => setSheet("due")} />}
        {recap && <RecapCard recap={recap} feesAvoided={feesAvoided} next={focus} lead={recapLead} />}
        <PayCycleHero summary={payCycle}
          onForecast={() => setSheet("due")} onDue={() => setSheet("due")} onAdvance={() => setSheet("advance")}
          onSpent={() => router.push("/spending?direction=out")} onPaidIn={() => router.push("/spending?direction=in")}
          onHardship={() => router.push("/hardship")} />
      </div>
      <div className="flex flex-col gap-t3 desktop:gap-t6">
        <SmartScoreCard state={score} change={change} attribution={attribution} />
        {showTally && <TallyCard tally={tally} onOpen={() => setSheet("tally")} />}
        <ProgressLink text={progressText} />
        <InstallPrompt hadValue={Object.values(acct.feed ?? {}).some((f) => f.status === "done") || (acct.actions ?? []).length > 0 || !!acct.goal} />
        {action && <NextStepCard title={action.title} rationale={action.wouldChange ?? action.summary} onSeeHow={() => setSheet("action")} />}
        {nextBill && <NextBillCard bill={nextBill} />}
        <SixMonthChart bars={bars} asOf={asOf} />
      </div>

      <SafeToSpendSheet safe={shownSafe} open={sheet === "safe"} onClose={() => setSheet(null)} present={present} onBuffer={flags.buffer ? setBuffer : undefined} accuracy={accuracyLine} />
      <CheckInAdjustSheet open={sheet === "adjust"} onClose={() => setSheet(null)} bills={adjustBills} oneOffs={adjust.oneOffs} dates={oneOffDates}
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
            {action.ifYouWant && <><Button full variant={action.id === "pay-advance" ? "secondary" : "primary"} onClick={() => setSheet("due")}>{t.dueTitle}</Button><Button full variant="tertiary" onClick={() => router.push("/hardship")}>{payCycleHero.moneyTight}</Button></>}
          </> : undefined}>
          <InsightSheetBody item={{ id: action.id, context: action.factor, title: action.title, summary: action.summary, happening: action.happening, wouldChange: action.wouldChange, ifYouWant: action.ifYouWant }} />
        </Sheet>
      )}
    </div>
  );
}
