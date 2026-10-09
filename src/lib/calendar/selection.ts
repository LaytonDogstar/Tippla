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
