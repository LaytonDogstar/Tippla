// Phase 4 review fixes: each test reproduces a bug found in the loop code review.
import { describe, expect, it } from "vitest";
import type { PersonaData, Transaction } from "@/lib/api/types";
import { allFeedItems } from "@/lib/feed";
import { detectSubscriptions, subscriptions, valueTally } from "@/lib/selectors";
import { load, loadBillDue, loadPayday } from "./helpers";

const tx = (x: Partial<Transaction>): Transaction => ({
  id: `t_${Math.random().toString(36).slice(2)}`, date: "2026-09-01", description: "TEST", merchant: "Test", amount: -10, category: "subscriptions",
  subcategory: null, is_recurring: false, status: "posted", account_id: 1, balance_after: null, ...x,
});
const withTx = (d: PersonaData, extra: Transaction[]): PersonaData => ({ ...d, transactions: [...d.transactions, ...extra] });

describe("review fixes", async () => {
  const [jess, jessP, jessB] = await Promise.all([load("jess"), loadPayday("jess"), loadBillDue("jess")]);

  it("price rise fires once, on the first charge at the new price, not every month after", () => {
    const rise = allFeedItems({ d: jess, edits: {} }).filter((i) => i.type === "price_rise");
    expect(rise.map((i) => i.title)).toEqual([expect.stringContaining("Netflix")]);
    // Another charge at the same new price a month later: no new card.
    const netflix = detectSubscriptions(jess).find((s) => s.merchant === "Netflix")!;
    const later = { ...withTx(jess, [tx({ merchant: "Netflix", amount: -netflix.amount, date: "2026-10-03" })]), asOf: "2026-10-05" };
    expect(allFeedItems({ d: later, edits: {} }).filter((i) => i.type === "price_rise")).toEqual([]);
  });

  it("a repayment bigger than the balance gets one card, not two (Jess 29/09)", () => {
    const items = allFeedItems({ d: jessB, edits: {} }).filter((i) => i.title.startsWith("Beforepay"));
    expect(items.map((i) => i.type)).toEqual(["bill_over_balance"]);
  });

  it("a score change with no factor detail still has a readable body", () => {
    const flat = { ...jess, scoreHistory: jess.scoreHistory.map((h, i, all) => (i === all.length - 1 ? { ...h, breakdown: all[i - 1]!.breakdown } : h)) };
    const card = allFeedItems({ d: flat, edits: {} }).find((i) => i.type === "score_change")!;
    expect(card.body).toBe("Small changes across a few factors added up. Your SmartScore page has the details.");
  });

  it("subscriptions: an old one-off or a weekly charge isn't a monthly subscription; recategorising one out removes it", () => {
    const d = withTx(jess, [
      tx({ merchant: "App Store", amount: -4.99, date: "2026-05-02" }),
      ...[0, 7, 14, 21].map((n) => tx({ merchant: "Weekly Box", amount: -12, date: `2026-09-${String(1 + n).padStart(2, "0")}` })),
    ]);
    const names = detectSubscriptions(d).map((s) => s.merchant);
    expect(names).not.toContain("App Store");
    expect(names).not.toContain("Weekly Box");
    expect(names).toEqual(detectSubscriptions(jess).map((s) => s.merchant));
    const binge = jess.transactions.filter((t) => t.merchant === "Binge");
    const edits = Object.fromEntries(binge.map((t) => [t.id, "entertainment" as const]));
    expect(subscriptions(jess, edits).rows.map((r) => r.merchant)).not.toContain("Binge");
  });

  it("a subscription that charges again after 'I've cancelled it' is flagged, never pending forever", () => {
    const acts = { actions: [{ type: "cancelled_subscription" as const, key: "Binge", at: "2026-09-01T09:30:00+10:00" }] };
    const t = valueTally(jess, acts); // Binge charged on 08/09, after the 01/09 cancellation
    expect(t.pending).toEqual([]);
    expect(t.items).toEqual([]);
    expect(t.chargedAgain).toEqual([{ merchant: "Binge", date: "2026-09-08", amount: 18 }]);
    expect(valueTally(jessP, { actions: [{ type: "cancelled_subscription", key: "Binge", at: "2026-09-25T09:30:00+10:00" }] }).chargedAgain).toEqual([]);
  });
});
