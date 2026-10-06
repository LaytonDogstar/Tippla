// Spec 06: hardship letter (pre-fill, assembly, PDF, follow-up), cancellation helper (iCloud confirmed,
// charged again), bill comparison candidates, entitlements pointers (official sources only), directories.
import { describe, expect, it } from "vitest";
import { buildLetter, mailtoFor } from "@/lib/hardship/letter";
import { hardshipPrefill } from "@/lib/hardship/prefill";
import { letterPdf } from "@/lib/hardship/pdf";
import { pointers } from "@/lib/entitlements/pointers";
import { isOfficial, needsVerifying, PROGRAMS, STATE_CONCESSIONS } from "@/data/directories";
import { billSwitchCandidates, valueTally } from "@/lib/selectors";
import { allFeedItems } from "@/lib/feed";
import { load, loadPayday } from "./helpers";

describe("hardship letter", async () => {
  const jess = await load("jess");

  it("acceptance: pre-filled to Beforepay with $315 due 30/09", () => {
    expect(hardshipPrefill(jess)[0]).toEqual({ lender: "Beforepay", amount: 315, date: "2026-09-30", contact: { email: null, phone: null, url: null } });
    const letter = buildLetter({ lender: "Beforepay", amount: "$315", due: "Wed 30/09", name: "Jess Taylor", reason: "reduced_hours", duration: "months", afford: "$100" });
    expect(letter).toBe([
      "Hi Beforepay,",
      "I'm having trouble keeping up with my repayments, including the $315 due on Wed 30/09. I'd like to ask for a hardship arrangement.",
      "My working hours have been cut. I expect this to last a few months. I could afford to pay about $100 a fortnight for now.",
      "Could you let me know what options are available and what information you need from me?",
      "Thank you,\nJess Taylor",
    ].join("\n\n"));
  });

  it("every question is optional; email opens a draft (never sent by Tippla)", () => {
    expect(buildLetter({ lender: "Nimble", amount: "$96", due: "Sat 03/10", name: "Jess Taylor" }).split("\n\n")).toHaveLength(4);
    expect(mailtoFor(null, "Hardship request", "Hi & bye")).toBe("mailto:?subject=Hardship%20request&body=Hi%20%26%20bye");
  });

  it("downloads as a real PDF, wrapped across pages", () => {
    const pdf = Buffer.from(letterPdf(`Hi Beforepay,\n\n${"A long line of text that wraps. ".repeat(200)}`)).toString("latin1");
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(pdf).toContain("(Hi Beforepay,) Tj");
    expect(Number(/\/Count (\d+)/.exec(pdf)![1])).toBeGreaterThan(1);
  });

  it("follow-up next pay cycle until answered", async () => {
    const jessP = await loadPayday("jess");
    const letters = [{ lender: "Beforepay", at: "2026-09-25", output: "copy" as const }];
    const ofType = (account: object) => allFeedItems({ d: jessP, edits: {}, account }).filter((i) => i.type === "hardship_followup");
    expect(ofType({ hardshipLetters: letters }).map((i) => i.title)).toEqual(["Did you hear back from Beforepay?"]);
    expect(ofType({ hardshipLetters: letters }).map((i) => i.action.href)).toEqual(["/hardship?followup=Beforepay"]);
    expect(allFeedItems({ d: jess, edits: {}, account: { hardshipLetters: letters } }).some((i) => i.type === "hardship_followup")).toBe(false); // same cycle
    expect(ofType({ hardshipLetters: [{ ...letters[0], outcome: "agreed", answeredAt: "2026-10-01" }] })).toEqual([]);
    expect(ofType({ hardshipLetters: [{ ...letters[0], outcome: "not_yet", answeredAt: "2026-10-01" }] })).toEqual([]);
  });
});

describe("cancellation helper", async () => {
  const jess = await load("jess");
  const cancelled = (merchant: string, at: string) => ({ actions: [{ type: "cancelled_subscription" as const, key: merchant, at }] });

  it("acceptance: iCloud marked cancelled, no charge on 20/10 → $4.49 a month counted (after the 3-day grace, Q21)", () => {
    expect(valueTally({ ...jess, asOf: "2026-10-20" }, cancelled("Apple iCloud", "2026-09-25T09:30:00+10:00")).pending).toEqual([{ kind: "subscription", key: "sub:Apple iCloud", confirmAfter: "2026-10-23" }]);
    const later = { ...jess, asOf: "2026-10-24" };
    const t = valueTally(later, cancelled("Apple iCloud", "2026-09-25T09:30:00+10:00"));
    expect(t.items).toEqual([expect.objectContaining({ kind: "subscription", amount: 4.49, label: expect.objectContaining({ merchant: "Apple iCloud", count: 1 }) })]);
    expect(valueTally(jess, cancelled("Apple iCloud", "2026-09-25T09:30:00+10:00")).items).toEqual([]); // not yet
  });

  it("charged again after cancelling: a feed card says the cancellation may not have gone through", () => {
    const sub = jess.transactions.filter((t) => t.merchant === "Netflix" && t.amount < 0).at(-1)!;
    const items = allFeedItems({ d: jess, edits: {}, account: cancelled("Netflix", "2026-09-01T09:30:00+10:00") }).filter((i) => i.type === "cancel_failed");
    expect(sub.date > "2026-09-01").toBe(true);
    expect(items.map((i) => i.title)).toEqual(["Netflix charged again: the cancellation may not have gone through"]);
  });
});

describe("bill comparison and entitlements", async () => {
  const [jess, marcus, priya] = await Promise.all([load("jess"), load("marcus"), load("priya")]);

  it("finds telco and energy bills; switches are self-reported and never in the tally total", () => {
    expect(billSwitchCandidates(jess)).toEqual([{ merchant: "Origin Energy", category: "energy", monthly: 82.42 }, { merchant: "Telstra", category: "telco", monthly: 52 }]);
    const t = valueTally(jess, { billSwitches: [{ merchant: "Telstra", monthly: 15, at: "2026-09-25" }] });
    expect([t.total, t.reported]).toEqual([0, [{ merchant: "Telstra", monthly: 15, at: "2026-09-25" }]]);
  });

  it("acceptance: the entitlements check links only to official sources", () => {
    for (const p of Object.values(PROGRAMS)) expect(isOfficial(p.url), p.url).toBe(true);
    for (const u of Object.values(STATE_CONCESSIONS)) expect(isOfficial(u), u).toBe(true);
    for (const state of ["NSW", "VIC", "QLD"]) for (const pay of [true, false]) {
      const list = pointers({ rent: "yes", work: "part", card: "no" }, { state, hasEnergyBill: true, usesPayAdvances: pay });
      expect(list.every((p) => isOfficial(p.url))).toBe(true);
    }
    expect(isOfficial("https://www.example.com/nils")).toBe(false);
    expect(isOfficial("http://www.servicesaustralia.gov.au/")).toBe(false);
    expect(isOfficial("https://servicesaustralia.gov.au.evil.com/")).toBe(false);
  });

  it("pointers follow the answers; no-interest loans lead for members using pay advances", () => {
    const ids = (a: object, pay: boolean) => pointers(a, { state: "VIC", hasEnergyBill: false, usesPayAdvances: pay }).map((p) => p.id);
    expect(ids({}, false)).toEqual(["payment_finder", "state_concessions", "nils"]);
    expect(ids({ rent: "yes", work: "looking" }, true)).toEqual(["payment_finder", "nils", "rent_assistance", "concession_cards", "state_concessions"]);
    expect(pointers({}, { state: "VIC", hasEnergyBill: false, usesPayAdvances: false }).find((p) => p.id === "state_concessions")!.url).toBe("https://www.vic.gov.au/");
  });

  it("the check appears once in the feed for Building / Steadying or a shortfall, until done", () => {
    const has = (d: typeof jess, account = {}) => allFeedItems({ d, edits: {}, account }).some((i) => i.type === "entitlements_check");
    expect([has(jess), has(marcus), has(priya)]).toEqual([true, false, false]);
    expect(has(jess, { entitlements: { completedAt: "2026-09-25" } })).toBe(false);
  });

  it("directories flag entries never verified or older than 6 months", () => {
    expect(needsVerifying(null, "2026-10-06")).toBe(true);
    expect(needsVerifying("2026-03-01", "2026-10-06")).toBe(true);
    expect(needsVerifying("2026-05-01", "2026-10-06")).toBe(false);
    expect(needsVerifying("2026-01-10", "2026-03-06")).toBe(false);
    expect(needsVerifying("2025-08-01", "2026-03-06")).toBe(true);
  });
});
