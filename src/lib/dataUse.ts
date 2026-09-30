// Data-use classes for every TaleFin field the portal knows about (docs/06_data_mapping.md).
// Fail-closed: a metric with no class here is treated as NEVER_DISPLAY and stripped at the API boundary.
import type { BankStatement, Metric } from "@/lib/api/types";

export type DataUseClass = "SHOW" | "SCORE_ONLY" | "LENDER_ONLY" | "INTERNAL" | "NEVER_DISPLAY";

export const DATA_USE = {
  // Income
  AM2072: "SHOW", AM2001: "SHOW", AM2002: "SHOW", AM2012: "SHOW", AM2163: "SHOW", AM2101: "SHOW", AM2077: "SHOW",
  AM2033: "SCORE_ONLY", AM2110: "SCORE_ONLY",
  AM2038: "INTERNAL", AM2021: "INTERNAL", AM2074: "INTERNAL",
  // Spending
  AM2004: "SHOW", AM2008: "SHOW", AM2010: "SHOW", AM2136: "SHOW", AM2151: "SHOW", AM2069: "SHOW",
  AM2003: "SHOW", AM2013: "SHOW", AM2016: "SHOW", AM2020: "SHOW",
  AM2034: "INTERNAL",
  // Gambling (deposits, gross). Inferred gambling is never shown as gambling.
  AM2005: "SHOW", AM2023: "SCORE_ONLY", AM2031: "SCORE_ONLY",
  AM2015: "INTERNAL", AM2075: "INTERNAL", AM2043: "INTERNAL",
  AM2134: "NEVER_DISPLAY",
  // Loans and credit
  AM2025: "INTERNAL", AM2026: "INTERNAL", AM2027: "INTERNAL",
  AM2172: "SHOW", AM2173: "SHOW", AM2174: "SHOW", AM2175: "SHOW", AM2024: "SHOW", AM2132: "SHOW",
  AM2022: "SHOW", AM2055: "SHOW", AM2056: "SHOW", AM2156: "SHOW", AM2158: "SHOW",
  AM2117: "SHOW", AM2120: "SHOW", AM2123: "SHOW", AM2138: "SHOW", AM2139: "SHOW", AM2128: "SHOW", AM2080: "SHOW",
  AM2048: "SCORE_ONLY", AM2137: "SCORE_ONLY",
  AM2050: "SHOW", AM2051: "SHOW", AM2052: "SHOW", AM2053: "SHOW", AM2054: "SHOW", AM2057: "SHOW",
  // Dishonours (shown as plain facts)
  AM2011: "SHOW", AM2029: "SHOW", AM2058: "SHOW", AM2059: "SHOW", AM2071: "SHOW", AM2084: "SHOW", AM2088: "SHOW",
  AM2032: "SCORE_ONLY", AM2085: "SCORE_ONLY",
  // Loan status (Q11)
  AM2049: "LENDER_ONLY", AM2105: "LENDER_ONLY", AM2106: "LENDER_ONLY", AM2107: "LENDER_ONLY", AM2125: "LENDER_ONLY", AM2126: "LENDER_ONLY",
  // Balances
  AM2068: "SHOW", AM2161: "SHOW", AM2019: "SHOW", AM2177: "SHOW", AM2066: "SHOW",
  // Sensitive inferences: never displayed, never logged, never in a lender package (Q11)
  AM2091: "NEVER_DISPLAY", AM2063: "NEVER_DISPLAY", AM2017: "NEVER_DISPLAY", AM2018: "NEVER_DISPLAY",
  AM2064: "NEVER_DISPLAY", AM2092: "NEVER_DISPLAY", AM2093: "NEVER_DISPLAY", AM2062: "NEVER_DISPLAY",
} as const satisfies Record<string, DataUseClass>;

type Classes = typeof DATA_USE;
export type MetricCode = keyof Classes;
type CodesOf<C extends DataUseClass> = { [K in MetricCode]: Classes[K] extends C ? K : never }[MetricCode];
/** Codes a selector may turn into customer-facing output. */
export type DisplayCode = CodesOf<"SHOW" | "SCORE_ONLY">;
/** Codes usable in logic only; never put their values in selector output. */
export type InternalCode = CodesOf<"INTERNAL">;

export const classOf = (code: string): DataUseClass =>
  (DATA_USE as Record<string, DataUseClass>)[code] ?? "NEVER_DISPLAY";

export const NEVER_DISPLAY_CODES = (Object.keys(DATA_USE) as MetricCode[]).filter((c) => DATA_USE[c] === "NEVER_DISPLAY");

/** Classes allowed to leave the API layer for the customer portal. */
const CUSTOMER_CLASSES: DataUseClass[] = ["SHOW", "SCORE_ONLY", "INTERNAL"];

/** Strips LENDER_ONLY, NEVER_DISPLAY and unclassified metrics. Called once, in the API client. */
export function sanitiseBankStatement(bs: BankStatement): BankStatement {
  return {
    ...bs,
    metrics: bs.metrics.filter((m) => CUSTOMER_CLASSES.includes(classOf(m.code))),
    // Holder name is INTERNAL (greet with the profile first name); account numbers are already masked.
    profiles: bs.profiles.map((p) => ({ ...p, full_name: "" })),
  };
}

function find<V>(bs: BankStatement, code: string): Metric<V> {
  const m = bs.metrics.find((x) => x.code === code);
  if (!m) throw new Error(`Metric ${code} missing from bank statement`);
  return m as Metric<V>;
}

/** Read a SHOW or SCORE_ONLY metric. The type system rejects other classes. */
export function metric<V>(bs: BankStatement, code: DisplayCode): V {
  return find<V>(bs, code).value;
}

/** Read an INTERNAL metric for logic (thresholds, triggers). Don't surface the value. */
export function internalMetric<V>(bs: BankStatement, code: InternalCode): V {
  return find<V>(bs, code).value;
}
