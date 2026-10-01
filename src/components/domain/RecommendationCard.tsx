"use client";
// Component 14 (pack behaviour): one specific step attached to a factor, its dollar impact as a fact,
// one action, "Not relevant to me" (hides for this pay cycle) and snooze. Neither changes the score.
import { BanknoteArrowDown, ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { recommendation as t, ui } from "@/content/components";
import { recs } from "@/content/recommendations";
import { Button } from "@/components/ui/Button";

export interface RecommendationItem { id: string; factor: string; title: string; rationale: string; impact?: string | null; icon?: LucideIcon; action?: { label: string; href: string } }

export function RecommendationCard({ item, snoozed, dismissed, onSeeHow, onSnooze, onUndoSnooze, onDismiss, onUndoDismiss }: {
  item: RecommendationItem; snoozed?: boolean; dismissed?: boolean;
  onSeeHow?: () => void; onSnooze?: () => void; onUndoSnooze?: () => void; onDismiss?: () => void; onUndoDismiss?: () => void;
}) {
  if (dismissed || snoozed) {
    return (
      <div className="flex min-h-[68px] items-center gap-t3 rounded-sm bg-neutral-soft p-t4">
        <p className="flex-1 text-small text-text">{item.title}. {dismissed ? recs.hidden : recs.snoozed}</p>
        <button type="button" onClick={dismissed ? onUndoDismiss : onUndoSnooze} className="min-h-tap rounded-sm px-t2 text-small text-accent hover:bg-surface2">{ui.undo}</button>
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
      {item.impact && (
        <p className="mt-t4 rounded-sm bg-surface2 p-t3 text-small text-text"><span className="text-caption text-text-muted">{recs.wouldChange}: </span>{item.impact}</p>
      )}
      <Button full className="mt-t5" onClick={onSeeHow}>{t.seeHow}</Button>
      {item.action && (
        <Link href={item.action.href} className="mt-t2 flex min-h-tap items-center justify-between rounded-sm px-t1 text-small text-accent hover:bg-surface2">
          {item.action.label}<ChevronRight aria-hidden size={20} />
        </Link>
      )}
      <div className="mt-t1 flex flex-wrap gap-t2">
        {onSnooze && <Button variant="tertiary" onClick={onSnooze} className="text-small">{recs.snooze}</Button>}
        {onDismiss && <Button variant="tertiary" onClick={onDismiss} className="text-small">{recs.notRelevant}</Button>}
      </div>
    </article>
  );
}
