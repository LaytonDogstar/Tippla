// Spec 05 bank connection health: healthy, stale (no new data for 48 h+), broken (disconnected or a provider
// error), or expiring (the CDR consent ends within 14 days; consents last up to 12 months). Pure.
import type { PersonaData } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import { CONNECTION } from "@/config/flags";
import { addDays, daysBetween, toAEST, type ISODate } from "@/lib/format/dates";
import { lastRefresh } from "./status";

export type ConnectionStatus = "healthy" | "stale" | "broken" | "expiring";
export interface ConnectionHealth {
  status: ConnectionStatus;
  /** The day the latest bank data is from. */
  dataFrom: ISODate;
  hoursOld: number;
  /** Safe to spend pauses rather than guess on data this old. */
  pauseSafeToSpend: boolean;
  consentEndsOn: ISODate | null;
  daysToConsentEnd: number | null;
}

/** CDR consent end: 12 months from when bank-data access was granted (or last renewed). */
export function consentEndsOn(d: PersonaData, a: AccountState = {}): ISODate | null {
  const granted = d.consents.find((c) => c.id === "talefin_bank_data");
  const from = a.bank?.renewedOn ?? (granted?.granted_at ? toAEST(granted.granted_at).date : null);
  if (!from) return null;
  // 29/02 + 12 months is 28/02 in a non-leap year.
  const md = from.slice(5, 10) === "02-29" ? "02-28" : from.slice(5, 10);
  return `${Number(from.slice(0, 4)) + 1}-${md}`;
}

/**
 * `now` is the member's current time; in the mock it's the data date, and the dev state "stale" moves it
 * three days on (the bank stopped sending data). Reconnecting (account.bank.renewedOn) clears it.
 */
export function connectionHealth(d: PersonaData, a: AccountState = {}, states: string[] = [], now?: string): ConnectionHealth {
  const refreshed = lastRefresh(d).at;
  const renewed = a.bank?.renewedOn && a.bank.renewedOn >= d.asOf;
  const at = now ?? (states.includes("stale") && !renewed ? new Date(Date.parse(refreshed) + 80 * 3600e3).toISOString() : refreshed);
  const hoursOld = Math.max(0, Math.round((Date.parse(at) - Date.parse(refreshed)) / 3600e3));
  const ends = consentEndsOn(d, a);
  const today = toAEST(at).date;
  const daysToEnd = ends ? daysBetween(today, ends) : null;
  const broken = !!a.bank?.disconnected || (states.includes("bank_expired") && !renewed);
  const status: ConnectionStatus = broken ? "broken"
    : hoursOld > CONNECTION.staleHours ? "stale"
    : daysToEnd !== null && daysToEnd <= CONNECTION.expiringDays ? "expiring" : "healthy";
  return {
    status, dataFrom: toAEST(refreshed).date, hoursOld,
    pauseSafeToSpend: broken ? false : hoursOld > CONNECTION.pauseHours,
    consentEndsOn: ends, daysToConsentEnd: daysToEnd,
  };
}

/** Push reminders before the consent ends (−14, −3 and 0 days). The day-of one is urgent (outside the cap). */
export function consentReminders(endsOn: ISODate): { date: ISODate; daysLeft: number; priority: "normal" | "high" }[] {
  return CONNECTION.reminderDays.map((n) => ({ date: addDays(endsOn, -n), daysLeft: n, priority: n === 0 ? "high" as const : "normal" as const }));
}
