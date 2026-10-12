// Per-pay-cycle preferences in the browser (key = persona:cycleStart), so "this pay cycle" resets on the next one:
// cards hidden until the next pay cycle or for good ("Not relevant to me"), and smaller wins ticked off. Shared by
// the money plan's cards and its smaller wins (the storage the old plan page's step cards used).
export type CyclePref = "hidden" | "snoozed" | "done";
const KEY = "tippla-recs";

export function loadCyclePrefs(cycle: string): Record<string, CyclePref> {
  try { return (JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, Record<string, CyclePref>>)[cycle] ?? {}; } catch { return {}; }
}

export function saveCyclePrefs(cycle: string, prefs: Record<string, CyclePref>) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, Record<string, CyclePref>>;
    all[cycle] = prefs;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* preferences last for this visit only */ }
}
