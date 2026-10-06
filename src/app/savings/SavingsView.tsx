"use client";
import { useEffect, useState } from "react";
import type { Recommendation } from "@/lib/selectors/recommendations";
import { recs } from "@/content/recommendations";
import { RecommendationCard } from "@/components/domain/RecommendationCard";
import { factorIcons } from "@/components/domain/ScoreParts";
import { InsightSheetBody } from "@/components/domain/Insight";
import { EmptyState } from "@/components/ui/Feedback";
import { Sheet } from "@/components/ui/Sheet";

type Pref = "hidden" | "snoozed";
const KEY = "tippla-recs";

// Preferences per pay cycle (key = persona:cycleStart), so "this pay cycle" resets on the next one.
function load(cycle: string): Record<string, Pref> {
  try { return (JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, Record<string, Pref>>)[cycle] ?? {}; } catch { return {}; }
}
function save(cycle: string, prefs: Record<string, Pref>) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, Record<string, Pref>>;
    all[cycle] = prefs;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* preferences last for this visit only */ }
}

export function SavingsView({ items, cycleKey }: { items: Recommendation[]; cycleKey: string }) {
  const [prefs, setPrefs] = useState<Record<string, Pref>>({});
  const [open, setOpen] = useState<Recommendation | null>(null);
  useEffect(() => setPrefs(load(cycleKey)), [cycleKey]);
  const set = (id: string, p: Pref | null) => {
    const next = { ...prefs };
    if (p) next[id] = p; else delete next[id];
    setPrefs(next);
    save(cycleKey, next);
  };
  if (!items.length) return <div className="mt-t4"><EmptyState variant="noRecommendations" onAction={() => (window.location.href = "/score")} /></div>;
  return (
    <>
      <ul className="mt-t3 flex flex-col gap-t3">
        {items.map((r) => (
          <li key={r.id}>
            <RecommendationCard
              item={{ id: r.id, factor: r.factor, title: r.title, rationale: r.why, impact: r.impact, icon: factorIcons[r.factorKey], action: r.action }}
              dismissed={prefs[r.id] === "hidden"} snoozed={prefs[r.id] === "snoozed"}
              onSeeHow={() => setOpen(r)} onSnooze={() => set(r.id, "snoozed")} onDismiss={() => set(r.id, "hidden")}
              onUndoSnooze={() => set(r.id, null)} onUndoDismiss={() => set(r.id, null)}
            />
          </li>
        ))}
      </ul>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ""}>
        {open && <InsightSheetBody item={{ id: open.id, context: open.factor, title: open.title, summary: open.why, happening: open.sheet.happening, wouldChange: open.sheet.wouldChange, ifYouWant: open.sheet.ifYouWant }} />}
      </Sheet>
      <span className="sr-only">{recs.hiddenCount(Object.values(prefs).filter((p) => p === "hidden").length)}</span>
    </>
  );
}
