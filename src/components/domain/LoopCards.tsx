"use client";
// The pay-cycle loop on Today: safe to spend (with the working on tap), the payday check-in, the
// end-of-cycle recap and the value tally. No offers, no gambling or alcohol, no streak-ending messages.
import { ChevronRight, Flag, PiggyBank, Sun } from "lucide-react";
import { progressCopy } from "@/content/progress";
import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics/client";
import { checkInCopy as c, recapCopy as r, safeCopy as s, tallyCopy as v } from "@/content/loop";
import { formatCents, formatDayMonth, formatDollars, formatShortDay, formatWhole } from "@/lib/format";
import type { CycleRecap, PaydayCheckIn } from "@/lib/selectors/payCycleLoop";
import type { SafeToSpend } from "@/lib/selectors/safeToSpend";
import type { ChargedAgain, PendingItem, TallyItem } from "@/lib/selectors/tally";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Checkbox, SelectInput, TextInput } from "@/components/ui/Form";
import { SampleTag } from "@/components/ui/SampleTag";
import { goalLines } from "@/content/firstValue";
import { billSwitchCopy } from "@/content/actions";
import { bufferCopy, milestoneCopy } from "@/content/plans";

const LinkRow = ({ href, children }: { href: string; children: string }) => (
  <Link href={href} className="mt-t2 flex min-h-tap items-center justify-between rounded-sm px-t1 text-small text-accent hover:bg-surface2">
    {children}<ChevronRight aria-hidden size={20} />
  </Link>
);

export function SafeToSpendCard({ safe, onHow, movement }: { safe: SafeToSpend; onHow: () => void; movement?: { up: number; since: string } | null }) {
  useEffect(() => { track("sts_viewed", { value_cents: safe.perDay * 100, days_left: safe.days, nothing_spare: safe.nothingSpare }); }, [safe.perDay, safe.days, safe.nothingSpare]);
  return (
    <section aria-labelledby="sts" className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t4">
      <h2 id="sts" className="text-caption text-text-muted">{s.label}</h2>
      {safe.nothingSpare ? (
        <>
          <p className="mt-t1 text-h2 font-display text-text">{s.none}</p>
          <p className="mt-t1 text-small text-text-muted">{s.noneBody}</p>
        </>
      ) : (
        <>
          <p className="tnum mt-t1 text-figure-l font-numeric text-text">{s.perDay(formatWhole(safe.perDay))}</p>
          {movement && <p className="tnum mt-t1 text-small text-text">{s.up(formatWhole(movement.up), movement.since)}</p>}
          <p className="mt-t1 text-small text-text-muted">{safe.sevenDayMode ? s.sevenDays : s.untilPayday(safe.days, formatShortDay(safe.payday))}</p>
          {safe.goal > 0 && <p className="mt-t1 text-caption text-text-muted">{s.goalIncluded(formatWhole(safe.goal))}</p>}
        </>
      )}
      {safe.paydayEstimated && <p className="mt-t1 text-caption text-text-muted">{s.estimated}</p>}
      <div className="mt-t2 flex flex-col">
        <Button variant="tertiary" onClick={() => { track("sts_breakdown_opened", {}); onHow(); }} className="self-start">{s.how}</Button>
        {safe.nothingSpare && <LinkRow href="/hardship">{s.hardship}</LinkRow>}
      </div>
    </section>
  );
}

const BUFFERS = [0, 25, 50, 100] as const;

export function SafeToSpendSheet({ safe, open, onClose, present, onBuffer, accuracy = null, bufferSteps = null }: { safe: SafeToSpend; open: boolean; onClose: () => void; present: boolean; onBuffer?: (amount: number) => void; accuracy?: string | null;
  /** Spec 07 growth path: $250 and one pay cycle of bills as extra choices, and the next step. */
  bufferSteps?: { extra: number[]; next: number | null } | null }) {
  const choices = [...new Set([...BUFFERS, ...(bufferSteps?.extra ?? [])])].sort((a, b) => a - b);
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
    <Sheet open={open} onClose={onClose} title={s.sheetTitle} subtitle={s.estimate}
      footer={safe.nothingSpare ? <Link href="/hardship" className="flex min-h-tap items-center justify-center rounded-md text-body text-accent hover:bg-surface2">{s.hardship}</Link> : undefined}>
      <dl className="flex flex-col">
        {rows.map(([k, val], i) => (
          <div key={k} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-t3 border-t border-divider py-t3 ${i === rows.length - 1 ? "text-body-strong" : "text-body"}`}>
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
      {accuracy && <p className="mt-t2 text-small text-text">{accuracy}</p>}
      {onBuffer && (
        <fieldset className="mt-t4">
          <legend className="text-body-strong text-text">{s.bufferHeading}</legend>
          <div className="mt-t2 flex flex-wrap gap-t2">
            {choices.map((b) => (
              <button key={b} type="button" aria-pressed={safe.buffer === b} onClick={() => onBuffer(b)}
                className={`min-h-tap min-w-tap rounded-pill px-t4 text-small ${safe.buffer === b ? "bg-accent text-on-accent" : "bg-surface2 text-text hover:bg-neutral-soft"}`}>
                {formatWhole(b)}
              </button>
            ))}
          </div>
          {bufferSteps?.next && <p className="mt-t2 text-small text-text">{bufferCopy.next(formatWhole(bufferSteps.next))}</p>}
        </fieldset>
      )}
      <p className="mt-t2 text-small text-text-muted">{safe.buffer > 0 ? s.bufferNote(formatWhole(safe.buffer)) : s.bufferNoteZero} <SampleTag q="Q21" present={present} /></p>
    </Sheet>
  );
}

export function CheckInCard({ checkIn, onHow, onAdjust, focus, goal = null, firstPayday = false, extra = [] }: { checkIn: PaydayCheckIn; onHow: () => void; onAdjust?: () => void; focus?: string | null; goal?: string | null; firstPayday?: boolean; extra?: string[] }) {
  useEffect(() => {
    track("checkin_opened", { source: "home" });
    track("sts_viewed", { value_cents: checkIn.safe.perDay * 100, days_left: checkIn.safe.days, nothing_spare: checkIn.safe.nothingSpare });
  }, [checkIn.cycle.start, checkIn.safe.perDay, checkIn.safe.days, checkIn.safe.nothingSpare]);
  const main = checkIn.income[0]!;
  return (
    <section aria-labelledby="checkin" className="rounded-card-s bg-accent-soft sm:rounded-card p-t4">
      <div className="flex items-center gap-t2">
        <Sun aria-hidden size={20} className="text-accent" />
        <h2 id="checkin" className="text-card text-text sm:text-card-l">{c.title}</h2>
      </div>
      {firstPayday && <p className="mt-t2 text-small text-text">{goalLines.firstPayday}</p>}
      <p className="mt-t2 text-body text-text">{c.landed(formatCents(checkIn.incomeTotal), main.payer)}</p>
      <h3 className="mt-t3 text-caption text-text-muted">{c.heading} · {c.range(formatDayMonth(checkIn.cycle.start), formatDayMonth(checkIn.cycle.end))}</h3>
      <ul className="mt-t1 flex flex-col gap-t1 text-small text-text">
        <li>{c.bills(checkIn.bills.length, formatWhole(checkIn.billsTotal))}</li>
        {checkIn.repaymentsTotal > 0 && <li>{c.repayments(formatWhole(checkIn.repaymentsTotal))}</li>}
        <li>{checkIn.advance ? c.advance(checkIn.advance.provider, formatWhole(checkIn.advance.amount), formatShortDay(checkIn.advance.date)) : c.noAdvance}</li>
        <li className="text-body-strong">{checkIn.safe.nothingSpare ? s.none : c.safe(formatWhole(checkIn.safe.perDay))}</li>
        {extra.map((x) => <li key={x}>{x}</li>)}
        {checkIn.safe.goal > 0 && <li className="text-caption text-text-muted">{s.goalIncluded(formatWhole(checkIn.safe.goal))}</li>}
      </ul>
      {goal && <p className="mt-t3 text-small text-text-muted">{goalLines.checkIn(goal)}</p>}
      {focus && <p className={goal ? "text-small text-text" : "mt-t3 text-small text-text"}>{c.focus(focus)}</p>}
      <div className="mt-t1 flex flex-wrap gap-x-t2">
        <Button variant="tertiary" onClick={() => { track("sts_breakdown_opened", {}); onHow(); }}>{s.how}</Button>
        {onAdjust && <Button variant="tertiary" onClick={onAdjust}>{c.adjust}</Button>}
      </div>
      <LinkRow href="/calendar">{c.seeBills}</LinkRow>
    </section>
  );
}

export function RecapCard({ recap, feesAvoided, next, lead = null, plan = null, milestones = [], surplus = null }: { recap: CycleRecap; feesAvoided: number; next?: string | null; lead?: "balance" | "advances" | "score" | null; plan?: string | null;
  /** Spec 07: streaks that just reached 2, 4 or 6, and "Move $X to your buffer?" when the cycle ended with money left. */
  milestones?: { kind: "no_advance" | "no_failed_payment" | "money_left"; cycles: number }[]; surplus?: { amount: number; onProtect: () => void } | null }) {
  const [how, setHow] = useState(false);
  useEffect(() => { for (const m of milestones) track("streak_milestone", { type: m.kind, length: m.cycles }); }, [milestones]);
  useEffect(() => { track("recap_opened", { source: "home" }); }, [recap.cycle.start]);
  const advances = [
    recap.advances.count === 0 ? [r.noAdvance, r.streak(recap.noAdvanceStreak)].filter(Boolean).join(" ") : r.advances(recap.advances.count, formatWhole(recap.advances.total)),
    // Lead with the best-ever run when the current one is 0 (spec 07: positive only, never the reset).
    ...(recap.noAdvanceStreak === 0 && recap.bestNoAdvance >= 2 ? [r.best(recap.bestNoAdvance)] : []),
  ];
  const score = recap.score ? r.score(recap.score.from, recap.score.to) : r.noScore;
  // Spec 04: the member's goal puts its line first (money left for payday/buffer goals).
  const balance = lead === "balance" && recap.endBalance !== null ? goalLines.recap.reach_payday(formatWhole(Math.abs(recap.endBalance)), recap.endBalance < 0) : null;
  const rest = [
    r.spent(formatWhole(recap.spent), formatWhole(recap.paidIn)),
    ...(lead === "advances" ? [] : advances),
    ...(lead === "score" ? [] : [score]),
    recap.fees.count ? r.fees(recap.fees.count, formatWhole(recap.fees.total)) : r.noFees,
    ...(feesAvoided > 0 ? [r.feesAvoided(formatDollars(feesAvoided))] : []),
  ];
  const lines = [...(balance ? [balance] : []), ...(lead === "advances" ? advances : []), ...(lead === "score" ? [score] : []), ...rest];
  return (
    <section aria-labelledby="recap" className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t4">
      <h2 id="recap" className="text-card text-text sm:text-card-l">{r.title}</h2>
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
      {milestones.length > 0 && (
        <div className="mt-t3 rounded-card-s bg-accent-soft sm:rounded-card p-t3">
          <h3 className="text-caption text-text-muted">{milestoneCopy.title}</h3>
          <ul className="flex flex-col gap-t1 text-small text-text">{milestones.map((m) => <li key={m.kind}>{milestoneCopy[m.kind](m.cycles)}</li>)}</ul>
        </div>
      )}
      {surplus && (
        <div className="mt-t3 rounded-md bg-surface2 p-t3">
          <h3 className="text-body-strong text-text">{bufferCopy.surplusTitle(formatWhole(surplus.amount))}</h3>
          <p className="mt-t1 text-small text-text-muted">{bufferCopy.surplusBody}</p>
          <div className="mt-t2 flex flex-wrap gap-t2">
            <Button variant="secondary" onClick={surplus.onProtect}>{bufferCopy.setTo(formatWhole(surplus.amount))}</Button>
            <Button variant="tertiary" onClick={() => setHow(true)}>{bufferCopy.how}</Button>
          </div>
          <Sheet open={how} onClose={() => setHow(false)} title={bufferCopy.howTitle}>
            <ol className="flex list-decimal flex-col gap-t2 pl-t5 text-body text-text">{bufferCopy.howSteps.map((x) => <li key={x}>{x}</li>)}</ol>
          </Sheet>
        </div>
      )}
      {plan && <p className="mt-t3 text-small text-text">{plan}</p>}
      {next && <p className={plan ? "text-small text-text" : "mt-t3 text-small text-text"}>{r.next(next)}</p>}
      <LinkRow href="/spending?period=last_cycle">{r.seeSpending}</LinkRow>
      <LinkRow href="/progress">{r.past}</LinkRow>
    </section>
  );
}

type Tally = { total: number; items: TallyItem[]; pending: PendingItem[]; chargedAgain?: ChargedAgain[]; reported?: { merchant: string; monthly: number }[] };

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
  // Spec 06: record each confirmed cancellation once (cancel_confirmed), when the tally first shows it.
  useEffect(() => {
    for (const i of tally.items.filter((x) => x.kind === "subscription")) {
      const k = `tippla-cancel-confirmed:${i.key}`;
      try { if (localStorage.getItem(k)) continue; localStorage.setItem(k, "1"); } catch { /* no storage: may record twice */ }
      track("cancel_confirmed", { merchant: i.label.merchant!, monthly_cents: Math.round((i.amount / (i.label.count ?? 1)) * 100) });
    }
  }, [tally.items]);
  return (
    <section aria-labelledby="tally" className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t4">
      <div className="flex items-start gap-t3">
        <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent"><PiggyBank size={24} /></span>
        <div className="min-w-0 flex-1">
          <h2 id="tally" className="text-caption text-text-muted">{v.label}</h2>
          <p className="tnum text-h2 font-display text-text">{formatDollars(tally.total)}</p>
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
              <li key={i.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-t3 border-t border-divider py-t3 text-body text-text">
                <span>{itemText(i)}</span><span className="tnum">{formatDollars(i.amount)}</span>
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
      {(tally.reported ?? []).length > 0 && (
        <>
          <h3 className="mt-t4 text-caption text-text-muted">{billSwitchCopy.reportedHeading}</h3>
          <ul className="mt-t1 flex flex-col gap-t2 text-body text-text">{tally.reported!.map((r) => <li key={r.merchant}>{billSwitchCopy.reportedLine(r.merchant, formatDollars(r.monthly))}</li>)}</ul>
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
    <Link href="/progress" className="flex min-h-tap items-center gap-t3 rounded-card-s bg-surface shadow-card sm:rounded-card p-t4 hover:bg-surface2">
      <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-surface2 text-neutral"><Flag size={24} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-strong text-text">{progressCopy.homeLink}</span>
        <span className="block text-small text-text-muted">{text}</span>
      </span>
      <ChevronRight aria-hidden size={20} className="text-accent" />
    </Link>
  );
}

/** "Has your pay landed?": on the expected payday, before the pay shows up (spec 02). */
export function PayPendingCard({ payday }: { payday: string }) {
  return (
    <section aria-labelledby="paypending" className="rounded-card-s bg-accent-soft sm:rounded-card p-t4">
      <div className="flex items-center gap-t2">
        <Sun aria-hidden size={20} className="text-accent" />
        <h2 id="paypending" className="text-card text-text sm:text-card-l">{c.pendingTitle}</h2>
      </div>
      <p className="mt-t2 text-small text-text">{c.pendingBody(formatShortDay(payday))}</p>
    </section>
  );
}

type AdjustBill = { id: string; merchant: string; amount: number; date: string; paid: boolean };
type OneOff = { id: string; label: string; amount: number; date: string };

/** Check-in adjustments (spec 02): bills already paid, a known one-off cost, and the buffer. */
export function CheckInAdjustSheet({ open, onClose, bills, oneOffs, dates, onPaid, onAddOneOff, onRemoveOneOff }: {
  open: boolean; onClose: () => void; bills: AdjustBill[]; oneOffs: OneOff[]; dates: string[];
  onPaid: (id: string, paid: boolean) => void; onAddOneOff: (o: Omit<OneOff, "id">) => void; onRemoveOneOff: (id: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(dates[0] ?? "");
  const [error, setError] = useState<string | undefined>();
  const add = () => {
    const amt = Number(amount.replace(/[$,\s]/g, ""));
    if (!label.trim() || label.length > 40 || !Number.isFinite(amt) || amt < 1 || amt > 10000) { setError(c.oneOffInvalid); return; }
    onAddOneOff({ label: label.trim(), amount: Math.round(amt * 100) / 100, date });
    setLabel(""); setAmount(""); setError(undefined);
  };
  return (
    <Sheet open={open} onClose={onClose} title={c.adjustTitle}>
      <p className="text-small text-text-muted">{c.adjustIntro}</p>
      <fieldset className="mt-t4">
        <legend className="text-body-strong text-text">{c.billsHeading}</legend>
        <div className="mt-t1 flex flex-col">
          {bills.map((b) => (
            <Checkbox key={b.id} label={c.alreadyPaid(b.merchant, formatCents(b.amount), formatShortDay(b.date))} checked={b.paid} onChange={(v) => onPaid(b.id, v)} />
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-t4">
        <legend className="text-body-strong text-text">{c.oneOffHeading}</legend>
        {oneOffs.length > 0 && (
          <ul className="mt-t1 flex flex-col">{oneOffs.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-t3 border-t border-divider py-t1 text-small text-text">
              <span>{formatShortDay(o.date)} · {o.label} · <span className="tnum">{formatCents(o.amount)}</span></span>
              <Button variant="tertiary" aria-label={c.oneOffRemove(o.label)} onClick={() => onRemoveOneOff(o.id)}>×</Button>
            </li>
          ))}</ul>
        )}
        <div className="mt-t2 flex flex-col gap-t3">
          <TextInput label={c.oneOffLabel} value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} />
          <TextInput label={c.oneOffAmount} inputMode="decimal" value={amount} error={error} onChange={(e) => { setAmount(e.target.value); setError(undefined); }} />
          <SelectInput label={c.oneOffDate} value={date} options={dates.map((x) => ({ value: x, label: formatShortDay(x) }))} onChange={setDate} />
          <Button variant="secondary" onClick={add}>{c.oneOffAdd}</Button>
        </div>
      </fieldset>
    </Sheet>
  );
}
