// Customer account choices that change what screens show: consents (lender matching hides Offers at once),
// subscription status, dismissed offers, read notifications, bank connection. Mock persistence: a cookie,
// so server-rendered screens agree immediately. Real build: Tippla's own API.
import type { Consent, PersonaData, PersonaId } from "@/lib/api/types";
import type { PlanId } from "@/config/plans";
import type { FeedState } from "@/lib/feed/types";
import { applyRules, parseRules, type BillAdjust, type MemberRule } from "./corrections";

export const ACCOUNT_COOKIE = "tippla-account";
export const GOAL_MIN = 20;
export const GOAL_MAX = 5000;

export type ConsentId = Consent["id"];
export interface CustomerAction { type: "cancelled_subscription" | "skip_advance"; key?: string; at: string }
/** How the member wants Tippla to charge them (spec 03). Defaults: the day after payday, monthly. */
export interface BillingPref { mode: "after_payday" | "fixed_date"; fixedDay?: number; cadence: "monthly" | "per_cycle"; changedAt: string }
export type NotifyCategory = "money" | "payday" | "score" | "subscription" | "bank";
export interface NotifySettings {
  digest: boolean;
  cap?: number;
  paused?: boolean;
  quiet?: { start: string; end: string };
  detailed?: boolean;
  channels?: Partial<Record<NotifyCategory, { push: boolean; email: boolean }>>;
}
/** One goal at a time: have `amount` left the day before payday, by the pay cycle containing `by`. */
export interface Goal { amount: number; by: string; setAt: string }
/** What the member said would help most (spec 04). Drives the first plan step, check-in focus and recap. */
export const FOCUS_GOALS = ["reach_payday", "off_advances", "lift_score", "cut_bills", "build_buffer", "gambling_less"] as const;
export type FocusGoalType = (typeof FOCUS_GOALS)[number];
export interface FocusGoal { type: FocusGoalType; startedAt: string }
export interface SubscriptionState { status: "active" | "paused" | "cancelled"; plan: PlanId; effective: string; changedAt: string }
export interface AccountState {
  consents?: Partial<Record<ConsentId, { granted: boolean; at: string }>>;
  subscription?: SubscriptionState;
  dismissedOffers?: string[];
  readNotifications?: string[];
  /** renewedOn: the data date the member last reconnected / renewed consent (spec 05). */
  bank?: { disconnected?: boolean; refreshedAt?: string; renewedOn?: string };
  /** Things the customer did in the app that the value tally can later confirm in the bank data. */
  actions?: CustomerAction[];
  /** Tippla billing preference (spec 03). */
  billingPref?: BillingPref;
  /** Last date the member opened Hardship support (offers "Pause or downgrade Tippla" for that pay cycle). */
  hardshipVisitedAt?: string;
  /** Safe-to-spend buffer the member chose (spec 02; default $0). */
  buffer?: number;
  /** Last two safe-to-spend figures seen on different days, for "Up $4 since yesterday" (spec 02). */
  stsSeen?: { date: string; perDay: number; prev?: { date: string; perDay: number } };
  /** Check-in adjustments (spec 02): predicted bills already paid, and known one-off costs. */
  billAdjust?: BillAdjust;
  /** Hardship letters the member made (spec 06), latest per lender, with the follow-up answer. */
  hardshipLetters?: { lender: string; at: string; output: "copy" | "email" | "pdf"; outcome?: "agreed" | "declined" | "not_yet"; answeredAt?: string }[];
  /** Entitlements check (spec 06): answers only if the member chose to keep them. */
  entitlements?: { completedAt: string; answers?: Record<string, string> };
  /** Self-reported bill switches (spec 06), counted in the tally as "you told us". */
  billSwitches?: { merchant: string; monthly: number; at: string }[];
  /** Answers to "We got this one wrong" (spec 05), by forecast date. */
  forecastAnswers?: Record<string, string>;
  /** Member rules (spec 05): how Tippla should treat a merchant or payer, now and in future. */
  rules?: MemberRule[];
  /** The member hid gambling insights (spec 01): no gambling in explanations or Spending insights. */
  hideGambling?: boolean;
  /** Usage analytics consent (spec 09). Undefined means the default: on, and the member can turn it off. */
  analytics?: boolean;
  /** What would help most right now (spec 04), chosen at onboarding and changeable later. */
  focusGoal?: FocusGoal;
  /** The data date onboarding finished on (spec 04: first-week nudge, enhanced first payday). */
  onboardedAt?: string;
  /** The customer's buffer goal (Phase 3, progress and goals). */
  goal?: Goal;
  /** Notification preferences the server applies (spec 10 policy: pause, quiet hours, lock-screen detail,
   *  weekly digest, push/email per category). `cap` is from the loop phase and no longer used. */
  notify?: NotifySettings;
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
  if (a.hideGambling === true) out.hideGambling = true;
  if (typeof a.buffer === "number" && a.buffer >= 0 && a.buffer <= 2000) out.buffer = Math.round(a.buffer);
  const day = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const seen = a.stsSeen;
  if (seen && day(seen.date) && typeof seen.perDay === "number") {
    out.stsSeen = { date: seen.date, perDay: seen.perDay, ...(seen.prev && day(seen.prev.date) && typeof seen.prev.perDay === "number" ? { prev: { date: seen.prev.date, perDay: seen.prev.perDay } } : {}) };
  }
  const adj = a.billAdjust;
  if (adj && typeof adj === "object") {
    out.billAdjust = {
      paid: strings(adj.paid).slice(0, 50),
      oneOffs: (Array.isArray(adj.oneOffs) ? adj.oneOffs : []).filter((o): o is { id: string; label: string; amount: number; date: string } =>
        !!o && typeof o.id === "string" && typeof o.label === "string" && o.label.length <= 40 && typeof o.amount === "number" && o.amount > 0 && o.amount <= 10000 && day(o.date)).slice(0, 20),
    };
    const amounts = Object.entries(adj.amounts ?? {}).filter(([k, v]) => k.length <= 120 && typeof v === "number" && v > 0 && v <= 20000).slice(0, 50);
    const moved = Object.entries(adj.moved ?? {}).filter(([k, v]) => k.length <= 120 && day(v)).slice(0, 50);
    if (amounts.length) out.billAdjust.amounts = Object.fromEntries(amounts.map(([k, v]) => [k, Math.round(v * 100) / 100]));
    if (moved.length) out.billAdjust.moved = Object.fromEntries(moved);
  }
  const bp = a.billingPref;
  if (bp && typeof bp === "object" && ["after_payday", "fixed_date"].includes(bp.mode) && ["monthly", "per_cycle"].includes(bp.cadence) && typeof bp.changedAt === "string") {
    const day = Number(bp.fixedDay);
    out.billingPref = { mode: bp.mode, cadence: bp.cadence, changedAt: bp.changedAt, ...(bp.mode === "fixed_date" ? { fixedDay: Number.isInteger(day) && day >= 1 && day <= 28 ? day : 1 } : {}) };
  }
  if (typeof a.hardshipVisitedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.hardshipVisitedAt)) out.hardshipVisitedAt = a.hardshipVisitedAt;
  if (Array.isArray(a.actions)) {
    out.actions = a.actions.filter((x): x is CustomerAction => !!x && ["cancelled_subscription", "skip_advance"].includes(x.type) && typeof x.at === "string" && (x.key === undefined || typeof x.key === "string"));
  }
  if (a.notify && typeof a.notify === "object" && typeof a.notify.digest === "boolean") {
    const n = a.notify;
    const hhmm = (v: unknown) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
    const s: NotifySettings = { digest: n.digest };
    if (typeof n.cap === "number") s.cap = Math.max(0, Math.min(10, Math.round(n.cap)));
    if (typeof n.paused === "boolean") s.paused = n.paused;
    if (typeof n.detailed === "boolean") s.detailed = n.detailed;
    if (n.quiet && hhmm(n.quiet.start) && hhmm(n.quiet.end)) s.quiet = { start: n.quiet.start, end: n.quiet.end };
    if (n.channels && typeof n.channels === "object") {
      s.channels = {};
      for (const k of ["money", "payday", "score", "subscription", "bank"] as const) {
        const c = n.channels[k];
        if (c && typeof c.push === "boolean" && typeof c.email === "boolean") s.channels[k] = { push: c.push, email: c.email };
      }
    }
    out.notify = s;
  }
  const g = a.goal;
  const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);
  if (g && typeof g === "object" && typeof g.amount === "number" && g.amount >= GOAL_MIN && g.amount <= GOAL_MAX && isDate(g.by) && isDate(g.setAt)) {
    out.goal = { amount: Math.round(g.amount), by: g.by.slice(0, 10), setAt: g.setAt.slice(0, 10) };
  }
  if (Array.isArray(a.hardshipLetters)) {
    const hl = a.hardshipLetters.filter((x) => x && typeof x.lender === "string" && x.lender.length <= 60 && day(x.at) && ["copy", "email", "pdf"].includes(x.output))
      .map((x) => ({ lender: x.lender, at: x.at, output: x.output, ...(x.outcome && ["agreed", "declined", "not_yet"].includes(x.outcome) ? { outcome: x.outcome } : {}), ...(day(x.answeredAt) ? { answeredAt: x.answeredAt } : {}) }))
      .slice(-10);
    if (hl.length) out.hardshipLetters = hl;
  }
  const ent = a.entitlements;
  if (ent && typeof ent === "object" && day(ent.completedAt)) {
    const answers = ent.answers && typeof ent.answers === "object" ? Object.fromEntries(Object.entries(ent.answers).filter(([k, v]) => /^[a-z]{2,12}$/.test(k) && typeof v === "string" && /^[a-z_]{2,12}$/.test(v)).slice(0, 10)) : undefined;
    out.entitlements = { completedAt: ent.completedAt, ...(answers && Object.keys(answers).length ? { answers } : {}) };
  }
  if (Array.isArray(a.billSwitches)) {
    const bs = a.billSwitches.filter((x) => x && typeof x.merchant === "string" && x.merchant.length <= 60 && typeof x.monthly === "number" && x.monthly >= 1 && x.monthly <= 500 && day(x.at)).slice(-10);
    if (bs.length) out.billSwitches = bs;
  }
  if (a.forecastAnswers && typeof a.forecastAnswers === "object") {
    const fa = Object.entries(a.forecastAnswers).filter(([k, v]) => day(k) && ["one_off", "bill_moved", "pay_different", "nothing"].includes(v as string)).slice(-30);
    if (fa.length) out.forecastAnswers = Object.fromEntries(fa) as Record<string, string>;
  }
  const rules = parseRules(a.rules);
  if (rules.length) out.rules = rules;
  const fg = a.focusGoal;
  if (fg && typeof fg === "object" && (FOCUS_GOALS as readonly string[]).includes(fg.type) && isDate(fg.startedAt)) out.focusGoal = { type: fg.type, startedAt: fg.startedAt.slice(0, 10) };
  if (isDate(a.onboardedAt)) out.onboardedAt = a.onboardedAt.slice(0, 10);
  if (a.feed && typeof a.feed === "object") {
    out.feed = {};
    for (const [id, v] of Object.entries(a.feed)) {
      if (v && ["done", "dismissed", "snoozed"].includes(v.status) && typeof v.at === "string") out.feed[id] = { status: v.status, at: v.at, ...(typeof v.until === "string" ? { until: v.until } : {}), ...(typeof v.amount === "number" && Number.isFinite(v.amount) ? { amount: v.amount } : {}) };
    }
  }
  if (a.bank && typeof a.bank === "object") out.bank = { disconnected: a.bank.disconnected === true, refreshedAt: typeof a.bank.refreshedAt === "string" ? a.bank.refreshedAt : undefined, ...(typeof a.bank.renewedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.bank.renewedOn) ? { renewedOn: a.bank.renewedOn } : {}) };
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
  // Corrections (spec 05) and check-in adjustments (spec 02): member rules rewrite categories and drop
  // bills that ended; paid bills drop out of the forecast, changed amounts and dates apply, one-offs go in.
  const corrected = applyRules(d, a.rules, a.billAdjust);
  return {
    ...corrected,
    consents,
    offers: { lender_matching_consent: matching, offers: d.offers.offers.filter((o) => !dismissed.has(o.id)) },
  };
}

/** Stable id for a predicted bill, for "already paid". */
export const billId = (b: { merchant: string; date: string }) => `${b.merchant}:${b.date}`;

/** "Now" in the mock world: the data date, mid-morning AEST. */
export const mockNow = (d: Pick<PersonaData, "asOf">) => `${d.asOf}T09:30:00+10:00`;
