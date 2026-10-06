import { describe, expect, it } from "vitest";
import { formatCurrencyInput, parseCurrency } from "@/lib/format/currencyInput";

describe("CurrencyInput parsing", () => {
  it("accepts dollars, cents, grouping and a pasted $", () => {
    expect(parseCurrency("300")).toEqual({ ok: true, cents: 30000 });
    expect(parseCurrency("$1,234.5")).toEqual({ ok: true, cents: 123450 });
    expect(parseCurrency(" $ 75.47 ")).toEqual({ ok: true, cents: 7547 });
    expect(parseCurrency(".5")).toEqual({ ok: true, cents: 50 });
    expect(parseCurrency("12,345,678")).toEqual({ ok: true, cents: 1234567800 });
  });
  it("treats empty as null, never zero", () => expect(parseCurrency("  ")).toEqual({ ok: true, cents: null }));
  it("rejects ambiguous formats, extra precision and (by default) negatives", () => {
    expect(parseCurrency("1,23")).toEqual({ ok: false, reason: "format" });
    expect(parseCurrency("12.345")).toEqual({ ok: false, reason: "precision" });
    expect(parseCurrency("abc")).toEqual({ ok: false, reason: "format" });
    expect(parseCurrency("-5")).toEqual({ ok: false, reason: "negative" });
    expect(parseCurrency("-5", { allowNegative: true })).toEqual({ ok: true, cents: -500 });
    expect(parseCurrency(".")).toEqual({ ok: false, reason: "format" });
  });
  it("normalises on blur", () => {
    expect(formatCurrencyInput(123456)).toBe("1,234.56");
    expect(formatCurrencyInput(30000)).toBe("300.00");
  });
});
