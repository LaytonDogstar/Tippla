// Spec 10: the notification service end to end against the database, with a fake push sender: delivery,
// logging and dedupe, quiet hours held then sent, lock-screen privacy, the block list, email fallback,
// the weekly digest and one-click unsubscribe.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests, type Db } from "@/lib/db";
import { DEFAULT_PREFS } from "@/lib/notify/policy";
import { saveSubscription, setPushSender, type PushPayload } from "@/lib/notify/push";
import { dispatch, notificationLog, notify, sendFirstWeekNudge, sendWeeklyDigest, sendWinBack } from "@/lib/notify/service";
import { loadPayday } from "./helpers";
import { outbox, unsubscribe, unsubscribeToken, verifyUnsubscribe } from "@/lib/notify/email";
import { load } from "./helpers";

const DAY = "2026-09-25T00:30:00.000Z"; // 10:30am Fri 25/09 in Sydney
const NIGHT = "2026-09-25T12:00:00.000Z"; // 10pm
const MORNING_AFTER = "2026-09-25T22:05:00.000Z"; // 8:05am Sat 26/09
let pushed: { endpoint: string; payload: PushPayload }[] = [];
let d: Db;

beforeAll(async () => {
  d = await resetDbForTests();
  setPushSender(async (sub, payload) => { pushed.push({ endpoint: sub.endpoint, payload }); return { ok: true }; });
});
afterAll(() => setPushSender(null));
beforeEach(async () => {
  pushed = [];
  await d.query("DELETE FROM notifications"); await d.query("DELETE FROM push_subscriptions"); await d.query("DELETE FROM email_outbox"); await d.query("DELETE FROM email_unsubscribes");
});
const device = (member = "jess") => saveSubscription(member, { endpoint: `https://push.example/${member}`, p256dh: "k", auth: "a" }, "pwa");

describe("dispatch", async () => {
  const jess = await load("jess");

  it("sends Jess's shortfall and score update to her device, logs them, and never sends them twice", async () => {
    await device();
    const first = await dispatch("jess", jess, {}, { now: DAY });
    expect(first.map((r) => [r.key, r.status, r.channel])).toEqual([["shortfall-2026-09-17", "sent", "push"], ["score-2026-09-25", "sent", "push"]]);
    // Lock screen: generic text by default (no amounts).
    expect(pushed.map((p) => p.payload)).toEqual([
      { title: "Tippla", body: "You have an update from Tippla", url: "/hardship", tag: "shortfall-2026-09-17" },
      { title: "Tippla", body: "You have an update from Tippla", url: "/score", tag: "score-2026-09-25" },
    ]);
    const again = await dispatch("jess", jess, {}, { now: "2026-09-25T02:00:00.000Z" });
    expect(again.every((r) => r.status === "suppressed")).toBe(true);
    expect(pushed).toHaveLength(2);
    expect((await notificationLog("jess")).filter((r) => r.status === "sent")).toHaveLength(2);
  });

  it("shows amounts on the lock screen only if the member opts in", async () => {
    await device();
    await dispatch("jess", jess, { notify: { digest: false, detailed: true } }, { now: DAY });
    expect(pushed[0]!.payload.title).toBe("Heads up: about $53 short before payday");
  });

  it("holds notifications during quiet hours, then sends them at 8am", async () => {
    await device();
    const night = await dispatch("jess", jess, {}, { now: NIGHT });
    expect(night.map((r) => r.status)).toEqual(["scheduled", "scheduled"]);
    expect(pushed).toHaveLength(0);
    const morning = await dispatch("jess", jess, {}, { now: MORNING_AFTER });
    expect(morning.filter((r) => r.status === "sent").map((r) => r.key)).toEqual(["shortfall-2026-09-17", "score-2026-09-25"]);
    expect(pushed).toHaveLength(2);
  });

  it("no device: falls back to email where the member wants that category by email, otherwise inbox only", async () => {
    const a = { notify: { digest: false, channels: { money: { push: true, email: true } } } };
    const r = await dispatch("jess", jess, a, { now: DAY });
    expect(r.map((x) => [x.key, x.status, x.reason ?? null])).toEqual([["shortfall-2026-09-17", "sent", null], ["score-2026-09-25", "suppressed", "no_device"]]);
    const mail = await outbox();
    expect(mail).toHaveLength(1);
    expect(mail[0]!.subject).toBe("Heads up: about $53 short before payday");
    expect(mail[0]!.text_body).toMatch(/Unsubscribe: http.*\/api\/email\/unsubscribe\?m=jess&k=notification&t=[0-9a-f]{32}/);
  });

  it("paused: nothing goes out", async () => {
    await device();
    const r = await dispatch("jess", jess, { notify: { digest: false, paused: true } }, { now: DAY });
    expect(r.map((x) => x.reason)).toEqual(["paused", "paused"]);
    expect(pushed).toHaveLength(0);
  });
});

describe("block list, digest and unsubscribe", async () => {
  const jess = await load("jess");
  const ctx = { prefs: DEFAULT_PREFS, now: DAY, consent: false, email: "jess@example.com" };

  it("an offer can never be sent, on any channel", async () => {
    await device();
    const r = await notify("jess", { key: "offer:1", category: "money", priority: "high", title: "You have a new offer", body: "Harbour Lending can lend you $2,500", href: "/offers", at: DAY }, ctx);
    expect(r.status).toBe("blocked");
    expect(pushed).toHaveLength(0);
    expect((await notificationLog("jess"))[0]).toMatchObject({ key: "offer:1", status: "blocked" });
  });

  it("weekly digest email: once a week, with the week's events and an unsubscribe link; unsubscribing stops it", async () => {
    expect(await sendWeeklyDigest("jess", jess, {}, ctx)).toBe(true);
    expect(await sendWeeklyDigest("jess", jess, {}, ctx)).toBe(false); // already sent this week
    const [mail] = await outbox();
    expect(mail!.subject).toBe("Your week with Tippla");
    expect(mail!.text_body).toContain("Heads up: about $53 short before payday");
    expect(mail!.text_body).not.toMatch(/offer|lender|gambl/i);
    await d.query("DELETE FROM notifications");
    await unsubscribe("jess", "weekly_digest");
    expect(await sendWeeklyDigest("jess", jess, {}, ctx)).toBe(false);
  });

  it("recap: emailed when push isn't set up on any device", async () => {
    const jessP = await loadPayday("jess");
    const r = await dispatch("jess", jessP, { notify: { digest: false, channels: { payday: { push: true, email: false } } } }, { now: "2026-10-01T00:00:00.000Z" });
    expect(r.map((x) => [x.key.split("-")[0], x.status, x.reason ?? null])).toEqual([["payday", "suppressed", "no_device"], ["recap", "sent", null]]);
    expect((await outbox())[0]!.subject).toBe("Your last pay cycle in review");
  });

  it("win-back: one email after 21 days away, with one real insight, and not again within 60 days", async () => {
    expect(await sendWinBack("jess", jess, {}, ctx, "2026-09-10T00:00:00.000Z")).toBe(false); // 15 days
    expect(await sendWinBack("jess", jess, {}, ctx, "2026-08-30T00:00:00.000Z")).toBe(true);
    expect((await outbox())[0]!.text_body).toContain("Heads up: about $53 short before payday");
    expect(await sendWinBack("jess", jess, {}, { ...ctx, now: "2026-10-10T00:00:00.000Z" }, "2026-08-30T00:00:00.000Z")).toBe(false);
  });

  it("unsubscribe links are signed per member and kind", () => {
    const t = unsubscribeToken("jess", "weekly_digest");
    expect(verifyUnsubscribe("jess", "weekly_digest", t)).toBe(true);
    expect(verifyUnsubscribe("marcus", "weekly_digest", t)).toBe(false);
    expect(verifyUnsubscribe("jess", "recap", t)).toBe(false);
    expect(verifyUnsubscribe("jess", "weekly_digest", "x".repeat(32))).toBe(false);
  });
});

describe("first-week nudge (spec 04)", async () => {
  const jess = await load("jess");
  const ctx = { prefs: DEFAULT_PREFS, now: DAY, consent: false, email: "jess@example.com" };

  it("day 2, not back since: one push with a new insight (not the shortfall she already saw), sent once", async () => {
    await device();
    const r = await sendFirstWeekNudge("jess", jess, { onboardedAt: "2026-09-23" }, ctx, "2026-09-23T01:00:00.000Z");
    expect(r).toMatchObject({ key: "nudge:first_week", status: "sent", channel: "push" });
    const row = (await notificationLog("jess")).find((x) => x.key === "nudge:first_week")!;
    expect(row.title).toMatch(/^Possible double charge/);
    expect(pushed[0]!.payload.body).toBe("You have an update from Tippla"); // lock screen stays generic
    expect((await sendFirstWeekNudge("jess", jess, { onboardedAt: "2026-09-23" }, ctx, null))!.status).toBe("suppressed");
    expect(pushed).toHaveLength(1);
  });

  it("not on day 1 or day 5, and not if they came back in the last day", async () => {
    await device();
    expect(await sendFirstWeekNudge("jess", jess, { onboardedAt: "2026-09-24" }, ctx, null)).toBeNull();
    expect(await sendFirstWeekNudge("jess", jess, { onboardedAt: "2026-09-20" }, ctx, null)).toBeNull();
    expect(await sendFirstWeekNudge("jess", jess, { onboardedAt: "2026-09-23" }, ctx, "2026-09-24T23:00:00.000Z")).toBeNull();
    expect(await sendFirstWeekNudge("jess", jess, {}, ctx, null)).toBeNull();
    expect(pushed).toHaveLength(0);
  });
});

