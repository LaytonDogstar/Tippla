"use client";
// Component 14: one specific step attached to a factor. Saving/hiding never changes the score.
import { BanknoteArrowDown, type LucideIcon } from "lucide-react";
import { recommendation as t, ui } from "@/content/components";
import { Button } from "@/components/ui/Button";

export interface RecommendationItem { id: string; factor: string; title: string; rationale: string; icon?: LucideIcon }

export function RecommendationCard({ item, saved, dismissed, onSeeHow, onSave, onUnsave, onDismiss, onUndoDismiss }: {
  item: RecommendationItem; saved?: boolean; dismissed?: boolean;
  onSeeHow?: () => void; onSave?: () => void; onUnsave?: () => void; onDismiss?: () => void; onUndoDismiss?: () => void;
}) {
  if (dismissed) {
    return (
      <div className="flex min-h-[68px] items-center gap-t3 rounded-sm bg-neutral-soft p-t4">
        <p className="flex-1 text-small text-text">{t.hidden}</p>
        <button type="button" onClick={onUndoDismiss} className="min-h-tap rounded-sm px-t2 text-small text-accent hover:bg-surface2">{ui.undo}</button>
      </div>
    );
  }
  const Icon = item.icon ?? BanknoteArrowDown;
  return (
    <article className="rounded-md bg-surface p-t5">
      <div className="flex items-center gap-t3">
        <span aria-hidden className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-sm bg-accent-soft text-accent"><Icon size={24} /></span>
        <div>
          <p className="text-caption text-text-muted">{t.eyebrow}</p>
          <p className="text-small text-text">{item.factor}</p>
        </div>
      </div>
      <h3 className="mt-t6 text-h2 font-display text-text">{item.title}</h3>
      <p className="mt-t3 text-small text-text-muted">{item.rationale}</p>
      <Button full className="mt-t5" onClick={onSeeHow}>{t.seeHow}</Button>
      <div className="mt-t2 flex flex-wrap gap-t2">
        {saved ? (
          <p className="flex min-h-tap flex-1 items-center gap-t2 text-small text-text-muted">
            {t.saved}
            <button type="button" onClick={onUnsave} className="min-h-tap rounded-sm px-t2 text-small text-accent hover:bg-surface2">{ui.undo}</button>
          </p>
        ) : (
          <Button variant="tertiary" onClick={onSave} className="text-small">{t.save}</Button>
        )}
        <Button variant="tertiary" onClick={onDismiss} className="text-small">{t.notRelevant}</Button>
      </div>
    </article>
  );
}
