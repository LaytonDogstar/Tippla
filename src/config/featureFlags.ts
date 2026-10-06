// Feature flags from the retention pack (docs/retention-pack/specs). Every new workstream ships behind its
// flag, on for the demo personas. `gate` marks flags that need compliance sign-off (spec 11) before they can
// be on in production: the production default stays off until a sign-off is recorded here.
// Client-safe: no server imports.

export type Gate = "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
export interface FlagDef { spec: string; description: string; gate?: Gate[]; built: boolean; signOff?: { by: string; date: string } }

export const FLAGS = {
  // 01 Attention feed and navigation
  feed_v1: { spec: "01", description: "Needs a look feed on Today", built: true },
  score_attribution_v1: { spec: "01", description: "Why the SmartScore moved", built: true },
  nav_v2: { spec: "01", description: "Five sections with badges", built: true },
  status_line_v1: { spec: "01", description: "What Tippla did, under the greeting", built: true },
  // 02 Pay-cycle loop
  safe_to_spend_v1: { spec: "02", description: "Safe to spend today", built: true },
  cycle_checkin_v1: { spec: "02", description: "Payday check-in", built: true },
  cycle_recap_v1: { spec: "02", description: "End-of-cycle recap", built: true },
  score_projection_v1: { spec: "02", description: "Score projection (estimate)", built: true },
  value_tally_v1: { spec: "02", description: "Tippla has helped you save", built: true, gate: ["G5"] },
  // 03 Billing
  payday_billing_v1: { spec: "03", description: "Tippla billing aligned to payday", built: true, gate: ["G7"] },
  // 04 Onboarding
  onboarding_v2: { spec: "04", description: "First insight and goal selection", built: false },
  goals_v1: { spec: "04", description: "Member goal drives plan, check-in and recap", built: false },
  // 05 Data trust
  corrections_v1: { spec: "05", description: "Member corrections to bills, subscriptions, loans, income", built: false, gate: ["G3"] },
  forecast_accuracy_v1: { spec: "05", description: "Forecast accuracy tracking", built: false },
  connection_health_v1: { spec: "05", description: "Bank connection health and re-consent", built: false },
  // 06 Action tools
  hardship_autofill_v1: { spec: "06", description: "Hardship letter pre-filled from data", built: false, gate: ["G6"] },
  cancel_helper_v1: { spec: "06", description: "Subscription cancellation helper", built: true },
  bill_switch_v1: { spec: "06", description: "Bill switching pointers", built: false, gate: ["G2", "G4"] },
  entitlements_v1: { spec: "06", description: "Entitlements check", built: false, gate: ["G3"] },
  // 07 Progression
  plans_v1: { spec: "07", description: "Multi-cycle plans", built: false, gate: ["G2"] },
  streaks_v1: { spec: "07", description: "Positive streaks", built: true },
  buffer_v1: { spec: "07", description: "Member-set buffer", built: false },
  savings_goals_v1: { spec: "07", description: "Named savings goals", built: false },
  credit_file_v1: { spec: "07", description: "Credit file tracking (prototype)", built: false, gate: ["G1", "G3", "G4"] },
  refinance_step_v1: { spec: "07", description: "Cheaper-credit check (prototype)", built: false, gate: ["G1", "G4"] },
  // 08 Assistant
  assistant_v1: { spec: "08", description: "Ask Tippla assistant", built: false, gate: ["G1", "G2", "G3", "G6"] },
  // 10 Platform
  pwa_v1: { spec: "10", description: "Installable app", built: false },
  push_v1: { spec: "10", description: "Push notifications", built: false, gate: ["G5"] },
  email_lifecycle_v1: { spec: "10", description: "Lifecycle email", built: false, gate: ["G5"] },
} satisfies Record<string, FlagDef>;

export type FlagName = keyof typeof FLAGS;
export const FLAG_NAMES = Object.keys(FLAGS) as FlagName[];

/** Demo personas are the demo and internal cohort: every built flag is on for them, gated or not. */
export const DEMO_MEMBERS = ["jess", "marcus", "priya"] as const;

/**
 * Demo personas get every built flag. Real members (none yet) get a gated flag only once every gate has a
 * recorded sign-off. `off` turns flags off everywhere (env FLAGS_OFF, comma-separated).
 */
export function flagOn(flag: FlagName, member: string, env: { off?: string[] } = {}): boolean {
  const f: FlagDef = FLAGS[flag];
  if (env.off?.includes(flag) || !f.built) return false;
  if ((DEMO_MEMBERS as readonly string[]).includes(member)) return true;
  return !f.gate?.length || !!f.signOff;
}

/** flagOn with the deployment's FLAGS_OFF applied (server; on the client FLAGS_OFF isn't visible). */
export const isOn = (flag: FlagName, member: string): boolean =>
  flagOn(flag, member, { off: (typeof process !== "undefined" ? process.env.FLAGS_OFF ?? "" : "").split(",").filter(Boolean) });

export const activeFlags = (member: string, env: { off?: string[] } = {}): FlagName[] =>
  FLAG_NAMES.filter((f) => flagOn(f, member, env));

// ---- Experiments (spec 09). Server-side assignment tied to the member; none running yet. ----
export interface Experiment { id: string; variants: string[]; primaryMetric: string; minCycles: number; status: "draft" | "running" | "stopped" }
export const EXPERIMENTS: Experiment[] = [
  { id: "feed_card_count", variants: ["3", "2"], primaryMetric: "feed_action_rate", minCycles: 2, status: "draft" },
  { id: "sts_placement", variants: ["top", "below_feed"], primaryMetric: "days_per_cycle_with_session", minCycles: 2, status: "draft" },
  { id: "payday_push_copy", variants: ["plan", "check_in"], primaryMetric: "notification_open_rate", minCycles: 2, status: "draft" },
  { id: "aha_priority", variants: ["shortfall_first", "subscriptions_first"], primaryMetric: "day30_retention", minCycles: 2, status: "draft" },
];

/** Stable 32-bit FNV-1a hash, so assignment is the same on every server and every visit. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** Variant for a member, or null when the experiment isn't running (then everyone gets variant 0's experience). */
export function assignVariant(experimentId: string, memberId: string): string | null {
  const e = EXPERIMENTS.find((x) => x.id === experimentId);
  if (!e || e.status !== "running") return null;
  return e.variants[hash32(`${experimentId}:${memberId}`) % e.variants.length]!;
}
