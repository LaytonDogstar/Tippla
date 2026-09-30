import { describe, expect, it } from "vitest";
import { RAW } from "@/lib/api/fixtures";
import { PERSONAS } from "@/lib/api/client";
import { classOf, DATA_USE, metric, NEVER_DISPLAY_CODES } from "@/lib/dataUse";
import { allSelectorOutputs } from "@/lib/selectors/debug";
import { all } from "./helpers";

// Labels that must never reach a customer surface, whatever the value.
const SENSITIVE_LABELS = [
  "insolvency", "public trustee", "financial counsellor service", "dependents", "dependants", "high risk centrelink",
  "debt collection", "charge off", "budget management", "inferred gambling", "risk_grade", "risk grade",
];

describe("data-use classes", async () => {
  const personas = await all();

  it("every metric in the fixtures has an explicit class", () => {
    for (const id of PERSONAS)
      for (const m of RAW[id].bankStatement.metrics) expect(DATA_USE, `${m.code} ${m.name}`).toHaveProperty(m.code);
  });

  it("unclassified codes fail closed", () => {
    expect(classOf("AM9999")).toBe("NEVER_DISPLAY");
  });

  it("the raw fixtures DO contain sensitive metrics (so the next tests mean something)", () => {
    const codes = RAW.marcus.bankStatement.metrics.map((m) => m.code);
    for (const c of NEVER_DISPLAY_CODES.filter((x) => x !== "AM2134")) expect(codes).toContain(c);
  });

  for (const d of personas) {
    it(`${d.id}: NEVER_DISPLAY and LENDER_ONLY metrics are stripped at the API boundary`, () => {
      for (const m of d.bankStatement.metrics) expect(["SHOW", "SCORE_ONLY", "INTERNAL"]).toContain(classOf(m.code));
      expect(d.bankStatement.profiles[0]!.full_name).toBe("");
    });

    it(`${d.id}: the customer score has no risk grade, references or consumer name`, () => {
      const s = JSON.stringify(d.score);
      expect(s).not.toMatch(/RISK_GRADE|BANKS_REFERENCE|BUREAU_REFERENCE|FULL_NAME|score_id/);
      expect(s).not.toContain(RAW[d.id].score.Consumer.FULL_NAME);
    });

    it(`${d.id}: no selector output contains sensitive codes, labels or the full name`, () => {
      const out = JSON.stringify(allSelectorOutputs(d)).toLowerCase();
      for (const c of NEVER_DISPLAY_CODES) expect(out).not.toContain(c.toLowerCase());
      for (const l of SENSITIVE_LABELS) expect(out, l).not.toContain(l);
      expect(out).not.toContain(d.profile.full_name.toLowerCase());
      expect(out).not.toMatch(/\d{3}-\d{3}\b/); // full BSB
    });
  }

  it("readers only accept SHOW / SCORE_ONLY codes (compile-time)", () => {
    const bs = personas[0]!.bankStatement;
    expect(() => {
      // @ts-expect-error AM2093 (dependants) is NEVER_DISPLAY and must not be readable
      metric(bs, "AM2093");
    }).toThrow(); // stripped, so it also fails at runtime
  });
});
