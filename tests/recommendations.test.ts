import { describe, expect, it } from "vitest";
import { factorDrivers, factors, firstAction, recommendations } from "@/lib/selectors";
import { load } from "./helpers";

describe("recommendations", async () => {
  const [jess, marcus, priya] = await Promise.all([load("jess"), load("marcus"), load("priya")]);

  it("Jess (short before payday): the no-cost pay-advance step leads; paying off a loan comes after no-cost steps", () => {
    const ids = recommendations(jess).map((r) => r.id);
    expect(ids[0]).toBe("pay-advance");
    expect(ids.at(-1)).toBe("pay-off-Nimble");
    expect(firstAction(jess)).toMatchObject({ title: "Skip the next pay advance if you can" });
  });

  it("Marcus: Money left over leads, matching Astra's dashboard", () => {
    expect(recommendations(marcus)[0]).toMatchObject({ id: "money-left", title: "Money left over is your lowest factor at 5.9", impact: "About $1,700 left after bills this pay cycle" });
  });

  it("only calls Money left over the lowest factor when it is", () => {
    for (const d of [jess, marcus]) {
      const r = recommendations(d).find((x) => x.id === "money-left");
      if (!r) continue;
      const fs = factors(d);
      const ml = fs.find((f) => f.key === "DISPOSABLE_INCOME")!.value!;
      const lowest = fs.every((f) => f.value === null || f.value >= ml);
      expect(r.title.includes("lowest")).toBe(lowest);
    }
  });

  it("Priya: no score, no recommendations", () => {
    expect(recommendations(priya)).toEqual([]);
    expect(firstAction(priya)).toBeNull();
  });

  it("never recommends 'improving' government payments, and has no score-point claims", () => {
    for (const d of [jess, marcus]) for (const r of recommendations(d)) {
      expect(r.factorKey).not.toBe("GOVERNMENT_RELIANCE");
      expect(`${r.title} ${r.why} ${r.impact ?? ""}`).not.toMatch(/\+\d+ points|points? (up|higher)/i);
    }
  });

  it("dollar impacts are computed facts", () => {
    const r = recommendations(jess);
    expect(r.find((x) => x.id === "pay-advance")!.impact).toBe("Keeps $15 a fortnight in fees, and the advance out of your next pay");
    expect(r.find((x) => x.id === "failed-payments")!.impact).toBe("$30 in dishonour fees over the last 90 days");
  });
});

describe("factor drivers (Astra factor-sheet fixture)", async () => {
  const jess = await load("jess");
  it("Current borrowing", () => {
    expect(factorDrivers(jess, "LOAN_AMOUNT_AND_TYPE").map((f) => f.text)).toEqual([
      "2 small loans open (Nimble, Cash Train), about $1,060 left in total, estimated",
      "1 medium loan open (Right Road Finance), about $2,140 left, estimated",
      "A Beforepay pay advance every fortnight since 27/08",
    ]);
  });
  it("Spending mix is flagged as sample logic (Q2)", () => {
    expect(factorDrivers(jess, "PRODUCTIVE_SPEND").every((f) => f.sample)).toBe(true);
  });
  it("null factors explain missing history, never zero", async () => {
    const priya = await load("priya");
    expect(factorDrivers(priya, "INCOME")).toEqual([{ text: "We don't have enough history to work this out yet." }]);
  });
});
