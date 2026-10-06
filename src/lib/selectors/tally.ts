// "Tippla has helped you save": only savings we can see in the bank data after something the customer did
// in the app. SAMPLE LOGIC for the confirmation windows (see each rule).
import type { PersonaData } from "@/lib/api/types";
import { DEFAULT_DISHONOUR_FEE } from "@/config/flags";
import type { AccountState } from "@/lib/account/state";
import { addDays, daysBetween, type ISODate } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { payAdvanceRun } from "./loans";
import { cycleBefore, currentCycle } from "./periods";
import { addMonth, detectSubscriptions } from "./subscriptions";
import { inPeriod, posted } from "./transactions";

export interface TallyItem { kind: "subscription" | "advance" | "dishonour"; key: string; amount: number; date: ISODate; label: { merchant?: string; date: ISODate; count?: number } }
export interface PendingItem { kind: "subscription" | "advance"; key: string; confirmAfter: ISODate }
/** Marked cancelled in the app, but charged again afterwards: worth a gentle check, never counted. */
export interface ChargedAgain { merchant: string; date: ISODate; amount: number }


/** Grace after an expected charge date before we count it as not taken. */
export const CHARGE_GRACE_DAYS = 3;
/** Spec 02: a cancelled subscription counts for at most 12 months. */
export const SUBSCRIPTION_CAP_MONTHS = 12;
/** Spec 02: an avoided failed-payment fee counts at 50% of the usual fee (conservative). */
export const DISHONOUR_SHARE = 0.5;

export function valueTally(d: PersonaData, a: AccountState = {}) {
  const items: TallyItem[] = [];
  const pending: PendingItem[] = [];
  const chargedAgain: ChargedAgain[] = [];
  const tx = posted(d.transactions);
  const subs = detectSubscriptions(d);

  // 1. Subscription cancelled in the app, and its expected charges since then haven't been taken.
  for (const act of (a.actions ?? []).filter((x) => x.type === "cancelled_subscription" && x.key)) {
    const sub = subs.find((s) => s.merchant === act.key);
    if (!sub) continue;
    const at = act.at.slice(0, 10);
    const again = tx.find((t) => t.merchant === sub.merchant && t.amount < 0 && t.date > at);
    if (again) { chargedAgain.push({ merchant: sub.merchant, date: again.date, amount: -again.amount }); continue; }
    let expected = addMonth(sub.last_charged);
    while (expected <= at) expected = addMonth(expected);
    // No charge since the cancellation (checked above): count each expected charge whose grace has passed.
    let missed = 0;
    let firstConfirm: ISODate | null = null;
    for (let due = expected; addDays(due, CHARGE_GRACE_DAYS) < d.asOf && missed < SUBSCRIPTION_CAP_MONTHS; due = addMonth(due)) {
      missed++;
      firstConfirm ??= due;
    }
    if (missed > 0) items.push({ kind: "subscription", key: `sub:${sub.merchant}`, amount: sumMoney([sub.amount * missed]), date: firstConfirm!, label: { merchant: sub.merchant, date: firstConfirm!, count: missed } });
    else pending.push({ kind: "subscription", key: `sub:${sub.merchant}`, confirmAfter: addDays(expected, CHARGE_GRACE_DAYS) });
  }

  // 2. "Skip the next pay advance": each complete pay cycle after the choice with no new advance saves
  //    the advance fee the customer was paying.
  const skip = (a.actions ?? []).filter((x) => x.type === "skip_advance").map((x) => x.at.slice(0, 10)).sort()[0];
  if (skip) {
    const fee = payAdvanceRun(d)?.fee ?? null;
    const isAdv = (t: { category: string; amount: number }) => t.category === "wage_advance" && t.amount > 0;
    for (let n = 1; n <= 26 && fee; n++) {
      const c = cycleBefore(d, n);
      if (c.start <= skip) break; // only whole cycles after the choice count
      if (!inPeriod(tx, c).some(isAdv)) items.push({ kind: "advance", key: `adv:${c.start}`, amount: fee, date: c.end, label: { date: c.start } });
    }
    // The cycle in progress: waiting to confirm, unless an advance has been taken since (then nothing is
    // said: no streak-breaking messages).
    const cur = currentCycle(d);
    if (fee && !inPeriod(tx, cur).some((t) => isAdv(t) && t.date >= skip)) pending.push({ kind: "advance", key: `adv:${cur.start}`, confirmAfter: d.derived.pay_cycle.next_payday });
  }

  // 3. A "bill bigger than your balance" card the customer acted on (Done) before the bill date, and the
  //    bill went through with no failed-payment fee within 3 days.
  const pastFees = tx.filter((t) => t.subcategory === "dishonour").map((t) => -t.amount);
  const fee = sumMoney([(pastFees.length ? pastFees[pastFees.length - 1]! : DEFAULT_DISHONOUR_FEE) * DISHONOUR_SHARE]);
  for (const [id, st] of Object.entries(a.feed ?? {})) {
    const m = /^bill_over_balance:(.+):(\d{4}-\d{2}-\d{2})$/.exec(id);
    if (!m || st.status !== "done" || st.at > m[2]!) continue;
    const [merchant, date] = [m[1]!, m[2]!];
    if (date >= d.asOf) continue; // not happened yet (failed-payment fees post the same or next day)
    const paid = tx.some((t) => t.merchant === merchant && t.amount < 0 && t.date >= date && daysBetween(date, t.date) <= CHARGE_GRACE_DAYS);
    const failed = tx.some((t) => t.subcategory === "dishonour" && t.date >= date && daysBetween(date, t.date) <= CHARGE_GRACE_DAYS);
    if (paid && !failed) items.push({ kind: "dishonour", key: `dis:${merchant}:${date}`, amount: fee, date, label: { merchant, date } });
  }

  return { total: sumMoney(items.map((i) => i.amount)), items, pending, chargedAgain };
}
