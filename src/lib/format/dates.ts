// Calendar-date helpers. Fixture dates are plain YYYY-MM-DD Australian local dates: treat them as
// calendar days (UTC maths), never through the runtime's local timezone.
const DAY_MS = 86_400_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type ISODate = string; // YYYY-MM-DD

export function toUTC(d: ISODate): number {
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) throw new Error(`Bad date: ${d}`);
  return Date.UTC(y, m - 1, day);
}
export const fromUTC = (ms: number): ISODate => new Date(ms).toISOString().slice(0, 10);
export const addDays = (d: ISODate, n: number): ISODate => fromUTC(toUTC(d) + n * DAY_MS);
/** Whole calendar days from a to b (b − a). */
export const daysBetween = (a: ISODate, b: ISODate): number => Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
export const weekday = (d: ISODate): (typeof WEEKDAYS)[number] => WEEKDAYS[new Date(toUTC(d)).getUTCDay()]!;
export const inRange = (d: ISODate, start: ISODate, end: ISODate) => d >= start && d <= end;

/** 25/09/2026 */
export function formatDate(d: ISODate): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
/** 25/09 */
export function formatDayMonth(d: ISODate): string {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}
/** Fri 25/09 — compact UI */
export const formatShortDay = (d: ISODate): string => `${weekday(d)} ${formatDayMonth(d)}`;

/** "today", "tomorrow", "in 6 days", "yesterday", "3 days ago" */
export function formatRelativeDays(from: ISODate, to: ISODate): string {
  const n = daysBetween(from, to);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

/**
 * "Updated Fri 25/09, 9:14am". TaleFin's SCORED_DATETIME has no timezone; the fixtures hold
 * Australian local time. Confirm TaleFin's timezone before production (convert to AEST/AEDT then).
 */
export function formatUpdated(datetime: string): string {
  const [date, time = "00:00"] = datetime.split(" ");
  const [hh = 0, mm = 0] = time.split(":").map(Number);
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `Updated ${formatShortDay(date!)}, ${h12}:${String(mm).padStart(2, "0")}${hh < 12 ? "am" : "pm"}`;
}

/** Month key "2026-09" → "Sep" */
export function formatMonthShort(month: string): string {
  const m = Number(month.split("-")[1]);
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1] ?? month;
}
export function formatMonthLong(month: string): string {
  const m = Number(month.split("-")[1]);
  return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m - 1] ?? month;
}
