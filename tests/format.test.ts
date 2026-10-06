import { describe, expect, it } from "vitest";
import {
  addDays, daysBetween, formatAUD, formatCents, formatDate, formatFactor, formatPercent, formatRelativeDays,
  formatShortDay, formatUpdated, formatWhole, sumMoney, weekday,
} from "@/lib/format";

describe("AUD", () => {
  it("formats whole dollars for headlines", () => {
    expect(formatWhole(1831.95)).toBe("$1,832");
    expect(formatWhole(2482.52)).toBe("$2,483");
    expect(formatWhole(0)).toBe("$0");
  });
  it("formats cents for transaction lists", () => {
    expect(formatCents(1831.95)).toBe("$1,831.95");
    expect(formatCents(4.49)).toBe("$4.49");
    expect(formatCents(1234567.8)).toBe("$1,234,567.80");
  });
  it("uses a true minus sign for negatives", () => {
    expect(formatAUD(-52.69)).toBe("−$53");
    expect(formatCents(-9.54)).toBe("−$9.54");
    expect(formatAUD(-0.4)).toBe("$0");
  });
  it("sums money without float drift", () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([314.31, -367])).toBe(-52.69);
  });
  it("formats percentages and factors", () => {
    expect(formatPercent(16.52)).toBe("16.5%");
    expect(formatPercent(21.41, 0)).toBe("21%");
    expect(formatPercent(16.0)).toBe("16%");
    expect(formatFactor(2.9)).toBe("2.9 / 10");
    expect(formatFactor(10)).toBe("10.0 / 10");
  });
});

describe("dates", () => {
  it("formats DD/MM/YYYY", () => {
    expect(formatDate("2026-09-25")).toBe("25/09/2026");
    expect(formatDate("2026-11-10")).toBe("10/11/2026");
  });
  it("gets weekdays right (the prompt pack had these wrong)", () => {
    expect(weekday("2026-09-25")).toBe("Fri");
    expect(weekday("2026-09-26")).toBe("Sat");
    expect(weekday("2026-09-30")).toBe("Wed");
    expect(weekday("2026-10-01")).toBe("Thu");
    expect(formatShortDay("2026-10-01")).toBe("Thu 01/10");
  });
  it("does calendar-day maths across month ends", () => {
    expect(daysBetween("2026-09-25", "2026-10-01")).toBe(6);
    expect(addDays("2026-08-12", 90)).toBe("2026-11-10");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("formats relative days and the freshness line", () => {
    expect(formatRelativeDays("2026-09-25", "2026-09-25")).toBe("today");
    expect(formatRelativeDays("2026-09-25", "2026-10-01")).toBe("in 6 days");
    expect(formatRelativeDays("2026-09-25", "2026-09-22")).toBe("3 days ago");
    expect(formatUpdated("2026-09-25 09:14:03")).toBe("Updated Fri 25/09, 9:14am");
    expect(formatUpdated("2026-09-25 12:05:00")).toBe("Updated Fri 25/09, 12:05pm");
    expect(formatUpdated("2026-09-25 00:30:00")).toBe("Updated Fri 25/09, 12:30am");
  });
});
