// P13 Subscription & billing. Billing starts on the sign-up date (first consent) and repeats monthly.
// Prices and the pause policy are SAMPLE LOGIC (Q9, src/config/plans.ts).
import type { PersonaData } from "@/lib/api/types";
import { PAUSE_MONTHS, PLANS, type PlanId } from "@/config/plans";
import type { AccountState } from "@/lib/account/state";
import { toAESTDate, type ISODate } from "@/lib/format/dates";

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
}

export function billing(d: Pick<PersonaData, "consents" | "asOf" | "profile">, a: AccountState = {}): BillingView {
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
  let until: ISODate | null = null;
  if (status === "cancelled") { until = next; }
  if (status === "paused") { until = addMonths(next, PAUSE_MONTHS, day); next = until; }
  return {
    plan, planName: PLANS[plan].name, price: PLANS[plan].pricePerMonth, status,
    nextCharge: status === "cancelled" ? null : next,
    until, pendingPlan,
    history: charges.map((date) => ({ date, amount: PLANS[basePlan].pricePerMonth, plan: basePlan })).reverse(),
    effects: { cancelAccessUntil: addMonths(start, charges.length, day), pauseSkips: addMonths(start, charges.length, day), pauseResumes: addMonths(start, charges.length + PAUSE_MONTHS, day), changeFrom: addMonths(start, charges.length, day) },
  };
}
