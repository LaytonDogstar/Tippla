// "Needs a look" rules engine and SmartScore change attribution.
import { describe, expect, it } from "vitest";
import type { PersonaData, Transaction } from "@/lib/api/types";
import { allFeedItems, feed, isOpen, rank, rankScore, RULES, type FeedItem } from "@/lib/feed";
import { addDays } from "@/lib/format/dates";
import { scoreAttribution, scoreChange } from "@/lib/selectors";
import { load } from "./helpers";

const ctx = (d: PersonaData) => ({ d, edits: {} });
const types = (items: FeedItem[]) => items.map((i) => i.type);
const withTx = (d: PersonaData, extra: Partial<Transaction>[]): PersonaData => ({
  ...d,
  transactions: [...d.transactions, ...extra.map((x, i) => ({
    id: `test_${i}`, date: d.asOf, description: "TEST", merchant: "Test", amount: -10, category: "shopping" as const, subcategory: null,
    is_recurring: false, status: "posted" as const, account_id: 1, balance_after: null, ...x,
  }))],
});

describe("feed rules", async () => {
  const [jess, marcus, priya] = await Promise.all([load("jess"), load("marcus"), load("priya")]);

  it("Jess: every rule that applies to her fires, with real figures", () => {
    const items = allFeedItems(ctx(jess));
    expect(new Set(types(items))).toEqual(new Set(["shortfall", "bill_over_balance", "unusual_spend", "duplicate_charge", "new_subscription", "price_rise", "score_change", "tippla_billing_relief"]));
    const by = Object.fromEntries(items.map((i) => [i.type, i]));
    expect(by.shortfall!.title).toBe("About $53 short before payday");
    expect(by.bill_over_balance!.title).toBe("Beforepay $315 on Wed 30/09 is more than your forecast balance");
    expect(by.bill_over_balance!.body).toContain("$262");
    expect(by.duplicate_charge!.title).toBe("Possible double charge: Amazon AU $10.73 twice on 24/09");
    expect(by.duplicate_charge!.transactionIds).toHaveLength(2);
    expect(by.new_subscription!.title).toBe("New subscription: Binge $18.00 a month");
    expect(by.price_rise!.title).toBe("Netflix went up to $18.99 (was $16.99)");
    expect(by.unusual_spend!.title).toMatch(/^Shopping is \$\d+ above your usual$/);
    expect(by.unusual_spend!.body).toContain("That includes $189 still pending.");
    expect(by.score_change!.title).toBe("Your SmartScore went down 17 points");
  });

  it("Jess's top three: the shortfall, the bill that won't fit, then the biggest dollar item", () => {
    const f = feed(ctx(jess));
    expect(types(f.top)).toEqual(["shortfall", "bill_over_balance", "unusual_spend"]);
    expect(f.top).toHaveLength(3);
    expect(Object.values(f.bySection).reduce((a, b) => a + b, 0)).toBe(f.open.length);
  });

  it("cards about money being tight always carry the hardship option", () => {
    for (const i of allFeedItems(ctx(jess)).filter((x) => x.type === "shortfall" || x.type === "bill_over_balance")) {
      expect(i.hardship).toEqual({ label: "Options if money's tight", href: "/hardship" });
    }
  });

  it("Priya: a repayment within 3 days; her only subscription isn't 'new' (thin file, we can't see earlier charges)", () => {
    const items = allFeedItems(ctx(priya));
    expect(types(items)).toEqual(["repayment_due"]);
    expect(items[0]!.title).toBe("Afterpay $28 comes out Mon 28/09");
  });

  it("Marcus: nothing urgent, just his score going up", () => {
    expect(types(allFeedItems(ctx(marcus)))).toEqual(["score_change"]);
  });

  it("offers never appear in the feed, for anyone, in any state", () => {
    for (const d of [jess, marcus, priya]) {
      for (const i of allFeedItems(ctx(d))) {
        expect(i.action.href).not.toMatch(/offers/);
        expect(`${i.title} ${i.body}`).not.toMatch(/offer|lender match|pre-approved/i);
      }
    }
  });

  it("gambling and alcohol never surface, even as a spike or a double charge", () => {
    const d = withTx(jess, [
      { category: "gambling", merchant: "Sportsbet", amount: -500, status: "pending" },
      { category: "gambling", merchant: "Sportsbet", amount: -50, date: addDays(jess.asOf, -1) },
      { category: "gambling", merchant: "Sportsbet", amount: -50, date: addDays(jess.asOf, -1) },
      { category: "alcohol", merchant: "BWS", amount: -400, status: "pending" },
    ]);
    for (const i of allFeedItems(ctx(d))) expect(`${i.id} ${i.title}`).not.toMatch(/gambling|alcohol|Sportsbet|BWS/i);
  });

  it("duplicate charge stays quiet for recurring payments and different amounts", () => {
    const day = addDays(jess.asOf, -2);
    const d = withTx(marcus, [
      { merchant: "Gym", amount: -20, date: day, is_recurring: true }, { merchant: "Gym", amount: -20, date: day, is_recurring: true },
      { merchant: "Cafe", amount: -5, date: day }, { merchant: "Cafe", amount: -5.5, date: day },
    ]);
    expect(types(RULES.duplicateCharge!(ctx(d)))).toEqual([]);
    const dup = withTx(marcus, [{ merchant: "Cafe", amount: -5, date: day }, { merchant: "Cafe", amount: -5, date: day }]);
    expect(types(RULES.duplicateCharge!(ctx(dup)))).toEqual(["duplicate_charge"]);
  });

  it("no shortfall card when the bills fit", () => {
    expect(RULES.shortfall!(ctx(marcus))).toEqual([]);
  });

  it("recategorising the duplicate to a transfer removes the card (customer edits are respected)", () => {
    const dup = allFeedItems(ctx(jess)).find((i) => i.type === "duplicate_charge")!;
    const edits = Object.fromEntries(dup.transactionIds!.map((id) => [id, "transfer" as const]));
    expect(types(allFeedItems({ d: jess, edits }))).not.toContain("duplicate_charge");
  });
});

describe("ranking and the customer's choices", async () => {
  const jess = await load("jess");
  const items = allFeedItems(ctx(jess));

  it("ranks by urgency × amount at stake", () => {
    const scores = rank(items).map(rankScore);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    const a = { ...items[0]!, id: "a", urgency: 5 as const, amountAtStake: 20 };
    const b = { ...items[0]!, id: "b", urgency: 2 as const, amountAtStake: 200 };
    expect(rank([b, a]).map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("done and dismissed items disappear; the next one moves up", () => {
    const first = feed(ctx(jess)).top[0]!;
    const after = feed(ctx(jess), { [first.id]: { status: "done", at: jess.asOf } });
    expect(after.top.map((i) => i.id)).not.toContain(first.id);
    expect(after.top).toHaveLength(3);
    const dismissed = feed(ctx(jess), { [first.id]: { status: "dismissed", at: jess.asOf } });
    expect(dismissed.open.map((i) => i.id)).not.toContain(first.id);
  });

  it("snoozed items come back on the snooze date", () => {
    const item = items[0]!;
    const state = { [item.id]: { status: "snoozed" as const, until: addDays(jess.asOf, 1), at: jess.asOf } };
    expect(isOpen(item, state, jess.asOf)).toBe(false);
    expect(isOpen({ ...item, expiresAt: null }, state, addDays(jess.asOf, 1))).toBe(true);
  });

  it("expired items are never shown", () => {
    expect(isOpen({ ...items[0]!, expiresAt: addDays(jess.asOf, -1) }, {}, jess.asOf)).toBe(false);
  });

  it("ids are stable across runs (so choices stick)", () => {
    expect(allFeedItems(ctx(jess)).map((i) => i.id)).toEqual(items.map((i) => i.id));
  });
});

describe("score change attribution", async () => {
  const [jess, marcus, priya] = await Promise.all([load("jess"), load("marcus"), load("priya")]);

  it("Jess: −17 split across the factors that moved, linked to the transactions behind them", () => {
    const a = scoreAttribution(jess)!;
    expect(a.delta).toBe(scoreChange(jess)!.delta);
    expect(a.parts.reduce((s, p) => s + p.points, 0)).toBe(-17);
    expect(a.summary).toBe("new pay advance −9, gambling deposits −6, money left over −2");
    const borrowing = a.parts.find((p) => p.factor === "LOAN_AMOUNT_AND_TYPE")!;
    expect(borrowing.reason).toBe("New Beforepay pay advance (24/09)");
    const adv = jess.transactions.find((t) => t.category === "wage_advance" && t.amount > 0 && t.date === "2026-09-24")!;
    expect(borrowing.transactionIds).toEqual([adv.id]);
    expect([borrowing.from, borrowing.to]).toEqual([3.4, 2.9]);
  });

  it("Marcus: +11, and the parts add up", () => {
    const a = scoreAttribution(marcus)!;
    expect(a.parts.reduce((s, p) => s + p.points, 0)).toBe(11);
    expect(a.parts.every((p) => p.points > 0)).toBe(true);
  });

  it("no attribution without two scored refreshes (Priya)", () => {
    expect(scoreAttribution(priya)).toBeNull();
  });

  it("the parts always reconcile to the real change, whatever the factors did", () => {
    const h = jess.scoreHistory;
    for (const delta of [-40, -1, 0, 1, 23]) {
      const d = { ...jess, scoreHistory: [...h.slice(0, -1), { ...h.at(-1)!, score: h.at(-2)!.score + delta }] };
      const a = scoreAttribution(d)!;
      expect(a.parts.reduce((s, p) => s + p.points, 0)).toBe(delta);
    }
  });

  it("Income sources (score-only) never gets its own line", () => {
    const h = jess.scoreHistory;
    const prev = { ...h.at(-2)!, breakdown: { ...h.at(-2)!.breakdown!, GOVERNMENT_RELIANCE: 8 } };
    const a = scoreAttribution({ ...jess, scoreHistory: [...h.slice(0, -2), prev, h.at(-1)!] })!;
    expect(a.parts.map((p) => p.name)).not.toContain("Income sources");
  });
});
