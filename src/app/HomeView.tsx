"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { CheckInCard, ProgressLink, RecapCard, SafeToSpendCard, SafeToSpendSheet, TallyCard, TallySheet } from "@/components/domain/LoopCards";
import { tallyCopy } from "@/content/loop";
import { useAccount } from "@/lib/account/client";
import { useToast } from "@/components/ui/Feedback";
import { InstallPrompt } from "@/components/notify/InstallPrompt";
import { mockNow } from "@/lib/account/state";

type SheetId = "due" | "advance" | "action" | "safe" | "tally" | null;

export function HomeView({ persona, account, status, feedItems, attribution, asOf, banner, score, change, action, payCycle, nextBill, bars, lapsed, safe, checkIn, recap, feesAvoided, tally, present, progressText }: {
  persona: PersonaId; account: AccountState; status: string; feedItems: FeedItem[]; attribution: ScoreAttribution | null;
  asOf: string; lapsed?: boolean; banner: { text: string; href: string } | null; score: ScoreState; change: { delta: number; since: string } | null;
  action: FirstAction | null; payCycle: PayCycleSummary; nextBill: UpcomingBill | null; bars: MonthBar[];
  safe: SafeToSpend; checkIn: PaydayCheckIn | null; recap: CycleRecap | null; feesAvoided: number; tally: ReturnType<typeof valueTally>; present: boolean; progressText: string;
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
  const showTally = tally.items.length > 0 || tally.pending.length > 0;
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
      <p className="text-small text-text-muted desktop:col-span-2">{status}</p>
      {banner && <div className="desktop:col-span-2"><HomeBanner {...banner} /></div>}
      <div className="flex flex-col gap-t3 desktop:gap-t6">
        {checkIn ? <CheckInCard checkIn={checkIn} onHow={() => setSheet("safe")} /> : <SafeToSpendCard safe={safe} onHow={() => setSheet("safe")} />}
        <AttentionFeed persona={persona} account={account} items={feedItems} asOf={asOf} payday={payCycle.nextPayday} />
        {recap && <RecapCard recap={recap} feesAvoided={feesAvoided} />}
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

      <SafeToSpendSheet safe={checkIn?.safe ?? safe} open={sheet === "safe"} onClose={() => setSheet(null)} present={present} />
      <TallySheet tally={tally} open={sheet === "tally"} onClose={() => setSheet(null)} present={present} />
      <DueSheet open={sheet === "due"} onClose={() => setSheet(null)} payCycle={payCycle} />

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
