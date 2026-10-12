// Subscriptions redesign (12/10/2026): the review queue order, "Not sure", pay-cycle groups (including a charge due
// on payday), the savings maths, and when the streaming insight and Could save appear.
import { describe, expect, it } from "vitest";
import {
  checkedCounts, couldSave, cycleGroups, cyclesPerYear, nextCharge, perCycle, reviewQueue, statusOf, streamingInsight, subscriptions,
  type Answers, type SubRow,
} from "@/lib/selectors";
import { isVideoStreaming } from "@/data/streaming";
import { load } from "./helpers";

const row = (merchant: string, amount: number, nextCharge: string): SubRow => ({ merchant, amount, nextCharge, perPayCycle: perCycle(amount), perYear: Math.round(amount * 1200) / 100 });
// Jess, as at Fri 25/09 (payday Thu 01/10).
const rows = [row("Spotify", 13.99, "2026-10-15"), row("Apple iCloud", 4.49, "2026-10-20"), row("Stan", 12, "2026-10-09"), row("Netflix", 18.99, "2026-10-03"), row("Binge", 18, "2026-10-08")];

describe("review queue", () => {
  it("streaming first, then by next charge; answered ones left out", () => {
    expect(reviewQueue(rows, {}).map((r) => r.merchant)).toEqual(["Netflix", "Binge", "Stan", "Spotify", "Apple iCloud"]);
    expect(reviewQueue(rows, { Netflix: "keep", Spotify: "drop" }).map((r) => r.merchant)).toEqual(["Binge", "Stan", "Apple iCloud"]);
  });
  it("\"Not sure\" leaves the queue but stays To check, and isn't counted as checked", () => {
    const a: Answers = { Netflix: "later" };
    expect(reviewQueue(rows, a).map((r) => r.merchant)).not.toContain("Netflix");
    expect(statusOf(a.Netflix)).toBe("toCheck");
    expect(checkedCounts(rows, a)).toMatchObject({ total: 5, checked: 0, later: 1, toCheck: 5 });
    expect(checkedCounts(rows, { ...a, Binge: "keep", Stan: "drop" })).toMatchObject({ checked: 2, using: 1, notUsing: 1, toCheck: 3 });
  });
  it("streaming matches whole words only", () => {
    expect(["Netflix", "Binge", "Stan", "Kayo", "Disney+", "Paramount Plus"].every(isVideoStreaming)).toBe(true);
    expect(["Spotify", "Apple iCloud", "Standard Chartered", "Bingo Club"].some(isVideoStreaming)).toBe(false);
  });
});

describe("pay-cycle groups", () => {
  it("before payday, the next cycle (payday included) and the following one, with totals", () => {
    const g = cycleGroups([...rows, row("Kayo", 25, "2026-10-01"), row("Binge Extra", 5, "2026-09-28")], "2026-09-25", "2026-10-01");
    expect(g.map((x) => [x.kind, x.from, x.to, x.rows.map((r) => r.merchant), x.total])).toEqual([
      ["beforePayday", "2026-09-25", "2026-09-30", ["Binge Extra"], 5],
      ["next", "2026-10-01", "2026-10-14", ["Kayo", "Netflix", "Binge", "Stan"], 73.99], // Kayo is due on payday
      ["following", "2026-10-15", null, ["Spotify", "Apple iCloud"], 18.48],
    ]);
  });
  it("before payday is shown even when empty; following only when it has something", () => {
    const g = cycleGroups([row("Netflix", 18.99, "2026-10-03")], "2026-09-25", "2026-10-01");
    expect(g.map((x) => [x.kind, x.rows.length])).toEqual([["beforePayday", 0], ["next", 1]]);
  });
  it("next charge says before or after payday (payday itself is after)", () => {
    expect(nextCharge(rows, "2026-10-01")).toMatchObject({ merchant: "Netflix", afterPayday: true });
    expect(nextCharge([row("Kayo", 25, "2026-10-01")], "2026-10-01")!.afterPayday).toBe(true);
    expect(nextCharge([row("Kayo", 25, "2026-09-30")], "2026-10-01")!.afterPayday).toBe(false);
  });
});

describe("savings maths", () => {
  it("monthly × 12 a year, × 12 ÷ 26 a pay cycle; cancelled ones left out", () => {
    const s = couldSave(rows, { Netflix: "drop", Stan: "drop", Binge: "keep" })!;
    expect(s.rows.map((r) => r.merchant)).toEqual(["Netflix", "Stan"]);
    expect(s).toMatchObject({ monthly: 30.99, yearly: 371.88, perCycle: 14.3 });
    expect(couldSave(rows, { Netflix: "drop", Stan: "drop" }, new Set(["Stan"]))!.monthly).toBe(18.99);
  });
  it("uses the real pay-cycle length", () => {
    expect(cyclesPerYear(14)).toBe(26);
    expect(cyclesPerYear(7)).toBe(52);
    expect(perCycle(18.99)).toBe(8.76);
    expect(perCycle(18.99, 7)).toBe(4.38);
  });
});

describe("what shows", () => {
  it("Could save only once something is marked Not using (Not sure doesn't count)", () => {
    expect(couldSave(rows, {})).toBeNull();
    expect(couldSave(rows, { Netflix: "later", Binge: "keep" })).toBeNull();
    expect(couldSave(rows, { Netflix: "drop" })).not.toBeNull();
  });
  it("the streaming insight needs two or more video streaming services", () => {
    expect(streamingInsight(rows)).toEqual({ names: ["Netflix", "Binge", "Stan"], monthly: 48.99, yearly: 587.88 });
    expect(streamingInsight([row("Netflix", 18.99, "2026-10-03"), row("Spotify", 13.99, "2026-10-15")])).toBeNull();
  });
  it("the personas: Jess 3 streaming, Marcus 2, Priya none", async () => {
    const names = async (p: "jess" | "marcus" | "priya") => streamingInsight(subscriptions(await load(p)).rows)?.names ?? [];
    expect(await names("jess")).toEqual(["Netflix", "Binge", "Stan"]);
    expect((await names("marcus")).sort()).toEqual(["Kayo", "Netflix"]);
    expect(await names("priya")).toEqual([]);
  });
});
