// The single typed registry of analytics events (spec 09). Every event any spec names is defined here with
// its props; emitting anything else fails in development and is dropped in production. Client-safe.
//
// Prop types:
//   int    a count or position (non-negative integer)
//   bool   true / false
//   enum   one of a fixed list (so no free text can slip in)
//   amount money in cents, stored as a bucket ("20-50"), never the exact figure
//   ms     a duration in milliseconds, stored as a bucket
//   id     a short internal identifier (rule id, route, merchant of a subscription): letters, digits, _:/.-+&' and spaces, ≤ 64 chars
//   ids    a comma-separated list of ids

export type PropType = "int" | "bool" | "amount" | "ms" | "id" | "ids" | readonly string[];
type Spec = Record<string, PropType>;

const SECTIONS = ["today", "money", "score", "borrowing", "help"] as const;
const SOURCES = ["home", "push", "email", "inbox", "summary", "progress"] as const;

export const EVENTS = {
  // ---- system (spec 09: needed for the north-star metric, cohorts and guardrails) ----
  session_started: { entry: ["direct", "push", "email", "install"], payday: "bool" },
  page_viewed: { route: "id" },
  cycle_completed: { had_new_advance: "bool", ended_positive: "bool", cycle_index: "int" },
  member_signed_up: {},
  offer_viewed: { had_shortfall: "bool", in_hardship: "bool", band: ["building", "steadying", "healthy", "thriving", "none"] },
  experiment_exposed: { experiment: "id", variant: "id" },
  analytics_consent_changed: { granted: "bool" },

  // ---- 01 feed, navigation ----
  feed_viewed: { item_count: "int", rule_ids: "ids" },
  feed_item_actioned: { rule_id: "id", position: "int" },
  feed_item_done: { rule_id: "id", position: "int" },
  feed_item_snoozed: { rule_id: "id", duration: ["tomorrow", "payday"] },
  feed_item_dismissed: { rule_id: "id", reason: ["not_relevant", "dismissed"] },
  feed_see_all_opened: { item_count: "int" },
  nav_section_opened: { section: SECTIONS, had_badge: "bool" },

  // ---- 02 pay-cycle loop ----
  sts_viewed: { value_cents: "amount", days_left: "int", nothing_spare: "bool" },
  sts_breakdown_opened: {},
  checkin_triggered: {},
  checkin_opened: { source: SOURCES },
  checkin_completed: {},
  checkin_adjusted: { type: ["bill_paid", "one_off", "buffer"] },
  recap_generated: {},
  recap_opened: { source: SOURCES },
  recap_shared: {},

  // ---- 03 billing ----
  billing_date_aligned: {},
  billing_deferred: { reason: ["shortfall", "below_buffer", "payday_moved"] },
  billing_preference_changed: { mode: ["after_payday", "fixed_date"] },
  pause_offered: { source: ["feed", "hardship", "account"] },
  pause_taken: {},
  downgrade_taken: {},

  // ---- 04 onboarding ----
  onboarding_step_viewed: { step: ["welcome", "create_account", "consents", "connect_bank", "analysing", "aha", "score_reveal", "goal", "notifications"] },
  bank_connected: { duration_ms: "ms" },
  aha_shown: { type: ["shortfall", "subscriptions", "advance_fees", "positive"] },
  aha_actioned: { type: ["shortfall", "subscriptions", "advance_fees", "positive"] },
  goal_selected: { goal_type: ["reach_payday", "off_advances", "lift_score", "cut_bills", "build_buffer", "gambling_less"] },
  push_opt_in: { accepted: "bool" },

  // ---- 05 data trust ----
  correction_made: { entity_type: ["transaction", "bill", "subscription", "loan", "income"], correction_type: "id" },
  forecast_error_prompt_shown: {},
  forecast_error_prompt_answered: { answer: "id" },
  connection_status_changed: { from: ["healthy", "stale", "broken", "expiring"], to: ["healthy", "stale", "broken", "expiring"] },
  reconnect_started: {},
  reconnect_completed: { duration_ms: "ms" },
  add_account_prompt_shown: {},
  account_added: {},

  // ---- 06 action tools ----
  hardship_letter_started: {},
  hardship_letter_completed: { output: ["copy", "email", "pdf"] },
  hardship_followup_answered: { outcome: ["agreed", "declined", "not_yet"] },
  cancel_guide_opened: { merchant: "id" },
  cancel_marked: { merchant: "id" },
  cancel_confirmed: { merchant: "id", monthly_cents: "amount" },
  cancel_failed_detected: {},
  bill_switch_prompt_shown: { category: ["telco", "internet", "energy"] },
  bill_switch_link_opened: {},
  bill_switch_reported: { monthly_saving_cents: "amount" },
  entitlements_started: {},
  entitlements_completed: {},
  entitlement_link_opened: { program: "id" },

  // ---- 07 progression ----
  plan_started: { plan_type: "id" },
  plan_step_completed: { plan_type: "id", step: "int" },
  plan_completed: { plan_type: "id" },
  plan_switched: { plan_type: "id" },
  streak_milestone: { type: ["no_advance", "no_failed_payment", "money_left", "under_sts"], length: "int" },
  buffer_set: { target_cents: "amount" },
  goal_created: { target_cents: "amount", cycles: "int" },
  goal_reached: {},
  band_reached: { band: ["building", "steadying", "healthy", "thriving"] },
  whats_next_viewed: {},

  // ---- 08 assistant ----
  assistant_opened: { entry: ["home", "contextual"] },
  assistant_question: { intent: "id" },
  assistant_answer_rated: { helpful: "bool" },
  assistant_escalated: { type: ["distress", "credit", "gambling"] },
  assistant_link_followed: { route: "id" },

  // ---- 10 platform and notifications ----
  pwa_install_prompted: {},
  pwa_installed: {},
  push_permission: { granted: "bool" },
  notification_sent: { type: "id", channel: ["push", "email", "inbox"] },
  notification_opened: { type: "id" },
  notification_actioned: { type: "id" },
  notification_suppressed: { reason: ["cap", "quiet_hours", "dedupe", "blocked", "paused", "privacy"] },
  notification_prefs_changed: { setting: ["cap", "digest", "quiet_hours", "privacy", "channel"] },
} as const satisfies Record<string, Spec>;

export type EventName = keyof typeof EVENTS;

type PropValue<T> = T extends "int" | "amount" | "ms" ? number : T extends "bool" ? boolean : T extends "id" | "ids" ? string : T extends readonly (infer U)[] ? U : never;
export type EventProps<E extends EventName> = { -readonly [K in keyof (typeof EVENTS)[E]]: PropValue<(typeof EVENTS)[E][K]> };

export const isEventName = (e: string): e is EventName => Object.prototype.hasOwnProperty.call(EVENTS, e);

/** Money buckets (cents in, a label out), so exact amounts never reach analytics. */
const AMOUNT_EDGES = [0, 1, 2000, 5000, 10000, 25000, 50000, 100000, 250000];
export function bucketAmount(cents: number): string {
  if (cents <= 0) return "0";
  for (let i = AMOUNT_EDGES.length - 1; i >= 0; i--) if (cents >= AMOUNT_EDGES[i]!) {
    const lo = AMOUNT_EDGES[i]! / 100, hi = AMOUNT_EDGES[i + 1];
    return hi === undefined ? `${lo}+` : `${lo}-${hi / 100}`;
  }
  return "0";
}
const MS_EDGES = [0, 1000, 5000, 15000, 30000, 60000, 120000];
export function bucketMs(ms: number): string {
  for (let i = MS_EDGES.length - 1; i >= 0; i--) if (ms >= MS_EDGES[i]!) {
    const hi = MS_EDGES[i + 1];
    return hi === undefined ? `${MS_EDGES[i]! / 1000}s+` : `${MS_EDGES[i]! / 1000}-${hi / 1000}s`;
  }
  return "0-1s";
}

const ID = /^[a-z0-9_:/.\- +&']{1,64}$/i;
/** Words that must never reach analytics, even as an id (spec 09: no sensitive values in props). */
const SENSITIVE = /gambl|\bbet(s|ting)?\b|casino|sportsbet|\btab\b|ladbrokes|pointsbet|alcohol|liquor|bottle ?shop|dan murphy/i;

export class AnalyticsError extends Error {}

/** Check props against the registry and convert amounts and durations to buckets. Throws on anything else. */
export function cleanProps<E extends EventName>(event: E, props: Record<string, unknown>): Record<string, string | number | boolean> {
  const spec = EVENTS[event] as Spec;
  const out: Record<string, string | number | boolean> = {};
  for (const key of Object.keys(props)) if (!(key in spec)) throw new AnalyticsError(`${event}: unknown prop "${key}"`);
  for (const [key, type] of Object.entries(spec)) {
    const v = props[key];
    if (v === undefined) throw new AnalyticsError(`${event}: missing prop "${key}"`);
    if (Array.isArray(type)) {
      if (!type.includes(v as string)) throw new AnalyticsError(`${event}.${key}: "${String(v)}" isn't one of ${type.join(", ")}`);
      out[key] = v as string;
    } else if (type === "int") {
      if (!Number.isInteger(v) || (v as number) < 0) throw new AnalyticsError(`${event}.${key}: expected a non-negative integer`);
      out[key] = v as number;
    } else if (type === "bool") {
      if (typeof v !== "boolean") throw new AnalyticsError(`${event}.${key}: expected true or false`);
      out[key] = v;
    } else if (type === "amount" || type === "ms") {
      if (typeof v !== "number" || !Number.isFinite(v)) throw new AnalyticsError(`${event}.${key}: expected a number`);
      out[key] = type === "amount" ? bucketAmount(Math.round(v)) : bucketMs(v);
    } else {
      const parts = type === "ids" ? String(v).split(",").filter(Boolean) : [String(v)];
      for (const p of parts) {
        if (!ID.test(p)) throw new AnalyticsError(`${event}.${key}: "${p}" isn't a short identifier`);
        if (SENSITIVE.test(p)) throw new AnalyticsError(`${event}.${key}: sensitive value`);
      }
      out[key] = parts.join(",");
    }
  }
  return out;
}

/** The envelope stored with every event (spec 09). */
export interface AnalyticsEvent {
  event: EventName;
  member_id: string;
  session_id: string;
  ts: string;
  props: Record<string, string | number | boolean>;
  app_version: string;
  platform: "web" | "pwa" | "ios" | "android";
  flags: string[];
}
