// Spec 09: the typed event registry, privacy rules, consent, envelope, flags and experiment assignment.
import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { activeFlags, assignVariant, EXPERIMENTS, FLAG_NAMES, FLAGS, flagOn, hash32 } from "@/config/featureFlags";
import { bucketAmount, bucketMs, cleanProps, EVENTS, isEventName } from "@/lib/analytics/registry";
import { buildEvents, memberIdFor, record, store } from "@/lib/analytics/server";
import { resetDbForTests, type Db } from "@/lib/db";

const PACK = path.resolve(__dirname, "../docs/retention-pack/specs");
const specText = fs.readdirSync(PACK).filter((f) => /^(0[1-8]|10)-/.test(f)).map((f) => fs.readFileSync(path.join(PACK, f), "utf8")).join("\n");

describe("registry", () => {
  it("defines every event named in specs 01–08 and 10", () => {
    // Events appear in the specs as `name {props}` or `name` inside the "Events" sections.
    const named = new Set([...specText.matchAll(/`([a-z]+(?:_[a-z0-9]+)+)(?: \{[^`]*\})?`/g)].map((m) => m[1]!));
    const notEvents = new Set([...FLAG_NAMES, ...[...named].filter((n) => /^(member_|score_snapshots|value_events|billing_events|notification_prefs|push_subscriptions|lender_directory|merchant_cancel_guides|savings_goals|bank_reconnect|bill_exceeds_balance|cycle_shortfall|repayment_due|new_subscription|subscription_price_rise|possible_duplicate|unusual_spend|score_changed|tippla_billing_relief|entitlements_check|get_|simulate_|billing_cycle_anchor)/.test(n))]);
    const missing = [...named].filter((n) => !notEvents.has(n) && !isEventName(n));
    expect(missing).toEqual([]);
  });

  it("rejects unregistered events, unknown or missing props, wrong types and free text", () => {
    expect(() => buildEvents("jess", [{ event: "made_up_event" }])).toThrow(/Unregistered analytics event "made_up_event"/);
    expect(() => cleanProps("feed_item_actioned", { rule_id: "shortfall", position: 1, extra: 1 })).toThrow(/unknown prop "extra"/);
    expect(() => cleanProps("feed_item_actioned", { rule_id: "shortfall" })).toThrow(/missing prop "position"/);
    expect(() => cleanProps("feed_item_actioned", { rule_id: "shortfall", position: -1 })).toThrow(/non-negative integer/);
    expect(() => cleanProps("nav_section_opened", { section: "offers", had_badge: true })).toThrow(/isn't one of/);
    expect(() => cleanProps("assistant_question", { intent: "can I afford $80 on Saturday?" })).toThrow(/short identifier/);
  });

  it("never lets gambling or alcohol reach analytics, even as an id", () => {
    for (const m of ["Sportsbet", "TAB", "Ladbrokes", "Dan Murphy's", "BWS Liquor"]) {
      expect(() => cleanProps("cancel_guide_opened", { merchant: m })).toThrow();
    }
    expect(cleanProps("cancel_guide_opened", { merchant: "Apple iCloud" })).toEqual({ merchant: "Apple iCloud" });
    expect(cleanProps("page_viewed", { route: "/notifications/summary" })).toEqual({ route: "/notifications/summary" });
  });

  it("buckets amounts and durations, so exact figures are never stored", () => {
    expect(cleanProps("sts_viewed", { value_cents: 2400, days_left: 14, nothing_spare: false })).toEqual({ value_cents: "20-50", days_left: 14, nothing_spare: false });
    expect([bucketAmount(0), bucketAmount(1), bucketAmount(5300), bucketAmount(31500), bucketAmount(9_999_999)]).toEqual(["0", "0.01-20", "50-100", "250-500", "2500+"]);
    expect([bucketMs(400), bucketMs(42_000), bucketMs(500_000)]).toEqual(["0-1s", "30-60s", "120s+"]);
  });

  it("every registered prop type is one the validator understands", () => {
    for (const [e, spec] of Object.entries(EVENTS)) for (const [k, t] of Object.entries(spec)) {
      expect(Array.isArray(t) || ["int", "bool", "amount", "ms", "id", "ids"].includes(t as string), `${e}.${k}`).toBe(true);
    }
  });
});

describe("envelope, consent and storage", () => {
  let d: Db;
  beforeAll(async () => { d = await resetDbForTests(); });

  it("builds the spec 09 envelope with a pseudonymous member id and the member's flags", () => {
    const [e] = buildEvents("jess", [{ event: "feed_viewed", props: { item_count: 3, rule_ids: "shortfall,bill_over_balance" }, session_id: "abcdef12-3456", platform: "pwa" }], { now: new Date("2026-09-25T00:00:00Z") });
    expect(e).toMatchObject({ event: "feed_viewed", session_id: "abcdef12-3456", platform: "pwa", ts: "2026-09-25T00:00:00.000Z", app_version: "0.1.0" });
    expect(e!.member_id).toMatch(/^m_[0-9a-f]{16}$/);
    expect(e!.member_id).not.toContain("jess");
    expect(e!.member_id).toBe(memberIdFor("jess"));
    expect(e!.flags).toContain("feed_v1");
    expect(e!.flags).not.toContain("assistant_v1"); // not built yet
  });

  it("stores nothing without consent, and stores validated events with it", async () => {
    expect(await record("jess", [{ event: "sts_breakdown_opened" }], { consent: false })).toBe(0);
    expect(await record("jess", [{ event: "sts_breakdown_opened" }, { event: "feed_see_all_opened", props: { item_count: 7 } }], { consent: true })).toBe(2);
    const rows = (await d.query<{ event: string; props: Record<string, unknown> }>("SELECT event, props FROM analytics_events ORDER BY id")).rows;
    expect(rows).toEqual([{ event: "sts_breakdown_opened", props: {} }, { event: "feed_see_all_opened", props: { item_count: 7 } }]);
  });

  it("rejects a timestamp more than a week away and uses the server time instead", () => {
    const now = new Date("2026-09-25T00:00:00Z");
    const [e] = buildEvents("jess", [{ event: "sts_breakdown_opened", ts: "2020-01-01T00:00:00Z" }], { now });
    expect(e!.ts).toBe(now.toISOString());
  });

  it("stores in batches", async () => {
    const many = buildEvents("marcus", Array.from({ length: 30 }, () => ({ event: "page_viewed", props: { route: "/" } })));
    expect(await store(many)).toBe(30);
  });
});

describe("feature flags and experiments", () => {
  it("every flag named in the specs exists", () => {
    const named = new Set([...specText.matchAll(/`([a-z_]+_v[0-9])`/g)].map((m) => m[1]!));
    expect([...named].filter((f) => !(f in FLAGS))).toEqual([]);
  });

  it("demo personas get every built flag; real members never get a gated flag without sign-off", () => {
    expect(activeFlags("jess")).toEqual(FLAG_NAMES.filter((f) => FLAGS[f].built));
    expect(flagOn("value_tally_v1", "jess")).toBe(true);
    expect(flagOn("value_tally_v1", "member-123")).toBe(false); // gated (G5), no sign-off yet
    expect(flagOn("feed_v1", "member-123")).toBe(true);
    expect(flagOn("assistant_v1", "jess")).toBe(false); // not built
    expect(flagOn("feed_v1", "jess", { off: ["feed_v1"] })).toBe(false);
  });

  it("assignment is stable per member and roughly even; draft experiments assign no one", () => {
    expect(assignVariant("feed_card_count", "m_1")).toBeNull();
    const e = EXPERIMENTS[0]!;
    const prev = e.status;
    e.status = "running";
    try {
      const a = Array.from({ length: 2000 }, (_, i) => assignVariant(e.id, `m_${i}`));
      expect(assignVariant(e.id, "m_42")).toBe(a[42]);
      const share = a.filter((v) => v === e.variants[0]).length / a.length;
      expect(share).toBeGreaterThan(0.45);
      expect(share).toBeLessThan(0.55);
    } finally { e.status = prev; }
    expect(hash32("abc")).toBe(hash32("abc"));
  });
});
