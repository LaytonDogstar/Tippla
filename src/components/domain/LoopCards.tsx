"use client";
// The pay-cycle loop on Today: safe to spend (with the working on tap), the payday check-in, the
// end-of-cycle recap and the value tally. No offers, no gambling or alcohol, no streak-ending messages.
import { ChevronRight, Flag, PiggyBank, Sun } from "lucide-react";
import { progressCopy } from "@/content/progress";
import Link from "next/link";
import { useEffect } from "react";
import { track } from "@/lib/analytics/client";
import { checkInCopy as c, recapCopy as r, safeCopy as s, tallyCopy as v } from "@/content/loop";
import { formatCents, formatDayMonth, formatShortDay, formatWhole } from "@/lib/format";
import type { CycleRecap, PaydayCheckIn } from "@/lib/selectors/payCycleLoop";
import type { SafeToSpend } from "@/lib/selectors/safeToSpend";
import type { ChargedAgain, PendingItem, TallyItem } from "@/lib/selectors/tally";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { SampleTag } from "@/components/ui/SampleTag";

const LinkRow = ({ href, children }: { href: string; children: string }) => (
  <Link href={href} className="mt-t2 flex min-h-tap items-center justify-between rounded-sm px-t1 text-small text-accent hover:bg-surface2">
    {children}<ChevronRight aria-hidden size={20} />
  </Link>
);

export function SafeToSpendCard({ safe, onHow }: { safe: SafeToSpend; onHow: () => void }) {
  useEffect(() => { track("sts_viewed", { value_cents: safe.perDay * 100, days_left: safe.days, nothing_spare: safe.nothingSpare }); }, [safe.perDay, safe.days, safe.nothingSpare]);
  return (
    <section aria-labelledby="sts" className="rounded-lg bg-surface p-t4">
      <h2 id="sts" className="text-caption text-text-muted">{s.label}</h2>
      {safe.nothingSpare ? (
        <>
          <p className="mt-t1 text-h2 font-display text-text">{s.none}</p>
          <p className="mt-t1 text-small text-text-muted">{s.noneBody}</p>
        </>
      ) : (
        <>
          <p className="tnum mt-t1 text-figure-l font-numeric text-text">{s.perDay(formatWhole(safe.perDay))}</p>
          <p className="mt-t1 text-small text-text-muted">{s.untilPayday(safe.days, formatShortDay(safe.payday))}</p>
          {safe.goal > 0 && <p className="mt-t1 text-caption text-text-muted">{s.goalIncluded(formatWhole(safe.goal))}</p>}
        </>
      )}
      <div className="mt-t2 flex flex-col">
        <Button variant="tertiary" onClick={() => { track("sts_breakdown_opened", {}); onHow(); }} className="self-start">{s.how}</Button>
        {safe.nothingSpare && <LinkRow href="/hardship">{s.hardship}</LinkRow>}
      </div>
    </section>
  );
}

export function SafeToSpendSheet({ safe, open, onClose, present }: { safe: SafeToSpend; open: boolean; onClose: () => void; present: boolean }) {
  const rows: [string, string][] = [
    [s.steps.balance, formatCents(safe.balance)],
    [s.steps.bills(safe.bills.length), `−${formatCents(safe.billsTotal)}`],
    ...(safe.incomeTotal > 0 ? [[s.steps.income, `+${formatCents(safe.incomeTotal)}`] as [string, string]] : []),
    [s.steps.forecast(formatShortDay(safe.forecastDate)), formatCents(safe.forecast)],
    [s.steps.buffer, `−${formatWhole(safe.buffer)}`],
    ...(safe.goal > 0 ? [[s.steps.goal, `−${formatWhole(safe.goal)}`] as [string, string]] : []),
    [s.steps.days(safe.days), ""],
    [s.steps.result, safe.nothingSpare ? formatWhole(0) : formatWhole(safe.perDay)],
  ];
  return (
    <Sheet open={open} onClose={onClose} title={s.sheetTitle}
      footer={safe.nothingSpare ? <Link href="/hardship" className="flex min-h-tap items-center justify-center rounded-md text-body text-accent hover:bg-surface2">{s.hardship}</Link> : undefined}>
      <dl className="flex flex-col">
        {rows.map(([k, val], i) => (
          <div key={k} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-t3 border-t border-line py-t3 ${i === rows.length - 1 ? "text-body-strong" : "text-body"}`}>
            <dt className="text-text">{k}</dt>
            <dd className="tnum text-text">{val}</dd>
          </div>
        ))}
      </dl>
      {safe.bills.length > 0 && (
        <ul className="mt-t3 flex flex-col gap-t1 text-small text-text-muted">
          {safe.bills.map((b) => <li key={b.date + b.merchant} className="flex justify-between gap-t3"><span>{formatShortDay(b.date)} · {b.merchant}</span><span className="tnum">{formatCents(b.amount)}</span></li>)}
        </ul>
      )}
      {safe.goalOnHold && <p className="mt-t3 text-small text-text">{s.goalOnHold}</p>}
      <p className="mt-t4 text-small text-text-muted">{s.note}</p>
      <p className="mt-t2 text-small text-text-muted">{s.bufferNote(formatWhole(safe.buffer))} <SampleTag q="Q21" present={present} /></p>
    </Sheet>
  );
}

export function CheckInCard({ checkIn, onHow }: { checkIn: PaydayCheckIn; onHow: () => void }) {
  useEffect(() => {
    track("checkin_opened", { source: "home" });
    track("sts_viewed", { value_cents: checkIn.safe.perDay * 100, days_left: checkIn.safe.days, nothing_spare: checkIn.safe.nothingSpare });
  }, [checkIn.cycle.start, checkIn.safe.perDay, checkIn.safe.days, checkIn.safe.nothingSpare]);
  const main = checkIn.income[0]!;
  return (
    <section aria-labelledby="checkin" className="rounded-lg bg-accent-soft p-t4">
      <div className="flex items-center gap-t2">
        <Sun aria-hidden size={20} className="text-accent" />
        <h2 id="checkin" className="text-h3 text-text">{c.title}</h2>
      </div>
      <p className="mt-t2 text-body text-text">{c.landed(formatCents(checkIn.incomeTotal), main.payer)}</p>
      <h3 className="mt-t3 text-caption text-text-muted">{c.heading} · {c.range(formatDayMonth(checkIn.cycle.start), formatDayMonth(checkIn.cycle.end))}</h3>
      <ul className="mt-t1 flex flex-col gap-t1 text-small text-text">
        <li>{c.bills(checkIn.bills.length, formatWhole(checkIn.billsTotal))}</li>
        {checkIn.repaymentsTotal > 0 && <li>{c.repayments(formatWhole(checkIn.repaymentsTotal))}</li>}
        <li>{checkIn.advance ? c.advance(checkIn.advance.provider, formatWhole(checkIn.advance.amount), formatShortDay(checkIn.advance.date)) : c.noAdvance}</li>
        <li className="text-body-strong">{checkIn.safe.nothingSpare ? s.none : c.safe(formatWhole(checkIn.safe.perDay))}</li>
        {checkIn.safe.goal > 0 && <li className="text-caption text-text-muted">{s.goalIncluded(formatWhole(checkIn.safe.goal))}</li>}
      </ul>
      <Button variant="tertiary" onClick={() => { track("sts_breakdown_opened", {}); onHow(); }} className="mt-t1 self-start">{s.how}</Button>
      <LinkRow href="/calendar">{c.seeBills}</LinkRow>
    </section>
  );
}

export function RecapCard({ recap, feesAvoided }: { recap: CycleRecap; feesAvoided: number }) {
  useEffect(() => { track("recap_opened", { source: "home" }); }, [recap.cycle.start]);
  const lines = [
    r.spent(formatWhole(recap.spent), formatWhole(recap.paidIn)),
    recap.advances.count === 0 ? [r.noAdvance, r.streak(recap.noAdvanceStreak)].filter(Boolean).join(" ") : r.advances(recap.advances.count, formatWhole(recap.advances.total)),
    recap.score ? r.score(recap.score.from, recap.score.to) : r.noScore,
    recap.fees.count ? r.fees(recap.fees.count, formatWhole(recap.fees.total)) : r.noFees,
    ...(feesAvoided > 0 ? [r.feesAvoided(formatWhole(feesAvoided))] : []),
  ];
  return (
    <section aria-labelledby="recap" className="rounded-lg bg-surface p-t4">
      <h2 id="recap" className="text-h3 text-text">{r.title}</h2>
      <p className="text-caption text-text-muted">{r.range(formatDayMonth(recap.cycle.start), formatDayMonth(recap.cycle.end))}</p>
      <ul className="mt-t2 flex flex-col gap-t1 text-small text-text">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      {recap.changes.length > 0 && (
        <>
          <h3 className="mt-t3 text-caption text-text-muted">{r.changes}</h3>
          <ul className="mt-t1 flex flex-col gap-t1 text-small text-text">
            {recap.changes.map((ch) => <li key={ch.category}>{r.change(ch.name, formatWhole(Math.abs(ch.change)), ch.change > 0)}</li>)}
          </ul>
        </>
      )}
      <LinkRow href="/spending?period=last_cycle">{r.seeSpending}</LinkRow>
    </section>
  );
}

type Tally = { total: number; items: TallyItem[]; pending: PendingItem[]; chargedAgain?: ChargedAgain[] };

function itemText(i: TallyItem) {
  if (i.kind === "subscription") return v.items.subscription(i.label.merchant!, i.label.count ?? 1);
  if (i.kind === "advance") return v.items.advance(formatDayMonth(i.label.date));
  return v.items.dishonour(i.label.merchant!, formatDayMonth(i.label.date));
}
function pendingText(p: PendingItem) {
  if (p.kind === "subscription") return v.items.subscriptionPending(p.key.slice(4), formatDayMonth(p.confirmAfter));
  return v.items.advancePending(formatDayMonth(p.confirmAfter));
}

export function TallyCard({ tally, onOpen }: { tally: Tally; onOpen: () => void }) {
  return (
    <section aria-labelledby="tally" className="rounded-lg bg-surface p-t4">
      <div className="flex items-start gap-t3">
        <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent"><PiggyBank size={24} /></span>
        <div className="min-w-0 flex-1">
          <h2 id="tally" className="text-caption text-text-muted">{v.label}</h2>
          <p className="tnum text-h2 font-display text-text">{formatWhole(tally.total)}</p>
          <p className="text-small text-text-muted">{tally.items.length ? v.since : tally.pending.length ? pendingText(tally.pending[0]!) : v.none}</p>
        </div>
      </div>
      <Button variant="tertiary" className="mt-t1" onClick={onOpen}>{v.sheetTitle}</Button>
    </section>
  );
}

export function TallySheet({ tally, open, onClose, present }: { tally: Tally; open: boolean; onClose: () => void; present: boolean }) {
  return (
    <Sheet open={open} onClose={onClose} title={v.sheetTitle}>
      {tally.items.length > 0 && (
        <>
          <h3 className="text-caption text-text-muted">{v.confirmedHeading}</h3>
          <ul className="mt-t1 flex flex-col">
            {tally.items.map((i) => (
              <li key={i.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-t3 border-t border-line py-t3 text-body text-text">
                <span>{itemText(i)}</span><span className="tnum">{formatWhole(i.amount)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {tally.pending.length > 0 && (
        <>
          <h3 className="mt-t4 text-caption text-text-muted">{v.pendingHeading}</h3>
          <ul className="mt-t1 flex flex-col gap-t2 text-body text-text">{tally.pending.map((p) => <li key={p.key}>{pendingText(p)}</li>)}</ul>
        </>
      )}
      {(tally.chargedAgain ?? []).length > 0 && (
        <>
          <h3 className="mt-t4 text-caption text-text-muted">{v.checkHeading}</h3>
          <ul className="mt-t1 flex flex-col gap-t2 text-body text-text">{tally.chargedAgain!.map((c) => <li key={c.merchant}>{v.chargedAgain(c.merchant, formatCents(c.amount), formatDayMonth(c.date))}</li>)}</ul>
        </>
      )}
      {!tally.items.length && !tally.pending.length && <p className="text-body text-text-muted">{v.none}</p>}
      <p className="mt-t4 text-small text-text-muted">{v.rule} <SampleTag q="Q21" present={present} /></p>
    </Sheet>
  );
}

/** Home: one quiet row to the progress page, with the goal if there is one. */
export function ProgressLink({ text }: { text: string }) {
  return (
    <Link href="/progress" className="flex min-h-tap items-center gap-t3 rounded-lg bg-surface p-t4 hover:bg-surface2">
      <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-surface2 text-neutral"><Flag size={24} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-strong text-text">{progressCopy.homeLink}</span>
        <span className="block text-small text-text-muted">{text}</span>
      </span>
      <ChevronRight aria-hidden size={20} className="text-accent" />
    </Link>
  );
}
