"use client";
// "What's due before payday" sheet, shared by Home and Spending (Astra: the due action reuses dashboard-due).
import { useRouter } from "next/navigation";
import { dashboard as t } from "@/content/dashboard";
import { copy } from "@/content/en-AU";
import { payCycleHero } from "@/content/components";
import { formatCents, formatDayMonth, formatShortDay, formatWhole } from "@/lib/format";
import { sumMoney } from "@/lib/format/money";
import type { PayCycleSummary } from "@/lib/selectors/payCycle";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

export function DueSheet({ open, onClose, payCycle }: { open: boolean; onClose: () => void; payCycle: PayCycleSummary }) {
  const router = useRouter();
  const advance = payCycle.payAdvances[0];
  const exactDue = sumMoney(payCycle.dueBeforePayday.map((b) => b.expected_amount));
  const rounded = payCycle.dueBeforePayday.some((b) => Math.round(b.expected_amount) !== b.expected_amount);
  return (
    <Sheet open={open} onClose={onClose} title={t.dueTitle}
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
  );
}
