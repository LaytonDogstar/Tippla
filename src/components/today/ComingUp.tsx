"use client";
// Coming up (single-column Today, 09/10/2026), built around payday:
//   Before payday · {date}   Balance now, then each payment with what's left after it. The payment that takes the
//                            balance below $0 sits on the soft negative tint with a way forward under it; the block
//                            closes with "Short before payday" (or "Left before payday").
//   Payday                   a soft positive row, with the pay and what's left.
//   After payday             collapsed to one line ("8 bills, $1,051 left by Wed 07/10"), Show / Hide.
// Every "left" is the forecast's own arithmetic (selectors/today comingUpBlocks), so it matches the Calendar.
import Link from "next/link";
import { useId, useState } from "react";
import { ArrowDown, ChevronDown, TriangleAlert } from "lucide-react";
import { todayCopy } from "@/content/today";
import { formatDollars, formatShortDay, formatWhole } from "@/lib/format";
import type { ComingUpBlocks, ComingUpRow } from "@/lib/selectors/today";
import { cx } from "@/components/ui/cx";
import { Card } from "./Card";

const t = todayCopy.coming;
/** Open question (09/10/2026): the shortfall also shows on the total row and in the hero. Set false to drop the
 * "left" figure from the payment that takes the balance below $0. */
export const SHOW_LEFT_ON_CROSSING_ROW = true;

const signed = (n: number) => `${n < 0 ? "−" : ""}${formatWhole(Math.abs(n))}`;

export function ComingUp({ blocks, pauseHref = "/account/subscription", onBill }: {
  blocks: ComingUpBlocks; pauseHref?: string;
  /** A bill's name before payday opens what's due (with "Not right?" corrections): the hero no longer has that button. */
  onBill?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const { before, paydayRows, after, afterSummary } = blocks;
  const nothing = !before.length && !paydayRows.length && !after.length;
  const short = blocks.leftBeforePayday < 0;
  return (
    <Card id="coming-up" title={t.heading} action={{ href: "/calendar", label: t.calendar }}>
      {nothing ? <p className="text-body14 text-text-secondary">{t.none}</p> : (
        <div className="flex flex-col">
          <p className="pb-t1 text-meta-s font-bold uppercase tracking-[0.06em] text-text-muted">{t.beforePayday(formatShortDay(blocks.payday))}</p>
          <ul>
            <li className="flex items-center gap-t3 py-[10px]">
              <div className="min-w-0 flex-1">
                <p className="text-body14 font-bold text-text">{t.balanceNow}</p>
                <p className="text-meta-s text-text-muted">{formatShortDay(blocks.asOf)}</p>
              </div>
              <span className={cx("tnum text-[0.9375rem] font-bold", blocks.balanceNow < 0 ? "text-negative" : "text-text")}>{signed(blocks.balanceNow)}</span>
            </li>
            {before.map((r) => <Row key={key(r)} r={r} pauseHref={pauseHref} onBill={onBill} />)}
          </ul>
          <p className={cx("tnum flex items-baseline justify-between gap-t3 border-t-2 border-text pt-t2 text-[0.9375rem] font-bold", short ? "text-negative" : "text-text")}>
            <span className="inline-flex items-center gap-t1">{short && <TriangleAlert aria-hidden size={16} strokeWidth={2} />}{short ? t.shortBefore : t.leftBefore}</span>
            <span>{signed(blocks.leftBeforePayday)}</span>
          </p>

          {paydayRows.map((r) => (
            <div key={key(r)} className="mt-t3 flex items-center gap-t3 rounded-inset bg-positive-soft px-t3 py-[10px]">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-t1 text-body14 font-bold text-text"><ArrowDown aria-hidden size={16} strokeWidth={2} className="shrink-0 text-positive" />{t.paydayRow(r.name)}</p>
                <p className="text-meta-s text-text-muted">{formatShortDay(r.date)} · {t.qualifier[r.qualifier]}</p>
              </div>
              <Amounts r={r} />
            </div>
          ))}

          {afterSummary && (
            <div className="mt-t3 border-t border-divider pt-t1">
              <button type="button" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((v) => !v)}
                className="flex min-h-tap w-full items-center gap-t2 text-left">
                <span className="min-w-0 flex-1 text-body14 text-text">
                  <strong className="font-bold">{t.afterPayday}</strong>
                  <span className="tnum text-text-secondary"> · {t.afterSummary(afterSummary.bills, signed(afterSummary.left), formatShortDay(afterSummary.lastDate))}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-[2px] text-body14 font-semibold text-accent">{open ? t.hide : t.show}<ChevronDown aria-hidden size={16} className={cx(open && "rotate-180")} /></span>
              </button>
              {open && <ul id={panel}>{after.map((r) => <Row key={key(r)} r={r} pauseHref={pauseHref} />)}</ul>}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

const key = (r: ComingUpRow) => `${r.kind}-${r.name}-${r.date}`;

function Row({ r, pauseHref, onBill }: { r: ComingUpRow; pauseHref: string; onBill?: () => void }) {
  const title = r.kind === "tippla" ? t.tippla : r.name;
  const kind = r.kind === "payAdvance" ? t.advanceSub : r.kind === "income" ? t.payday : null;
  const status = r.kind === "tippla" ? null : t.qualifier[r.qualifier];
  const sub = [formatShortDay(r.date), kind, status].filter(Boolean).join(" · ");
  return (
    <li className={cx("flex items-start gap-t3 border-t border-divider py-[10px]", r.takesBelowZero && "-mx-t3 rounded-inset border-t-transparent bg-negative-soft px-t3")}>
      <div className="min-w-0 flex-1">
        {onBill && r.kind !== "income" && r.kind !== "tippla"
          ? <button type="button" onClick={onBill} className="-my-t1 min-h-tap text-left text-body14 font-bold text-text underline-offset-2 hover:underline">{title}</button>
          : <p className="text-body14 font-bold text-text">{title}</p>}
        <p className="text-meta-s text-text-muted">{sub}</p>
        {r.kind === "tippla" && <Link href={pauseHref} className="inline-flex min-h-tap items-center text-meta font-semibold text-accent underline-offset-2 hover:underline">{t.pauseThisMonth}</Link>}
        {r.takesBelowZero && (
          <Link href="/hardship" className="inline-flex min-h-tap items-center gap-t1 text-meta font-semibold text-negative underline underline-offset-2">
            <TriangleAlert aria-hidden size={14} strokeWidth={2} />{t.belowZero} · {t.seeOptions}
          </Link>
        )}
      </div>
      <Amounts r={r} hideLeft={r.takesBelowZero && !SHOW_LEFT_ON_CROSSING_ROW} />
    </li>
  );
}

function Amounts({ r, hideLeft }: { r: ComingUpRow; hideLeft?: boolean }) {
  const income = r.kind === "income";
  return (
    <div className="tnum shrink-0 text-right">
      <p className={cx("text-[0.9375rem] font-bold", income ? "text-positive" : "text-text")}>{income ? "+" : "−"}{formatDollars(r.amount)}</p>
      {!hideLeft && <p className={cx("text-meta-s", r.left < 0 ? "font-bold text-negative" : "text-text-muted")}>{t.left(signed(r.left))}</p>}
    </div>
  );
}
