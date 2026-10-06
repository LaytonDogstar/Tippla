// Spec 09 dashboards: the queries behind the north star, cohorts, feed performance and guardrails, on the
// deterministic demo data.
import { beforeAll, describe, expect, it } from "vitest";
import { resetDbForTests } from "@/lib/db";
import { cohortRetention, feedPerformance, guardrails, northStar, reseed, seededCount } from "@/lib/analytics/metrics";
import { buildEvents, store } from "@/lib/analytics/server";
import { seedEvents } from "@/lib/analytics/seed";

const NOW = new Date("2026-10-06T00:00:00Z");

describe("dashboards on demo data", () => {
  beforeAll(async () => { await resetDbForTests(); await reseed(NOW); }, 120_000);

  it("demo data is deterministic, valid against the registry, and can be regenerated", async () => {
    const a = seedEvents({ now: NOW }), b = seedEvents({ now: NOW });
    expect(a.length).toBe(b.length);
    expect(a.slice(0, 50)).toEqual(b.slice(0, 50));
    const before = await seededCount();
    expect(await reseed(NOW)).toBe(before);
    expect(await seededCount()).toBe(before);
  }, 60_000);

  it("north star and supporting metrics are percentages that make sense", async () => {
    const ns = await northStar(NOW);
    expect(ns.weekly).toHaveLength(12);
    for (const w of ns.weekly) if (w.value !== null) expect(w.value).toBeGreaterThanOrEqual(0), expect(w.value).toBeLessThanOrEqual(100);
    expect(ns.latest).not.toBeNull();
    expect(ns.wau).toBeLessThanOrEqual(ns.mau);
    for (const v of [ns.stickiness, ns.paydayOpenRate, ns.feedActionRate, ns.positiveCycles]) expect(v).toBeGreaterThan(0);
    // Demo members take fewer advances the longer they stay, so the north star rises.
    expect(ns.change!).toBeGreaterThan(0);
  });

  it("cohorts show only completed weeks, and retention never exceeds 100%", async () => {
    const c = await cohortRetention(NOW);
    expect(c.length).toBeGreaterThan(8);
    for (const row of c) {
      const age = Math.floor((NOW.getTime() - Date.parse(row.cohort)) / 604800e3);
      expect(row.retained.length).toBeLessThanOrEqual(Math.max(0, age - 1));
      for (const v of row.retained) expect(v!).toBeLessThanOrEqual(100);
    }
  });

  it("feed funnel: shown ≥ acted on ≥ done, for every rule", async () => {
    const f = await feedPerformance(NOW);
    expect(f.map((r) => r.rule).sort()).toEqual(["bill_over_balance", "duplicate_charge", "new_subscription", "price_rise", "repayment_due", "score_change", "shortfall", "unusual_spend"]);
    for (const r of f) { expect(r.shown).toBeGreaterThanOrEqual(r.actioned); expect(r.actioned).toBeGreaterThanOrEqual(r.done); }
  });

  it("guardrail: offers shown to anyone short, in hardship or in Building reads 0, and catches a breach", async () => {
    expect((await guardrails(NOW)).offersToVulnerable).toBe(0);
    await store(buildEvents("jess", [{ event: "offer_viewed", props: { had_shortfall: true, in_hardship: false, band: "steadying" }, ts: "2026-10-05T00:00:00Z" }], { now: NOW }));
    expect((await guardrails(NOW)).offersToVulnerable).toBe(1);
  });
});
