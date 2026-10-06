// P13 Subscription & billing. Billing starts on the sign-up date (first consent) and repeats monthly.
// Prices and the pause policy are SAMPLE LOGIC (Q9, src/config/plans.ts).
// Spec 03 (flag payday_billing_v1): the charge moves to the day after payday, never lands where Tippla's own
// forecast says it would take the balance below $0 before the next pay, and failed payments are only
// retried after pay lands. Alignment rules are SAMPLE LOGIC (Q25).
import type { PersonaData } from "@/lib/api/types";
import { BILLING_FLOOR, CYCLES_PER_YEAR, MAX_BILLING_RETRIES, PAUSE_MONTHS, PLANS, type PlanId } from "@/config/plans";
import { isOn } from "@/config/featureFlags";
import type { AccountState, BillingPref } from "@/lib/account/state";
import { addDays, daysBetween, toAESTDate, type ISODate } from "@/lib/format/dates";
import { cents } from "@/lib/format/money";
import { projectedBalances } from "./balance";

function addMonths(date: ISODate, n: number, day: number): ISODate {
  const [y, m] = date.split("-").map(Number) as [number, number];
  const t = y * 12 + (m - 1) + n;
  const ny = Math.floor(t / 12), nm = (t % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

export function signupDate(d: Pick<PersonaData, "consents" | "asOf">): ISODate {
  const dates = d.consents.map((c) => c.granted_at).filter((x): x is string => !!x).map(toAESTDate).sort();
  return dates[0] ?? d.asOf;
}

export interface BillingView {
  plan: PlanId;
  planName: string;
  price: number;
  status: "active" | "paused" | "cancelled";
  /** Next charge, or null when cancelled. */
  nextCharge: ISODate | null;
  /** Cancelled: access continues until this date. Paused: billing resumes on this date. */
  until: ISODate | null;
  /** Pending plan change, effective on the next charge. */
  pendingPlan: PlanId | null;
  history: { date: ISODate; amount: number; plan: PlanId }[];
  /** What each choice would do, worked out before the customer confirms. */
  effects: { cancelAccessUntil: ISODate; pauseSkips: ISODate; pauseResumes: ISODate; changeFrom: ISODate };
  /** Payday billing (spec 03), when its flag is on. */
  alignment: BillingAlignment | null;
}

export interface BillingAlignment {
  pref: BillingPref;
  /** The date the old schedule would have charged (sign-up anniversary). */
  nominal: ISODate;
  /** The payday the charge follows (after-payday and per-cycle modes). */
  payday: ISODate | null;
  /** The charge moved from the old schedule to after payday. */
  moved: boolean;
  /** The charge was pushed back because it would have taken the balance below $0 before the next pay. */
  deferred: { from: ISODate; to: ISODate; lowest: number } | null;
  /** Amount of the next charge (per-cycle billing charges monthly × 12 ÷ 26). */
  amount: number;
  /** One-off adjustment for moving the date: positive = extra days covered, negative = credit. */
  proration: { from: ISODate; to: ISODate; days: number; periodDays: number; amount: number } | null;
  /** Dev state "billing_failed": the last payment failed; retries only after pay lands. */
  failed: { on: ISODate; amount: number; retries: ISODate[] } | null;
}

export const DEFAULT_BILLING_PREF: Omit<BillingPref, "changedAt"> = { mode: "after_payday", cadence: "monthly" };

/** Upcoming paydays (the pay pattern's next payday, then fortnightly), first on or after `from`. */
export function paydaysFrom(d: Pick<PersonaData, "derived">, from: ISODate, count = 8): ISODate[] {
  const next = d.derived.pay_cycle?.next_payday;
  if (!next) return [];
  const out: ISODate[] = [];
  for (let p = next; out.length < count; p = addDays(p, 14)) if (p >= from) out.push(p);
  return out;
}

/** Never before the next pay lands: retry the day after each of the next paydays, at most twice. */
export function retryDates(d: Pick<PersonaData, "derived">, failedOn: ISODate, max = MAX_BILLING_RETRIES): ISODate[] {
  return paydaysFrom(d, addDays(failedOn, 1), max).map((p) => addDays(p, 1));
}

/** Lowest forecast end-of-day balance from `from` up to the day before the next payday after it. */
function lowestBefore(d: PersonaData, from: ISODate): number | null {
  const nextPay = paydaysFrom(d, addDays(from, 1), 1)[0];
  if (!nextPay) return null;
  const until = addDays(nextPay, -1);
  const pts = projectedBalances(d, until).filter((p) => p.date >= from);
  return pts.length ? Math.min(...pts.map((p) => p.balance)) : null;
}

function nextFixed(asOf: ISODate, day: number): ISODate {
  let probe = addMonths(asOf, 0, day);
  if (probe <= asOf) probe = addMonths(asOf, 1, day);
  return probe;
}

/** The aligned next charge date and how it was worked out. */
export function alignBilling(d: PersonaData, a: AccountState, nominal: ISODate, monthly: number, opts: { failedOn?: ISODate | null } = {}): { next: ISODate; alignment: BillingAlignment } {
  const pref: BillingPref = a.billingPref ?? { ...DEFAULT_BILLING_PREF, changedAt: "" };
  const tomorrow = addDays(d.asOf, 1);
  const paydays = paydaysFrom(d, d.asOf);
  let charge = nominal, payday: ISODate | null = null;
  if (pref.mode === "fixed_date") {
    charge = nextFixed(d.asOf, pref.fixedDay ?? Number(nominal.slice(8)));
  } else if (pref.cadence === "per_cycle") {
    payday = paydays.find((p) => addDays(p, 1) >= tomorrow) ?? null;
    if (payday) charge = addDays(payday, 1);
  } else {
    // Monthly, the day after the payday nearest the old date (never in the past; ties go later).
    const options = paydays.filter((p) => addDays(p, 1) >= tomorrow);
    payday = options.sort((x, y) => Math.abs(daysBetween(nominal, addDays(x, 1))) - Math.abs(daysBetween(nominal, addDays(y, 1))) || y.localeCompare(x))[0] ?? null;
    if (payday) charge = addDays(payday, 1);
  }
  const amount = pref.cadence === "per_cycle" ? cents((monthly * 12) / CYCLES_PER_YEAR) : monthly;
  // Never charge where the forecast says it would take the balance below the floor before the next pay.
  let deferred: BillingAlignment["deferred"] = null;
  const lowest = lowestBefore(d, charge);
  if (lowest !== null && lowest - amount < BILLING_FLOOR) {
    const after = paydaysFrom(d, addDays(charge, 1), 1)[0];
    if (after) { deferred = { from: charge, to: addDays(after, 1), lowest }; charge = deferred.to; payday = after; }
  }
  const days = daysBetween(nominal, charge);
  const periodDays = daysBetween(nominal, addMonths(nominal, 1, Number(nominal.slice(8))));
  const proration = pref.cadence === "monthly" && days !== 0
    ? { from: days > 0 ? nominal : charge, to: addDays(days > 0 ? charge : nominal, -1), days, periodDays, amount: cents((monthly * days) / periodDays) }
    : null;
  return {
    next: charge,
    alignment: {
      pref, nominal, payday, moved: charge !== nominal, deferred, amount, proration,
      failed: opts.failedOn ? { on: opts.failedOn, amount: monthly, retries: retryDates(d, opts.failedOn) } : null,
    },
  };
}

export function billing(d: PersonaData, a: AccountState = {}, opts: { failedLast?: boolean } = {}): BillingView {
  const start = signupDate(d);
  const day = Number(start.slice(8));
  const basePlan: PlanId = d.profile.tier;
  const charges: ISODate[] = [];
  for (let i = 0; ; i++) {
    const c = addMonths(start, i, day);
    if (c > d.asOf) break;
    charges.push(c);
  }
  let next = addMonths(start, charges.length, day);
  const sub = a.subscription;
  // A change takes effect on the next charge; until then the current plan applies.
  const plan: PlanId = sub && sub.status === "active" && sub.plan !== basePlan && sub.effective <= d.asOf ? sub.plan : basePlan;
  const pendingPlan = sub && sub.status === "active" && sub.plan !== plan ? sub.plan : null;
  const status = sub?.status ?? "active";
  const nominal = next;
  // Payday billing: the next charge (and so the pause and plan-change dates) follow the aligned date.
  const failedOn = opts.failedLast ? charges.at(-1) ?? null : null;
  const aligned = status !== "cancelled" && isOn("payday_billing_v1", d.profile.id)
    ? alignBilling(d, a, nominal, PLANS[plan].pricePerMonth, { failedOn }) : null;
  let until: ISODate | null = null;
  if (status === "cancelled") { until = next; }
  if (aligned) next = aligned.next;
  if (status === "paused") { until = aligned ? alignedResume(d, a, next) : addMonths(next, PAUSE_MONTHS, day); next = until; }
  return {
    plan, planName: PLANS[plan].name, price: PLANS[plan].pricePerMonth, status,
    nextCharge: status === "cancelled" ? null : next,
    until, pendingPlan,
    history: charges.map((date) => ({ date, amount: PLANS[basePlan].pricePerMonth, plan: basePlan })).reverse(),
    effects: {
      cancelAccessUntil: nominal,
      pauseSkips: aligned?.next ?? nominal,
      pauseResumes: aligned ? alignedResume(d, a, aligned.next) : addMonths(start, charges.length + PAUSE_MONTHS, day),
      changeFrom: aligned?.next ?? nominal,
    },
    alignment: status === "active" ? aligned?.alignment ?? null : null,
  };
}

/** After a pause, billing resumes on the same rule, a month on from the skipped charge. */
function alignedResume(d: PersonaData, a: AccountState, skipped: ISODate): ISODate {
  const pref = a.billingPref ?? DEFAULT_BILLING_PREF;
  const target = addMonths(skipped, PAUSE_MONTHS, Number(skipped.slice(8)));
  if (pref.mode === "fixed_date") return target;
  const pays = paydaysFrom(d, addDays(target, -14), 6);
  const best = pays.sort((x, y) => Math.abs(daysBetween(target, addDays(x, 1))) - Math.abs(daysBetween(target, addDays(y, 1))) || y.localeCompare(x))[0];
  return best ? addDays(best, 1) : target;
}
