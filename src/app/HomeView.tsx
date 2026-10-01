"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { dashboard as t } from "@/content/dashboard";
import { copy } from "@/content/en-AU";
import { payCycleHero } from "@/content/components";
import { formatCents, formatDayMonth, formatShortDay, formatWhole } from "@/lib/format";
import { sumMoney } from "@/lib/format/money";
import type { UpcomingBill } from "@/lib/api/types";
import type { MonthBar } from "@/lib/selectors/monthly";
import type { PayCycleSummary } from "@/lib/selectors/payCycle";
import type { FirstAction } from "@/lib/selectors/recommendations";
import type { ScoreState } from "@/lib/selectors/score";
import { HomeBanner, NextBillCard, NextStepCard, SixMonthChart, SmartScoreCard } from "@/components/domain/DashboardCards";
import { InsightSheetBody } from "@/components/domain/Insight";
import { PayCycleHero } from "@/components/domain/PayCycleHero";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

type SheetId = "due" | "advance" | "action" | null;

export function HomeView({ asOf, banner, score, change, action, payCycle, nextBill, bars }: {
  asOf: string; banner: { text: string; href: string } | null; score: ScoreState; change: { delta: number; since: string } | null;
  action: FirstAction | null; payCycle: PayCycleSummary; nextBill: UpcomingBill | null; bars: MonthBar[];
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetId>(null);
  const advance = payCycle.payAdvances[0];
  const exactDue = sumMoney(payCycle.dueBeforePayday.map((b) => b.expected_amount));
  const rounded = payCycle.dueBeforePayday.some((b) => Math.round(b.expected_amount) !== b.expected_amount);

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

      <Sheet open={sheet === "due"} onClose={() => setSheet(null)} title={t.dueTitle}
        subtitle={copy.payCycle.range(formatDayMonth(payCycle.cycle.start), formatDayMonth(payCycle.cycle.end))}
        footer={<>
          <Button full variant="secondary" onClick={() => router.push("/calendar")}>{t.openCalendar}</Button>
          <Button full variant="tertiary" onClick={() => router.push("/hardship")}>{payCycleHero.moneyTight}</Button>
        </>}>
        <p className="tnum text-h1 font-display text-text">{t.dueTotal(formatWhole(payCycle.dueTotal))}</p>
        <ul className="mt-t4 flex flex-col gap-t3">
          {payCycle.dueBeforePayday.map((b) => (
            <li key={`${b.merchant}-${b.date}`} className="rounded-sm border border-dashed p-t4" style={{ borderColor: "var(--chart-predicted)" }}>
              <div className="flex justify-between gap-t3"><span className="text-h3 text-text">{b.merchant}</span><span className="tnum text-h3 text-text">{Number.isInteger(b.expected_amount) ? formatWhole(b.expected_amount) : formatCents(b.expected_amount)}</span></div>
              <p className="mt-t1 text-small text-text-muted">{formatShortDay(b.date)} · {t.predicted}</p>
            </li>
          ))}
          {!payCycle.dueBeforePayday.length && <li className="text-body text-text-muted">{t.dueEmpty}</li>}
        </ul>
        {rounded && <p className="mt-t3 text-caption text-text-muted">{t.dueRounding(formatCents(exactDue))}</p>}
        {advance && advance.repayAmount !== null && <p className="mt-t4 text-small text-text-muted">{copy.payCycle.advanceLine(formatWhole(advance.amount))}: {copy.payCycle.advanceRepay(formatWhole(advance.repayAmount), formatDayMonth(advance.repayDate!), formatWhole(advance.amount), formatWhole(advance.fee ?? 0))}</p>}
        {payCycle.isShort && <p className="mt-t4 text-small text-text">{copy.payCycle.short(formatWhole(-payCycle.leftAfterBills))}: {formatWhole(payCycle.balance)} − {formatWhole(payCycle.dueTotal)}.</p>}
      </Sheet>

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
