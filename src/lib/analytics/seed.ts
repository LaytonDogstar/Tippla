// Demo analytics (spec 09: "dashboards with seeded or demo data"). A deterministic synthetic membership:
// 12 weekly signup groups, each member opening the app, seeing the feed, acting on cards and completing
// pay cycles, with fewer new pay advances the longer they stay. Seeded rows are flagged `seeded` and use
// synthetic member ids, so they can be cleared without touching real events.
// Server only (it imports the registry validator, which every seeded event passes through).
import { FLAG_NAMES, FLAGS } from "@/config/featureFlags";
import { cleanProps, type AnalyticsEvent, type EventName } from "./registry";

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RULES = ["shortfall", "bill_over_balance", "repayment_due", "new_subscription", "price_rise", "duplicate_charge", "unusual_spend", "score_change"];
const RULE_ACTION = [0.62, 0.55, 0.48, 0.35, 0.3, 0.42, 0.22, 0.4]; // how often a shown card is acted on
const SECTIONS = ["today", "money", "score", "borrowing", "help"] as const;
const AHA = ["shortfall", "shortfall", "subscriptions", "advance_fees", "positive"] as const;
const GOALS = ["reach_payday", "off_advances", "lift_score", "cut_bills", "build_buffer"] as const;
const DAY = 864e5;

export function seedEvents(opts: { now?: Date; members?: number; weeks?: number; seed?: number } = {}): AnalyticsEvent[] {
  const now = (opts.now ?? new Date()).getTime();
  const weeks = opts.weeks ?? 12;
  const n = opts.members ?? 360;
  const rand = mulberry32(opts.seed ?? 25092026);
  const onboardingRand = mulberry32((opts.seed ?? 25092026) + 4);
  const flags = FLAG_NAMES.filter((f) => FLAGS[f].built);
  const out: AnalyticsEvent[] = [];

  for (let m = 0; m < n; m++) {
    const member = `m_seed${String(m).padStart(4, "0")}`;
    const signup = now - Math.floor(rand() * weeks * 7) * DAY - Math.floor(rand() * 10) * 3600e3;
    const payOffset = Math.floor(rand() * 14); // which weekday of the fortnight pay lands
    // Engagement drops off for some members; the rest settle into a habit.
    const churnDay = rand() < 0.45 ? 5 + Math.floor(rand() * 70) : Infinity;
    const habit = 0.25 + rand() * 0.5; // chance of opening the app on an ordinary day
    let advanceRate = 0.35 + rand() * 0.45; // chance a pay cycle has a new pay advance; falls with tenure
    let session = 0;
    const emit = (event: EventName, ts: number, props: Record<string, unknown> = {}) => {
      out.push({ event, member_id: member, session_id: `${member}-s${session}`, ts: new Date(ts).toISOString(), props: cleanProps(event, props), app_version: "0.1.0", platform: rand() < 0.3 ? "pwa" : "web", flags });
    };

    emit("member_signed_up", signup);
    for (const step of ["welcome", "create_account", "consents", "connect_bank", "analysing"] as const) {
      if (step !== "welcome" && rand() < 0.04) break;
      emit("onboarding_step_viewed", signup + 60e3, { step });
    }
    emit("bank_connected", signup + 120e3, { duration_ms: 20_000 + rand() * 90_000 });
    // Spec 04: first insight within about a minute of the data loading, then the score, goal and alerts.
    // Its own random stream, so adding it left the rest of the demo data unchanged.
    const r4 = onboardingRand;
    const ahaAt = signup + 120e3 + (15 + r4() * 75) * 1e3;
    const aha = AHA[Math.floor(r4() * AHA.length)]!;
    emit("onboarding_step_viewed", ahaAt, { step: "aha" });
    emit("aha_shown", ahaAt, { type: aha });
    if (r4() < 0.45) emit("aha_actioned", ahaAt + 8e3, { type: aha });
    emit("onboarding_step_viewed", ahaAt + 20e3, { step: "score_reveal" });
    if (r4() < 0.82) {
      emit("onboarding_step_viewed", ahaAt + 30e3, { step: "goal" });
      emit("goal_selected", ahaAt + 45e3, { goal_type: GOALS[Math.floor(r4() * GOALS.length)]! });
      emit("onboarding_step_viewed", ahaAt + 50e3, { step: "notifications" });
      emit("push_opt_in", ahaAt + 55e3, { accepted: r4() < 0.6 });
    }

    for (let day = 0; signup + day * DAY < now && day < churnDay; day++) {
      const t = signup + day * DAY + (7 + rand() * 13) * 3600e3;
      if (t > now) break;
      const payday = (day + payOffset) % 14 === 0;
      // Cycle completes the day before payday.
      if ((day + payOffset) % 14 === 13 && day > 0) {
        emit("cycle_completed", t - 6 * 3600e3, { had_new_advance: rand() < advanceRate, ended_positive: rand() > advanceRate * 0.9, cycle_index: Math.floor(day / 14) });
        advanceRate = Math.max(0.05, advanceRate * (0.86 + rand() * 0.08));
      }
      if (rand() > (payday ? Math.min(0.95, habit + 0.4) : habit)) continue;
      session++;
      emit("session_started", t, { entry: payday && rand() < 0.5 ? "push" : "direct", payday });
      emit("page_viewed", t + 1e3, { route: "/" });
      // The feed: up to three cards from the rules that apply this time.
      const shown = RULES.filter(() => rand() < 0.35).slice(0, 3);
      emit("feed_viewed", t + 2e3, { item_count: shown.length, rule_ids: shown.join(",") });
      shown.forEach((rule, i) => {
        const p = RULE_ACTION[RULES.indexOf(rule)]! * (1 - i * 0.15);
        if (rand() < p) {
          emit("feed_item_actioned", t + 5e3, { rule_id: rule, position: i + 1 });
          if (rand() < 0.6) emit("feed_item_done", t + 60e3, { rule_id: rule, position: i + 1 });
        } else if (rand() < 0.15) emit("feed_item_dismissed", t + 8e3, { rule_id: rule, reason: rand() < 0.5 ? "not_relevant" : "dismissed" });
        else if (rand() < 0.1) emit("feed_item_snoozed", t + 8e3, { rule_id: rule, duration: rand() < 0.5 ? "tomorrow" : "payday" });
      });
      const perDay = rand() < 0.3 ? 0 : Math.floor(rand() * 9000);
      emit("sts_viewed", t + 3e3, { value_cents: perDay, days_left: 14 - ((day + payOffset) % 14), nothing_spare: perDay === 0 });
      if (rand() < 0.2) emit("sts_breakdown_opened", t + 9e3);
      if (payday) { emit("checkin_opened", t + 4e3, { source: rand() < 0.5 ? "push" : "home" }); emit("recap_opened", t + 20e3, { source: "home" }); }
      if (rand() < 0.5) {
        const section = SECTIONS[Math.floor(rand() * SECTIONS.length)]!;
        emit("nav_section_opened", t + 30e3, { section, had_badge: rand() < 0.5 });
      }
      // Offers: only ever to members who weren't short and weren't in hardship (the guardrail holds).
      if (rand() < 0.03) emit("offer_viewed", t + 40e3, { had_shortfall: false, in_hardship: false, band: rand() < 0.5 ? "healthy" : "thriving" });
      if (rand() < 0.02) emit("hardship_letter_started", t + 50e3);
    }
  }
  return out.sort((a, b) => a.ts.localeCompare(b.ts));
}
