// Spec 10: the central notification policy — caps, quiet hours, dedupe, lock-screen privacy, block list.
import { describe, expect, it } from "vitest";
import { decide, DEFAULT_PREFS, GENERIC, inQuietHours, quietEndAfter, type Candidate, type NotifyPrefs, type SentRecord } from "@/lib/notify/policy";

const P: NotifyPrefs = DEFAULT_PREFS;
// 10:00am and 10:00pm on Fri 25/09 in Sydney (AEST, +10:00).
const MORNING = "2026-09-25T00:00:00.000Z";
const NIGHT = "2026-09-25T12:00:00.000Z";
const c = (key: string, priority: Candidate["priority"], extra: Partial<Candidate> = {}): Candidate => ({
  key, priority, category: priority === "high" ? "money" : priority === "normal" ? "payday" : "score",
  title: `Title ${key}`, body: `Body ${key}`, href: "/", at: MORNING, ...extra,
});
const outcomes = (ds: ReturnType<typeof decide>) => ds.map((d) => [d.candidate.key, d.outcome, d.reason ?? null]);

describe("frequency cap", () => {
  it("normal and low: 1 a day", () => {
    expect(outcomes(decide([c("a", "normal"), c("b", "low")], P, [], MORNING))).toEqual([["a", "send", null], ["b", "inbox_only", "cap"]]);
  });
  it("normal and low: 3 a week, even on different days", () => {
    const history: SentRecord[] = ["2026-09-20", "2026-09-22", "2026-09-24"].map((d, i) => ({ key: `h${i}`, priority: "normal", channel: "push", sentAt: `${d}T00:00:00.000Z` }));
    expect(outcomes(decide([c("a", "normal")], P, history, MORNING))).toEqual([["a", "inbox_only", "cap"]]);
    expect(outcomes(decide([c("a", "normal")], P, history.slice(1), MORNING))).toEqual([["a", "send", null]]);
  });
  it("high priority: its own limit of 1 a day, on top of the normal one", () => {
    const ds = decide([c("h1", "high"), c("n1", "normal"), c("h2", "high")], P, [], MORNING);
    expect(outcomes(ds)).toEqual([["h1", "send", null], ["n1", "send", null], ["h2", "inbox_only", "cap"]]);
  });
  it("counts the member's local day, not UTC", () => {
    // 11pm UTC on 24/09 is 9am on 25/09 in Sydney: same local day as MORNING.
    const history: SentRecord[] = [{ key: "x", priority: "normal", channel: "push", sentAt: "2026-09-24T23:00:00.000Z" }];
    expect(outcomes(decide([c("a", "normal")], P, history, MORNING))).toEqual([["a", "inbox_only", "cap"]]);
  });
});

describe("quiet hours", () => {
  it("9pm to 8am in the member's timezone", () => {
    expect(inQuietHours(NIGHT, P)).toBe(true);
    expect(inQuietHours(MORNING, P)).toBe(false);
    expect(inQuietHours("2026-09-24T21:59:00.000Z", P)).toBe(true); // 7:59am
    expect(inQuietHours("2026-09-24T22:00:00.000Z", P)).toBe(false); // 8:00am
  });
  it("holds a notification until 8am", () => {
    const [d] = decide([c("a", "normal", { at: NIGHT })], P, [], NIGHT);
    expect([d!.outcome, d!.reason, d!.sendAt]).toEqual(["send", "quiet_hours", "2026-09-25T22:00:00.000Z"]);
    expect(quietEndAfter(NIGHT, P)).toBe("2026-09-25T22:00:00.000Z");
  });
  it("high priority still waits, unless the thing is due before 8am", () => {
    expect(decide([c("a", "high", { at: NIGHT, dueAt: "2026-09-26T03:00:00.000Z" })], P, [], NIGHT)[0]!.sendAt).toBe("2026-09-25T22:00:00.000Z");
    expect(decide([c("a", "high", { at: NIGHT, dueAt: "2026-09-25T20:00:00.000Z" })], P, [], NIGHT)[0]!.sendAt).toBe(NIGHT);
  });
  it("members can move quiet hours", () => {
    expect(inQuietHours(NIGHT, { ...P, quiet: { start: "23:00", end: "07:00" } })).toBe(false);
  });
});

describe("dedupe, privacy, block list, pause, channels, digest", () => {
  it("dedupes by type + entity + period", () => {
    const history: SentRecord[] = [{ key: "shortfall:2026-09-17", priority: "high", channel: "push", sentAt: "2026-09-20T00:00:00.000Z" }];
    expect(outcomes(decide([c("shortfall:2026-09-17", "high")], P, history, MORNING))).toEqual([["shortfall:2026-09-17", "inbox_only", "dedupe"]]);
  });
  it("lock screens show generic text unless the member opts in", () => {
    expect(decide([c("a", "high")], P, [], MORNING)[0]!.lockScreen).toEqual(GENERIC);
    expect(decide([c("a", "high")], { ...P, detailed: true }, [], MORNING)[0]!.lockScreen).toEqual({ title: "Title a", body: "Body a" });
  });
  it("offers, lenders, gambling and alcohol are always rejected, on every channel and the inbox", () => {
    for (const bad of [
      { title: "You have a new offer", body: "Harbour Lending" },
      { title: "Pre-approved for $2,500", body: "x" },
      { title: "Gambling deposits up", body: "x" },
      { title: "x", body: "Your alcohol spending" },
    ]) {
      const [d] = decide([c("a", "high", bad)], { ...P, detailed: true }, [], MORNING);
      expect([d!.outcome, d!.reason]).toEqual(["blocked", "blocked"]);
    }
    expect(decide([c("a", "normal", { href: "/offers" })], P, [], MORNING)[0]!.outcome).toBe("blocked");
  });
  it("paused: nothing goes out (still in the inbox)", () => {
    expect(outcomes(decide([c("a", "high")], { ...P, paused: true }, [], MORNING))).toEqual([["a", "inbox_only", "paused"]]);
  });
  it("per-category channels: email when push is off; inbox only when both are off", () => {
    const prefs = { ...P, channels: { ...P.channels, payday: { push: false, email: true }, score: { push: false, email: false } } };
    const ds = decide([c("a", "normal"), c("b", "low")], prefs, [], MORNING);
    expect(ds.map((d) => [d.outcome, d.channel, d.reason ?? null])).toEqual([["send", "email", null], ["inbox_only", "inbox", "channel_off"]]);
  });
  it("weekly digest takes low-priority updates; urgent ones still come straight away", () => {
    const ds = decide([c("h", "high"), c("l", "low")], { ...P, digest: true }, [], MORNING);
    expect(outcomes(ds)).toEqual([["h", "send", null], ["l", "inbox_only", "digest"]]);
  });
});
