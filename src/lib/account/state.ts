// Customer account choices that change what screens show: consents (lender matching hides Offers at once),
// subscription status, dismissed offers, read notifications, bank connection. Mock persistence: a cookie,
// so server-rendered screens agree immediately. Real build: Tippla's own API.
import type { Consent, PersonaData, PersonaId } from "@/lib/api/types";
import type { PlanId } from "@/config/plans";
import type { FeedState } from "@/lib/feed/types";

export const ACCOUNT_COOKIE = "tippla-account";
export const GOAL_MIN = 20;
export const GOAL_MAX = 5000;

export type ConsentId = Consent["id"];
export interface CustomerAction { type: "cancelled_subscription" | "skip_advance"; key?: string; at: string }
/** How the member wants Tippla to charge them (spec 03). Defaults: the day after payday, monthly. */
export interface BillingPref { mode: "after_payday" | "fixed_date"; fixedDay?: number; cadence: "monthly" | "per_cycle"; changedAt: string }
/** One goal at a time: have `amount` left the day before payday, by the pay cycle containing `by`. */
export interface Goal { amount: number; by: string; setAt: string }
export interface SubscriptionState { status: "active" | "paused" | "cancelled"; plan: PlanId; effective: string; changedAt: string }
export interface AccountState {
  consents?: Partial<Record<ConsentId, { granted: boolean; at: string }>>;
  subscription?: SubscriptionState;
  dismissedOffers?: string[];
  readNotifications?: string[];
  bank?: { disconnected?: boolean; refreshedAt?: string };
  /** Things the customer did in the app that the value tally can later confirm in the bank data. */
  actions?: CustomerAction[];
  /** Tippla billing preference (spec 03). */
  billingPref?: BillingPref;
  /** Last date the member opened Hardship support (offers "Pause or downgrade Tippla" for that pay cycle). */
  hardshipVisitedAt?: string;
  /** Usage analytics consent (spec 09). Undefined means the default: on, and the member can turn it off. */
  analytics?: boolean;
  /** The customer's buffer goal (Phase 3, progress and goals). */
  goal?: Goal;
  /** Notification preferences the server applies (frequency cap, weekly digest). */
  notify?: { cap: number; digest: boolean };
  /** "Needs a look" choices: done, snoozed (until a date) or dismissed, by feed item id. */
  feed?: FeedState;
  /** The customer said things are hard right now (docs/09 "in hardship", self-selected). */
  hardshipSelfSelected?: boolean;
}
type AllAccounts = Partial<Record<PersonaId, AccountState>>;

function parseAll(raw: string | undefined): AllAccounts {
  if (!raw) return {};
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as unknown;
    return v && typeof v === "object" ? (v as AllAccounts) : {};
  } catch {
    return {};
  }
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Defensive parse: anything malformed is dropped, never thrown. */
export function parseAccount(raw: string | undefined, persona: PersonaId): AccountState {
  const a = parseAll(raw)[persona];
  if (!a || typeof a !== "object") return {};
  const out: AccountState = { dismissedOffers: strings(a.dismissedOffers), readNotifications: strings(a.readNotifications) };
  if (a.consents && typeof a.consents === "object") {
    out.consents = {};
    for (const id of ["ff_data_sharing", "talefin_bank_data", "lender_matching"] as const) {
      const c = a.consents[id];
      if (c && typeof c.granted === "boolean" && typeof c.at === "string") out.consents[id] = { granted: c.granted, at: c.at };
    }
  }
  const s = a.subscription;
  if (s && ["active", "paused", "cancelled"].includes(s.status) && ["standard", "pro"].includes(s.plan) && typeof s.effective === "string") out.subscription = s;
  if (a.hardshipSelfSelected === true) out.hardshipSelfSelected = true;
  if (typeof a.analytics === "boolean") out.analytics = a.analytics;
  const bp = a.billingPref;
  if (bp && typeof bp === "object" && ["after_payday", "fixed_date"].includes(bp.mode) && ["monthly", "per_cycle"].includes(bp.cadence) && typeof bp.changedAt === "string") {
    const day = Number(bp.fixedDay);
    out.billingPref = { mode: bp.mode, cadence: bp.cadence, changedAt: bp.changedAt, ...(bp.mode === "fixed_date" ? { fixedDay: Number.isInteger(day) && day >= 1 && day <= 28 ? day : 1 } : {}) };
  }
  if (typeof a.hardshipVisitedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.hardshipVisitedAt)) out.hardshipVisitedAt = a.hardshipVisitedAt;
  if (Array.isArray(a.actions)) {
    out.actions = a.actions.filter((x): x is CustomerAction => !!x && ["cancelled_subscription", "skip_advance"].includes(x.type) && typeof x.at === "string" && (x.key === undefined || typeof x.key === "string"));
  }
  if (a.notify && typeof a.notify === "object" && typeof a.notify.cap === "number" && typeof a.notify.digest === "boolean") {
    out.notify = { cap: Math.max(0, Math.min(10, Math.round(a.notify.cap))), digest: a.notify.digest };
  }
  const g = a.goal;
  const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);
  if (g && typeof g === "object" && typeof g.amount === "number" && g.amount >= GOAL_MIN && g.amount <= GOAL_MAX && isDate(g.by) && isDate(g.setAt)) {
    out.goal = { amount: Math.round(g.amount), by: g.by.slice(0, 10), setAt: g.setAt.slice(0, 10) };
  }
  if (a.feed && typeof a.feed === "object") {
    out.feed = {};
    for (const [id, v] of Object.entries(a.feed)) {
      if (v && ["done", "dismissed", "snoozed"].includes(v.status) && typeof v.at === "string") out.feed[id] = { status: v.status, at: v.at, ...(typeof v.until === "string" ? { until: v.until } : {}) };
    }
  }
  if (a.bank && typeof a.bank === "object") out.bank = { disconnected: a.bank.disconnected === true, refreshedAt: typeof a.bank.refreshedAt === "string" ? a.bank.refreshedAt : undefined };
  return out;
}

export function serialiseAccount(raw: string | undefined, persona: PersonaId, state: AccountState): string {
  const all = parseAll(raw);
  all[persona] = state;
  return encodeURIComponent(JSON.stringify(all));
}

/** Apply the customer's choices to the persona data, so every selector sees the same truth. */
export function applyAccount(d: PersonaData, a: AccountState): PersonaData {
  const consents = d.consents.map((c) => {
    const o = a.consents?.[c.id];
    return o ? { ...c, granted: o.granted, granted_at: o.granted ? o.at : c.granted_at } : c;
  });
  const dismissed = new Set(a.dismissedOffers ?? []);
  const matching = consents.find((c) => c.id === "lender_matching")?.granted ?? false;
  return {
    ...d,
    consents,
    offers: { lender_matching_consent: matching, offers: d.offers.offers.filter((o) => !dismissed.has(o.id)) },
  };
}

/** "Now" in the mock world: the data date, mid-morning AEST. */
export const mockNow = (d: Pick<PersonaData, "asOf">) => `${d.asOf}T09:30:00+10:00`;
