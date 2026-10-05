// Phase 2 (loop): notifications are event-driven, capped per day, optionally digested weekly, and never
// about offers, lenders, gambling or alcohol.
import { describe, expect, it } from "vitest";
import { notifications, notificationEvents } from "@/lib/selectors";
import { parseAccount, serialiseAccount } from "@/lib/account/state";
import { load, loadBillDue, loadPayday } from "./helpers";

const ids = (list: { id: string }[]) => list.map((n) => n.id);

describe("notifications: events only", async () => {
  const [jess, jessP, jessB, marcus, marcusP, priya, priyaP] = await Promise.all([
    load("jess"), loadPayday("jess"), loadBillDue("jess"), load("marcus"), loadPayday("marcus"), load("priya"), loadPayday("priya"),
  ]);
  const everyone = [jess, jessP, jessB, marcus, marcusP, priya, priyaP];

  it("Jess 25/09: shortfall within 5 days (goes under Wed 30/09), plus score updates", () => {
    expect(ids(notifications(jess))).toEqual(["shortfall-2026-09-17", "score-2026-09-25", "score-2026-09-11", "score-2026-08-28"]);
    const s = notifications(jess)[0]!;
    expect(s.title).toBe("Heads up: about $53 short before payday");
    expect(s.body).toContain("Wed 30/09");
    expect(s.href).toBe("/hardship"); // hardship options one tap away when a shortfall is forecast
  });

  it("Jess 29/09: tomorrow's Beforepay $315 is bigger than her balance", () => {
    const n = notifications(jessB).find((x) => x.id === "bill-Beforepay-2026-09-30")!;
    expect(n.title).toBe("Beforepay $315 is due tomorrow");
    expect(n.body).toContain("overdrawn");
    expect(notifications(jessB).find((x) => x.type === "money" && x.id.startsWith("shortfall"))?.body).toContain("options if money's tight");
  });

  it("payday: pay landed (check-in) and the recap, for everyone", () => {
    for (const d of [jessP, marcusP, priyaP]) {
      const list = notifications(d);
      expect(list.some((n) => n.id.startsWith("payday-"))).toBe(true);
      expect(list.some((n) => n.id.startsWith("recap-"))).toBe(true);
    }
    expect(notifications(jessP).find((n) => n.id.startsWith("payday-"))!.title).toBe("Payday: $2,305.49 landed");
    expect(notifications(marcusP).find((n) => n.id.startsWith("recap-"))!.body).toContain("13 pay cycles in a row");
  });

  it("the recap never mentions a streak that ended", () => {
    const r = notifications(jessP).find((n) => n.id.startsWith("recap-"))!;
    expect(r.body).toBe("$2,826 spent, $2,483 paid in.");
  });

  it("no routine messages: nothing about a refresh or a payment going through", () => {
    for (const d of everyone) for (const n of notifications(d)) expect(`${n.title} ${n.body}`).not.toMatch(/refreshed|went through|up to date/i);
    expect(notifications(priya)).toEqual([]); // nothing has happened yet: an empty inbox
  });

  it("never offers, lenders, gambling or alcohol, in any persona or snapshot", () => {
    for (const d of everyone) {
      for (const n of notificationEvents(d)) expect(`${n.title} ${n.body} ${n.href}`).not.toMatch(/offer|lender|gambl|betting|casino|alcohol|liquor|bottle/i);
    }
  });

  it("account changes still notify (bank disconnected)", () => {
    expect(ids(notifications(jess, { bank: { disconnected: true } }))).toContain("bank-off-2026-09-25");
  });
});

describe("notifications: frequency cap and weekly digest", async () => {
  const [jessB, jessP] = await Promise.all([loadBillDue("jess"), loadPayday("jess")]);

  it("default cap is 2 a day; extras wait in the inbox, money first", () => {
    const list = notifications(jessB, { bank: { disconnected: true } }).filter((n) => n.date === jessB.asOf);
    expect(list.map((n) => [n.id.split("-")[0], n.delivery])).toEqual([["shortfall", "push"], ["bill", "push"], ["bank", "inbox"]]);
  });

  it("the customer can lower the cap", () => {
    const list = notifications(jessB, { notify: { cap: 1, digest: false } }).filter((n) => n.date === jessB.asOf);
    expect(list.map((n) => n.delivery)).toEqual(["push", "inbox"]);
  });

  it("weekly digest takes score updates and recaps, never shortfalls or bills", () => {
    const list = notifications(jessP, { notify: { cap: 2, digest: true } });
    for (const n of list) expect(n.delivery).toBe(n.type === "score" || n.id.startsWith("recap-") ? "digest" : "push");
    const money = notifications(jessB, { notify: { cap: 2, digest: true } }).filter((n) => n.type === "money");
    expect(money.every((n) => n.delivery === "push")).toBe(true);
  });

  it("notify settings survive the cookie round trip, and bad values are clamped or dropped", () => {
    const raw = serialiseAccount(undefined, "jess", { notify: { cap: 3, digest: true } });
    expect(parseAccount(raw, "jess").notify).toEqual({ cap: 3, digest: true });
    const bad = encodeURIComponent(JSON.stringify({ jess: { notify: { cap: 99, digest: true } }, marcus: { notify: { cap: "x" } } }));
    expect(parseAccount(bad, "jess").notify).toEqual({ cap: 10, digest: true });
    expect(parseAccount(bad, "marcus").notify).toBeUndefined();
  });
});
