import type { ArrayMetricValue, PersonaData } from "@/lib/api/types";
import { metric } from "@/lib/dataUse";
import { daysBetween, weekday } from "@/lib/format/dates";

/**
 * Monthly income = AM2072 .90.monthly_mean_amount. Never the 30-day sum: for fortnightly pay,
 * 30 days holds two or three pays (docs/06 correction 1).
 */
export function monthlyIncome(d: PersonaData): { amount: number; basedOnDays: number } {
  const v = metric<ArrayMetricValue>(d.bankStatement, "AM2072")["90"];
  return { amount: v?.monthly_mean_amount ?? 0, basedOnDays: Math.min(90, d.profile.data_days) };
}

export function incomeSources(d: PersonaData) {
  const wages = metric<ArrayMetricValue>(d.bankStatement, "AM2001")["90"];
  const centrelink = metric<ArrayMetricValue>(d.bankStatement, "AM2002")["90"];
  return {
    wagesMonthly: wages?.monthly_mean_amount ?? 0,
    centrelinkMonthly: centrelink?.monthly_mean_amount ?? 0,
    employer: titleCase(metric<string>(d.bankStatement, "AM2163")),
    primaryType: metric<string>(d.bankStatement, "AM2101"),
    nextPayDate: metric<string>(d.bankStatement, "AM2077"),
  };
}

/** Typical pay and pattern from wage transactions: "about $1,960 every second Thursday". */
export function payPattern(d: PersonaData): { typicalAmount: number; everyDays: number | null; weekday: string | null; count: number } {
  const wages = d.transactions.filter((t) => t.status === "posted" && t.subcategory === "wages").sort((a, b) => a.date.localeCompare(b.date));
  const recent = wages.slice(-6);
  const typical = recent.length ? Math.round(recent.reduce((a, t) => a + t.amount, 0) / recent.length / 10) * 10 : 0;
  const gaps = recent.slice(1).map((t, i) => daysBetween(recent[i]!.date, t.date));
  const every = gaps.length && gaps.every((g) => g === gaps[0]) ? gaps[0]! : null;
  const last = recent.at(-1);
  return { typicalAmount: typical, everyDays: every, weekday: last ? weekday(last.date) : null, count: wages.length };
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
