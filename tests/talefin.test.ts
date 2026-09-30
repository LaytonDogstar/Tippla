// The normaliser against production quirks, using a small synthetic response (fictional values only).
import { describe, expect, it } from "vitest";
import { normaliseBankStatement, type RawBankStatement } from "@/lib/api/talefin";
import { sanitiseBankStatement } from "@/lib/dataUse";
import { formatUpdated, toAESTDate } from "@/lib/format/dates";

const empty = { sum_amount: null, min_amount: null, max_amount: null, mean_amount: null, monthly_mean_amount: null, count: null, earliest: null, latest: null };
const raw: RawBankStatement = {
  version: "2.0", application_id: 123, vendor_specific_id: "x", timestamp: "2026-09-30T02:37:56.347Z",
  report_period: { start_date: "2026-07-03", end_date: "2026-09-30", days_requested: 90 },
  metrics: [
    { code: "AM2045", name: "MACC Loans Debit Transactions", group_name: "Loans", format: "array", value: {
      "90": { sum_amount: 3792.78, min_amount: 859.48, max_amount: 414.86, mean_amount: 541.83, monthly_mean_amount: 1264.26, count: 7,
              earliest: "2026-07-09T09:43:48+10:00", latest: "2026-10-05T00:30:00+11:00" },
      "30": empty,
      monthly_values: { "0": { month: "September", year: 2026, sum_amount: 900, count: 2 }, "5": { month: "April", year: 2026, sum_amount: 0, count: null } },
    } },
    { code: "AM2037", name: "Next Expected Income Date on Primary Account", group_name: "Income", format: "date", value: "2026-10-14T10:59:39+11:00" },
    { code: "AM2019", name: "Daily End of Day Balance", group_name: "Information", format: "string_array", value: [{ date: "2026-07-04T09:43:00+10:00", balance: -135.43 }] },
    { code: "AM2049", name: "Estimated SACC Loan Status", group_name: "Risk", format: "string_array", value: [{ provider: "Lender A", status: "arrears" }, { provider: "Lender B", status: "settled" }] },
    { code: "AM2106", name: "Non SACC Loan Providers in Default", group_name: "Risk", format: "string_array", value: [{ provider: "Lender C", defaults: 1 }] },
    { code: "AM2107", name: "Wage Advance Providers in Default", group_name: "Risk", format: "string_array", value: [{ provider: "Advance D", defaults: 0 }] },
    { code: "AM2030", name: "Third-Party Present", group_name: "Information", format: "string_array", value: ["Advance D", "Advance E"] },
    { code: "AM2093", name: "Dependents Present", group_name: "Risk", format: "array", value: { "90": true } },
  ],
  profiles: [{
    full_name: "SAMPLE PERSON", email: "sample@example.com", bank: { name: "CBA" },
    application: { full_name: "Sample Person", email: "sample@example.com", mobile: "0400000000" },
    accounts: [{ id: 1, nickname: "Smart Access", available: "-116.6100", balance: "-63.6200", bsb: "062000", number: "12345678",
                 account_owner_info: { owners: ["SAMPLE PERSON"], address: [{ streetName: "Sample" }] }, account_json: { dob: "1990-01-01" } }],
  }],
};

describe("normaliseBankStatement", () => {
  const n = normaliseBankStatement(raw);
  const v = n.metrics.find((m) => m.code === "AM2045")!.value as Record<string, any>;

  it("converts offset timestamps to AEST calendar dates", () => {
    expect(v["90"].earliest).toBe("2026-07-09");
    expect(v["90"].latest).toBe("2026-10-04"); // 00:30 AEDT on 05/10 is 23:30 AEST on 04/10
    expect(n.metrics.find((m) => m.code === "AM2037")!.value).toBe("2026-10-14");
    expect(n.metrics.find((m) => m.code === "AM2019")!.value).toEqual([{ date: "2026-07-04", balance: -135.43 }]);
  });
  it("turns month names into YYYY-MM and nulls into zeros", () => {
    expect(v.monthly_values["0"]).toMatchObject({ month: "2026-09", sum_amount: 900, count: 2 });
    expect(v.monthly_values["5"]).toMatchObject({ month: "2026-04", sum_amount: 0, count: 0 });
    expect(v["30"]).toMatchObject({ sum_amount: 0, count: 0, monthly_mean_amount: 0 });
  });
  it("fixes swapped debit min/max", () => {
    expect(v["90"]).toMatchObject({ min_amount: 414.86, max_amount: 859.48 });
  });
  it("parses string balances and keeps only the last 4 account digits", () => {
    expect(n.profiles[0]!.accounts[0]).toEqual({ id: 1, nickname: "Smart Access", last4: "5678", type: "TRANSACTION", balance: -63.62, available: -116.61 });
  });
  it("drops every holder detail", () => {
    const s = JSON.stringify(n);
    for (const x of ["SAMPLE PERSON", "Sample Person", "sample@example.com", "0400000000", "062000", "12345678", "1990-01-01", "Sample\""])
      expect(s).not.toContain(x);
  });
  it("extracts lender names, keeping status only when active or settled", () => {
    expect(n.lenders.sacc).toEqual([{ provider: "Lender A", status: null }, { provider: "Lender B", status: "settled" }]);
    expect(n.lenders.nonSacc).toEqual(["Lender C"]);
    expect(n.lenders.wageAdvance).toEqual(["Advance D", "Advance E"]);
  });
  it("then sanitise strips the LENDER_ONLY and NEVER_DISPLAY metrics themselves", () => {
    const codes = sanitiseBankStatement(n).metrics.map((m) => m.code);
    expect(codes).not.toContain("AM2049");
    expect(codes).not.toContain("AM2106");
    expect(codes).not.toContain("AM2093");
    expect(codes).toContain("AM2045");
    expect(JSON.stringify(sanitiseBankStatement(n))).not.toContain("defaults");
  });
});

describe("AEST", () => {
  it("displays times in AEST whatever the source offset", () => {
    expect(formatUpdated("2026-09-25 09:14:03")).toBe("Updated Fri 25/09, 9:14am"); // no offset: taken as AEST
    expect(formatUpdated("2026-10-14T10:59:39+11:00")).toBe("Updated Wed 14/10, 9:59am");
    expect(formatUpdated("2026-09-30T02:37:56.347Z")).toBe("Updated Wed 30/09, 12:37pm");
    expect(toAESTDate("2026-09-30")).toBe("2026-09-30");
  });
});
