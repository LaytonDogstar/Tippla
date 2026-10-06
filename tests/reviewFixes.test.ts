// Regression tests for the retention-pack code review (06/10/2026).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PersonaData, Transaction } from "@/lib/api/types";
import { duplicateCharge } from "@/lib/feed/rules/duplicateCharge";
import { isRise } from "@/lib/feed/rules/priceRise";
import { decide, DEFAULT_PREFS } from "@/lib/notify/policy";
import { consentEndsOn } from "@/lib/selectors/connection";
import { verifyUnsubscribe, unsubscribeToken } from "@/lib/notify/email";
import { resetDbForTests, type Db } from "@/lib/db";
import { removeSubscription, saveSubscription, setPushSender, subscriptionsFor } from "@/lib/notify/push";
import { dispatch, notificationLog } from "@/lib/notify/service";
import { load } from "./helpers";

describe("pure fixes", async () => {
  const jess = await load("jess");
  const tx = (id: string, date: string, amount = -5.5): Transaction => ({ id, date, description: "CAFE", merchant: "Corner Cafe", amount, category: "food", subcategory: null, is_recurring: false, status: "posted", account_id: 1, balance_after: null });
  const withTx = (list: Transaction[]): PersonaData => ({ ...jess, transactions: [...jess.transactions.filter((t) => t.merchant !== "Corner Cafe"), ...list] });
  const cafe = (d: PersonaData) => duplicateCharge({ d, edits: {} }).filter((i) => i.title.includes("Corner Cafe"));

  it("a daily coffee isn't a double charge; two on the same day still is", () => {
    expect(cafe(withTx(["20", "21", "22", "23", "24"].map((day, i) => tx(`c${i}`, `2026-09-${day}`))))).toEqual([]);
    expect(cafe(withTx([tx("a", "2026-09-24"), tx("b", "2026-09-24")]))).toHaveLength(1);
    // Charges four days apart aren't chained into one group.
    expect(cafe(withTx([tx("a", "2026-09-16"), tx("b", "2026-09-20")]))).toEqual([]);
  });

  it("a $1 price rise counts even when floats say 0.9999", () => {
    expect(isRise(32.01, 31.01)).toBe(true);
    expect(isRise(31.5, 31.01)).toBe(false);
    expect(isRise(10.5, 10)).toBe(true); // 5%
  });

  it("an urgent alert due tonight isn't held to 8am because of a time-zone string compare", () => {
    const at = "2026-10-05T11:30:00.000Z"; // 9:30pm Sydney
    const [r] = decide([{ key: "consent:2026-10-05:0", category: "bank", priority: "high", title: "x", body: "y", href: "/", at, dueAt: "2026-10-05T23:59:00+10:00" }], DEFAULT_PREFS, [], at);
    expect(r!.sendAt).toBe(at);
  });

  it("consent renewed on 29/02 ends on 28/02 the next year", () => {
    expect(consentEndsOn(jess, { bank: { renewedOn: "2024-02-29" } })).toBe("2025-02-28");
  });

  it("an unsubscribe token with multibyte characters is rejected, not a crash", () => {
    expect(verifyUnsubscribe("jess", "recap", `${unsubscribeToken("jess", "recap").slice(0, 31)}é`)).toBe(false);
  });
});

describe("server fixes", () => {
  let d: Db;
  beforeAll(async () => { d = await resetDbForTests(); setPushSender(async () => ({ ok: true })); });
  afterAll(() => setPushSender(null));

  it("a device can only be removed by its own member", async () => {
    await saveSubscription("jess", { endpoint: "https://push.example/j", p256dh: "k", auth: "a" }, "pwa");
    await removeSubscription("https://push.example/j", "marcus");
    expect(await subscriptionsFor("jess")).toHaveLength(1);
    await removeSubscription("https://push.example/j", "jess");
    expect(await subscriptionsFor("jess")).toHaveLength(0);
  });

  it("a notification held overnight is re-checked at 8am: pausing in between stops it", async () => {
    await d.query("DELETE FROM notifications");
    await saveSubscription("jess", { endpoint: "https://push.example/j", p256dh: "k", auth: "a" }, "pwa");
    const jess = await load("jess");
    const night = await dispatch("jess", jess, {}, { now: "2026-09-25T12:00:00.000Z" });
    expect(night.every((r) => r.status === "scheduled")).toBe(true);
    const morning = await dispatch("jess", jess, { notify: { digest: false, paused: true } }, { now: "2026-09-25T22:05:00.000Z" });
    expect(morning.filter((r) => r.status === "sent")).toEqual([]);
    expect((await notificationLog("jess")).filter((r) => r.status === "sent")).toEqual([]);
  });
});

describe("unsubscribe link", () => {
  it("opening it (GET) only shows the button; pressing it (POST) unsubscribes", async () => {
    await resetDbForTests();
    const { GET, POST } = await import("@/app/api/email/unsubscribe/route");
    const { isUnsubscribed } = await import("@/lib/notify/email");
    const url = `https://tippla.example/api/email/unsubscribe?m=jess&k=recap&t=${unsubscribeToken("jess", "recap")}`;
    const page = await GET(new Request(url));
    expect(await page.text()).toContain('<button type="submit"');
    expect(await isUnsubscribed("jess", "recap")).toBe(false);
    await POST(new Request(url, { method: "POST" }));
    expect(await isUnsubscribed("jess", "recap")).toBe(true);
  });
});
