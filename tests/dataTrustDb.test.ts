// Spec 05 against the database: consent reminders through the notification policy, anonymised correction
// reports, and forecast snapshots compared once the day has passed.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests, type Db } from "@/lib/db";
import { DEFAULT_PREFS } from "@/lib/notify/policy";
import { saveSubscription, setPushSender, type PushPayload } from "@/lib/notify/push";
import { sendConsentReminder } from "@/lib/notify/service";
import { reportCorrection } from "@/lib/corrections/report";
import { recordForecasts, storedAccuracy } from "@/lib/forecast/snapshots";
import { applyDevStates } from "@/lib/dev/states";
import { load, loadPayday } from "./helpers";

let pushed: PushPayload[] = [];
let d: Db;
beforeAll(async () => {
  d = await resetDbForTests();
  setPushSender(async (_s, p) => { pushed.push(p); return { ok: true }; });
});
afterAll(() => setPushSender(null));
beforeEach(async () => { pushed = []; await d.query("DELETE FROM notifications"); await d.query("DELETE FROM push_subscriptions"); });

describe("consent reminders", async () => {
  const jess = await load("jess");
  const ctx = { prefs: DEFAULT_PREFS, now: "2026-09-25T00:30:00.000Z", consent: false, email: "jess@example.com" };
  // Consent granted 12 months before (data date + days), so it ends `days` after the data date.
  const ending = (days: number) => {
    const end = new Date(Date.parse(`${jess.asOf}T00:00:00Z`) + days * 864e5).toISOString().slice(0, 10);
    const at = `${Number(end.slice(0, 4)) - 1}${end.slice(4)}T10:00:00+10:00`;
    return { ...jess, consents: jess.consents.map((c) => (c.id === "talefin_bank_data" ? { ...c, granted_at: at } : c)) };
  };

  it("3 days before: a normal push (counts toward the cap); on the day: urgent; other days nothing; once each", async () => {
    await saveSubscription("jess", { endpoint: "https://push.example/jess", p256dh: "k", auth: "a" }, "pwa");
    expect(await sendConsentReminder("jess", applyDevStates(jess, ["consent_expiring"]), {}, ctx)).toBeNull(); // 10 days out
    expect(await sendConsentReminder("jess", ending(3), {}, ctx)).toMatchObject({ key: `consent:2026-09-28:3`, status: "sent", channel: "push" });
    expect((await sendConsentReminder("jess", ending(3), {}, ctx))!.status).toBe("suppressed");
    expect(await sendConsentReminder("jess", ending(0), {}, ctx)).toMatchObject({ key: "consent:2026-09-25:0", status: "sent" });
    const rows = (await d.query<{ key: string; priority: string }>("SELECT key, priority FROM notifications WHERE status = 'sent' ORDER BY id")).rows;
    expect(rows.map((r) => r.priority)).toEqual(["normal", "high"]);
    expect(pushed.map((p) => p.url)).toEqual(["/account/bank/reconnect?return=/", "/account/bank/reconnect?return=/"]);
  });
});

describe("correction reports (gate G3)", () => {
  it("stores an anonymised report; never anything about gambling or alcohol; nothing without consent", async () => {
    await d.query("DELETE FROM correction_reports");
    expect(await reportCorrection("jess", { entity: "transaction", correction: "category", merchant: "Officeworks", from: "shopping", to: "bills" }, { consent: true })).toBe("stored");
    expect(await reportCorrection("jess", { entity: "transaction", correction: "category", merchant: "Sportsbet", from: "gambling", to: "entertainment" }, { consent: true })).toBe("sensitive");
    expect(await reportCorrection("jess", { entity: "bill", correction: "already_paid", merchant: "Telstra" }, { consent: false })).toBe("off");
    expect(await reportCorrection("jess", { entity: "nope", correction: "category", merchant: "X" }, { consent: true })).toBe("invalid");
    const rows = (await d.query<Record<string, unknown>>("SELECT * FROM correction_reports")).rows;
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]!).sort()).toEqual(["correction", "entity", "from_category", "id", "merchant", "reported_on", "to_category"]); // no member id
  });
});

describe("forecast snapshots", () => {
  it("records today's forecasts, then compares them with the actual balance once the day has passed", async () => {
    await d.query("DELETE FROM forecast_snapshots");
    expect(await recordForecasts("jess", await load("jess"))).toBe(4);
    expect(await recordForecasts("jess", await load("jess"))).toBe(0); // once a day
    expect((await storedAccuracy()).every((s) => s.compared === 0)).toBe(true);
    await recordForecasts("jess", await loadPayday("jess")); // 01/10: 26/09 and 28/09 have happened
    const s = await storedAccuracy();
    expect(s.find((x) => x.horizon === 1)!.compared).toBe(1);
    expect(s.find((x) => x.horizon === 3)!.compared).toBe(1);
    expect(s.find((x) => x.horizon === 14)!.compared).toBe(0);
  });
});
