// Spec 11 always-on product rules, enforced in code and tested together here (run in CI):
//  1. Offers never appear in the feed, notifications, check-ins, recaps or assistant suggestions.
//  2. Offers are never shown to members short before payday, engaged with hardship this pay cycle, or in Building.
//  3. The hardship pathway is always one tap away when a shortfall is forecast.
//  4. No sensitive categories in notification text or email subjects.
// Every persona, every snapshot (main, payday, bill due) and the data dev states.
import { describe, expect, it } from "vitest";
import type { PersonaData } from "@/lib/api/types";
import { applyDevStates } from "@/lib/dev/states";
import { IN_HERO, feed } from "@/lib/feed";
import { cycleRecap, notificationEvents, offerPause, paydayCheckIn, payCycleSummary, toCandidate, visibleOffers, weeklySummary } from "@/lib/selectors";
import { decide, DEFAULT_PREFS, GENERIC } from "@/lib/notify/policy";
import { emailCopy } from "@/content/notify";
import { suggestedQuestions } from "@/lib/assistant/suggestions";
import { TOOL_DEFS } from "@/lib/assistant/tools";
import { answerScripted } from "@/lib/assistant/scripted";
import { EVAL_SET } from "@/lib/assistant/evalSet";
import { load, loadBillDue, loadPayday } from "./helpers";

const OFFER = /\boffers?\b|pre-?approved|lender (can|could|wants)|you (qualify|could borrow)/i;
const SENSITIVE = /gambl|\bbet(s|ting)?\b|casino|pokies|sportsbet|alcohol|liquor|bottle ?shop|counsell|insolven|public trustee|dependants?/i;

async function everyData(): Promise<PersonaData[]> {
  const base = await Promise.all([load("jess"), load("marcus"), load("priya"), loadPayday("jess"), loadPayday("marcus"), loadPayday("priya"), loadBillDue("jess")]);
  const states = [["one_off"], ["two_accounts"], ["consent_expiring"], ["improved"]] as const;
  return [...base, ...base.slice(0, 3).flatMap((d) => states.map((s) => applyDevStates(d, [...s])))];
}

describe("rule 1: offers never in the feed, notifications, check-ins, recaps or assistant suggestions", async () => {
  const all = await everyData();

  it("feed", () => {
    for (const d of all) for (const i of feed({ d, edits: {}, account: {} }, {}).open) {
      expect(`${i.title} ${i.body} ${i.action.label}`, `${d.id} ${i.id}`).not.toMatch(OFFER);
      expect(i.action.href.startsWith("/offers"), `${d.id} ${i.id}`).toBe(false);
    }
  });

  it("notifications (and the policy blocks one even if something tried)", () => {
    for (const d of all) for (const e of notificationEvents(d, {})) {
      expect(`${e.title} ${e.body}`, `${d.id} ${e.type}`).not.toMatch(OFFER);
      expect(e.href.startsWith("/offers")).toBe(false);
    }
    const [r] = decide([{ key: "offer:1", category: "money", priority: "high", title: "You have a new offer", body: "x", href: "/offers", at: "2026-09-25T00:30:00.000Z" }], DEFAULT_PREFS, [], "2026-09-25T00:30:00.000Z");
    expect(r!.outcome).toBe("blocked");
  });

  it("payday check-ins and recaps", () => {
    for (const d of all) {
      expect(JSON.stringify(paydayCheckIn(d) ?? {}), d.id).not.toMatch(OFFER);
      expect(JSON.stringify(cycleRecap(d) ?? {}), d.id).not.toMatch(OFFER);
    }
  });

  it("assistant: no offers tool, no offer suggestions, no offers in any answer", async () => {
    expect(TOOL_DEFS.map((t) => t.name).join(" ")).not.toMatch(/offer|match/);
    for (const d of all.slice(0, 7)) {
      for (const q of suggestedQuestions(feed({ d, edits: {}, account: {} }, {}).open, 10)) expect(q).not.toMatch(OFFER);
      for (const c of EVAL_SET) {
        const r = answerScripted(c.q, { d, a: {} });
        expect([r.text, ...r.points].join(" "), `${d.id}: ${c.q}`).not.toMatch(OFFER);
        expect(r.links.some((l) => l.href.startsWith("/offers")), `${d.id}: ${c.q}`).toBe(false);
      }
    }
  });
});

describe("rule 2: offers never shown to members short, in hardship this cycle, or in Building", async () => {
  const [jess, marcus, priya] = await Promise.all([load("jess"), load("marcus"), load("priya")]);
  // Give everyone a matched offer and lender-matching consent, so only rule 2 can hide it.
  const withOffer = (d: PersonaData): PersonaData => ({
    ...d,
    offers: { lender_matching_consent: true, offers: marcus.offers.offers },
    consents: d.consents.map((c) => (c.id === "lender_matching" ? { ...c, granted: true, granted_at: "2026-03-28T19:42:10+11:00" } : c)),
  });

  it("short before payday (Jess) → paused", () => {
    expect(payCycleSummary(jess).isShort).toBe(true);
    expect(offerPause(withOffer(jess))).toBe("short");
    expect(visibleOffers(withOffer(jess))).toEqual([]);
  });

  it("hardship support this pay cycle (opened, self-selected or a letter) → paused; last cycle doesn't count", () => {
    const m = withOffer(marcus);
    expect(visibleOffers(m).length).toBeGreaterThan(0);
    expect(offerPause(m, { hardshipVisitedAt: "2026-09-24" })).toBe("hardship");
    expect(offerPause(m, { hardshipSelfSelected: true })).toBe("hardship");
    expect(offerPause(m, { hardshipLetters: [{ lender: "Latitude", at: "2026-09-25", output: "copy" }] })).toBe("hardship");
    expect(offerPause(m, { hardshipVisitedAt: "2026-09-01" })).toBeNull();
  });

  it("Building stage → paused; no score (Priya) isn't Building", () => {
    const building = withOffer({ ...marcus, score: { ...marcus.score!, score: 430 } });
    expect(offerPause(building)).toBe("building");
    expect(offerPause(withOffer(priya))).toBeNull();
  });

  it("every snapshot and dev state: any visible offer means none of the three conditions hold", async () => {
    for (const d of (await everyData()).map(withOffer)) {
      if (visibleOffers(d).length === 0) continue;
      expect(payCycleSummary(d).isShort, d.id).toBe(false);
      expect((d.score?.score ?? 999) >= 450, d.id).toBe(true);
    }
  });
});

describe("rule 3: hardship is one tap away when a shortfall is forecast", async () => {
  const all = await everyData();
  it("every forecast shortfall has a feed card with 'Options if money's tight' → /hardship", () => {
    let seen = 0;
    for (const d of all.filter((x) => payCycleSummary(x).isShort)) {
      seen++;
      const card = feed({ d, edits: {}, account: {} }, {}).open.find((i) => i.type === "shortfall");
      expect(card?.hardship?.href, d.id).toBe("/hardship");
      // Today shows it in the hero (with "Options if money's tight"), not again in Needs a look (09/10/2026).
      expect(IN_HERO).toContain("shortfall");
      expect(feed({ d, edits: {}, account: {} }, {}).shown.some((i) => i.type === "shortfall"), d.id).toBe(false);
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe("rule 4: no sensitive categories in notification text or email subjects", async () => {
  const all = await everyData();
  it("notification titles and bodies, as they'd appear on a lock screen when detailed", () => {
    for (const d of all) for (const e of notificationEvents(d, {})) expect(`${e.title} ${e.body}`, `${d.id} ${e.type}`).not.toMatch(SENSITIVE);
  });

  it("default lock-screen text is generic", () => {
    const d = all[0]!;
    const [first] = notificationEvents(d, {});
    const [r] = decide([{ ...toCandidate(first!), at: "2026-09-25T00:30:00.000Z" }], DEFAULT_PREFS, [], "2026-09-25T00:30:00.000Z");
    expect(r!.lockScreen).toEqual({ title: GENERIC.title, body: GENERIC.body });
  });

  it("email subjects and the weekly digest", () => {
    const subjects: string[] = [emailCopy.digest.subject, emailCopy.recap.subject, emailCopy.winBack.subject, emailCopy.consentExpiry.subject];
    for (const d of all) for (const e of notificationEvents(d, {})) subjects.push(emailCopy.notificationSubject(e.title));
    for (const s of subjects) expect(s).not.toMatch(SENSITIVE);
    for (const d of all) expect(JSON.stringify(weeklySummary(d, {}))).not.toMatch(SENSITIVE);
  });

  it("feed items about sensitive topics are marked so they're never pushed", () => {
    for (const d of all) for (const i of feed({ d, edits: {}, account: {} }, {}).open) {
      if (SENSITIVE.test(`${i.title} ${i.body}`)) expect(i.sensitive, `${d.id} ${i.id}`).toBe(true);
    }
  });
});
