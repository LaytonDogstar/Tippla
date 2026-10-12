// Calendar selection (09/10/2026), as a pure reducer so every way of choosing days is testable: a click (or Enter /
// Space) picks a day; a mouse drag picks a run of days; Shift-click extends from the last anchor; "Select range"
// (for touch) takes a start tap then an end tap; the quick buttons set a range outright.
import type { ISODate } from "@/lib/format/dates";

export interface Selection {
  start: ISODate;
  end: ISODate;
  /** Where Shift-click and dragging extend from. */
  anchor: ISODate;
  dragging: boolean;
  /** "Select range" is on: the next tap is a start (pendingStart null) or an end. */
  rangeMode: boolean;
  pendingStart: ISODate | null;
}

export type SelectionAction =
  /** A day pressed: mouse down (drag: true), or a tap / Enter / Space (drag: false). */
  | { type: "press"; date: ISODate; shift?: boolean; drag?: boolean }
  /** The pointer moves onto a day while the mouse is held. */
  | { type: "enter"; date: ISODate }
  | { type: "release" }
  | { type: "toggleRange" }
  | { type: "set"; start: ISODate; end: ISODate };

export const initialSelection = (start: ISODate, end: ISODate = start): Selection =>
  ({ start, end, anchor: start, dragging: false, rangeMode: false, pendingStart: null });

export function select(s: Selection, a: SelectionAction): Selection {
  switch (a.type) {
    case "press":
      if (a.shift) return { ...s, start: s.anchor, end: a.date, dragging: false };
      if (s.rangeMode) {
        return s.pendingStart === null
          ? { ...s, pendingStart: a.date, start: a.date, end: a.date, anchor: a.date }
          : { ...initialSelection(s.pendingStart, a.date) };
      }
      return { ...s, start: a.date, end: a.date, anchor: a.date, dragging: !!a.drag };
    case "enter":
      return s.dragging ? { ...s, start: s.anchor, end: a.date } : s;
    case "release":
      return s.dragging ? { ...s, dragging: false } : s;
    case "toggleRange":
      return { ...s, rangeMode: !s.rangeMode, pendingStart: null, dragging: false };
    case "set":
      return initialSelection(a.start, a.end);
  }
}

/** The selection in date order. */
export const bounds = (s: Selection): [ISODate, ISODate] => (s.start <= s.end ? [s.start, s.end] : [s.end, s.start]);
export const isSelected = (s: Selection, date: ISODate) => { const [lo, hi] = bounds(s); return date >= lo && date <= hi; };

// ---- The URL (journeys brief A1: filters and selections live in the URL) ------------------------------------------

const isDay = (v?: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isMonth = (v?: string | null): v is string => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const monthOf = (d: ISODate) => d.slice(0, 7);
const addDaysIso = (d: ISODate, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export type CalendarSearch = { day?: string; from?: string; to?: string; month?: string; offset?: string };

/**
 * The month and selection a calendar URL opens on: ?day= (one day), ?from=&to= (a range, clipped to the days the
 * calendar has), ?month=, the legacy ?offset= (pay cycles from this one), else today. `dates` is every calendar day.
 */
export function calendarInitial(q: CalendarSearch, dates: ISODate[], asOf: ISODate, cycleStart: ISODate): { month: string; start: ISODate; end: ISODate } {
  const first = dates[0]!, last = dates.at(-1)!;
  const min = monthOf(first), max = monthOf(last);
  const clamp = (m: string) => (m < min ? min : m > max ? max : m);
  const day = isDay(q.day) && dates.includes(q.day) ? q.day : null;
  const within = (v: string) => v >= first && v <= last;
  const span = !day && isDay(q.from) && isDay(q.to) && q.from <= q.to ? [within(q.from) ? q.from : first, within(q.to) ? q.to : last] as const : null;
  const legacy = !day && !span && !isMonth(q.month) && q.offset ? addDaysIso(cycleStart, 14 * (Number(q.offset) || 0)) : null;
  const month = clamp(day ? monthOf(day) : span ? monthOf(span[0]) : isMonth(q.month) ? q.month : legacy ? monthOf(legacy) : monthOf(asOf));
  const inMonth = dates.filter((d) => monthOf(d) === month);
  if (day) return { month, start: day, end: day };
  if (span) return { month, start: span[0], end: span[1] };
  if (monthOf(asOf) === month) return { month, start: asOf, end: asOf };
  return { month, start: inMonth[0] ?? asOf, end: inMonth.at(-1) ?? asOf };
}

/** The URL for a calendar view: the month, then a single day as ?day= or a range as ?from=&to=. */
export function calendarSearch(current: URLSearchParams, month: string, lo: ISODate, hi: ISODate): URLSearchParams {
  const u = new URLSearchParams(current);
  for (const k of ["view", "offset", "focus", "day", "from", "to"]) u.delete(k);
  u.set("month", month);
  if (lo === hi) u.set("day", lo); else { u.set("from", lo); u.set("to", hi); }
  return u;
}
