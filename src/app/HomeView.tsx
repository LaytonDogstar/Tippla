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

type SheetId = "due" | "advance" | "action" | null;

export function HomeView({ asOf, banner, score, change, action, payCycle, nextBill, bars, lapsed }: {
  asOf: string; lapsed?: boolean; banner: { text: string; href: string } | null; score: ScoreState; change: { delta: number; since: string } | null;
  action: FirstAction | null; payCycle: PayCycleSummary; nextBill: UpcomingBill | null; bars: MonthBar[];
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetId>(null);
  const advance = payCycle.payAdvances[0];

  if (lapsed) {
    // Lapsed subscription: the score stays visible; everything else waits for reactivation.
    return (
      <div className="flex flex-col gap-t3">
        <SmartScoreCard state={score} change={change} />
        <section className="rounded-lg bg-surface p-t5">
          <p className="text-body text-text">{statesCopy.lapsed.homeCard}</p>
          <ButtonLink className="mt-t4" href="/account/subscription">{statesCopy.lapsed.reactivate}</ButtonLink>
        </section>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-t3 desktop:grid desktop:grid-cols-[minmax(0,656fr)_minmax(0,436fr)] desktop:gap-t6">
      {banner && <div className="desktop:col-span-2"><HomeBanner {...banner} /></div>}
      <div className="flex flex-col gap-t3 desktop:gap-t6">
        <SmartScoreCard state={score} change={change} />
        <div className="desktop:hidden">{action && <NextStepCard title={action.title} rationale={action.wouldChange ?? action.summary} onSeeHow={() => setSheet("action")} />}</div>
        <PayCycleHero summary={payCycle}
          onForecast={() => setSheet("due")} onDue={() => setSheet("due")} onAdvance={() => setSheet("advance")}
          onSpent={() => router.push("/spending?direction=out")} onPaidIn={() => router.push("/spending?direction=in")}
          onHardship={() => router.push("/hardship")} />
      </div>
      <div className="flex flex-col gap-t3 desktop:gap-t6">
        <div className="hidden desktop:block">{action && <NextStepCard title={action.title} rationale={action.wouldChange ?? action.summary} onSeeHow={() => setSheet("action")} />}</div>
        {nextBill && <NextBillCard bill={nextBill} />}
        <SixMonthChart bars={bars} asOf={asOf} />
      </div>

      <DueSheet open={sheet === "due"} onClose={() => setSheet(null)} payCycle={payCycle} />

      {advance && advance.repayAmount !== null && advance.repayDate && (
        <Sheet open={sheet === "advance"} onClose={() => setSheet(null)} title={t.advanceTitle}>
          <p className="text-body text-text-muted">{t.advanceBody(advance.provider, formatWhole(advance.amount), formatWhole(advance.fee ?? 0), formatWhole(advance.repayAmount), formatShortDay(advance.repayDate))}</p>
        </Sheet>
      )}

      {action && (
        <Sheet open={sheet === "action"} onClose={() => setSheet(null)} title={action.title}
          footer={action.ifYouWant ? <><Button full onClick={() => setSheet("due")}>{t.dueTitle}</Button><Button full variant="tertiary" onClick={() => router.push("/hardship")}>{payCycleHero.moneyTight}</Button></> : undefined}>
          <InsightSheetBody item={{ id: action.id, context: action.factor, title: action.title, summary: action.summary, happening: action.happening, wouldChange: action.wouldChange, ifYouWant: action.ifYouWant }} />
        </Sheet>
      )}
    </div>
  );
}
