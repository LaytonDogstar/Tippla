"use client";
// Component 05: InsightCard (one at a time, manual pager, no autoplay) and InsightSheet body.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { insight as t, ui } from "@/content/components";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Feedback";

export interface InsightItem {
  id: string;
  context: string; // e.g. "Current borrowing"
  title: string;
  summary: string;
  happening: string;
  wouldChange?: string;
  ifYouWant?: string;
}

export function InsightCard({ items, loading, onOpen, onDismissUndo, dismissed }: {
  items: InsightItem[]; loading?: boolean; onOpen?: (id: string) => void; dismissed?: boolean; onDismissUndo?: () => void;
}) {
  const [i, setI] = useState(0);
  const status = useRef<HTMLSpanElement>(null);
  if (dismissed) {
    return (
      <div className="flex min-h-[64px] items-center gap-t3 rounded-sm bg-neutral-soft p-t5">
        <p className="flex-1 text-small text-text">{t.hidden}</p>
        <button type="button" onClick={onDismissUndo} className="min-h-tap rounded-sm px-t2 text-small text-accent hover:bg-surface2">{ui.undo}</button>
      </div>
    );
  }
  if (loading) {
    return (
      <section aria-busy="true" className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card sm:p-t6">
        <Skeleton className="h-t3 w-24" />
        <Skeleton className="mt-t5 h-t5 w-3/4" />
        <Skeleton className="mt-t4 h-t3 w-full" />
        <p role="status" className="mt-t4 text-small text-text-muted">{t.loading}</p>
      </section>
    );
  }
  if (!items.length) return <section className="min-h-[88px] rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card sm:p-t6"><p className="text-small text-text">{t.empty}</p></section>;
  const idx = Math.min(i, items.length - 1);
  const item = items[idx]!;
  const go = (n: number) => { setI(n); if (status.current) status.current.textContent = ui.pageOf(n + 1, items.length); };
  return (
    <section aria-label={t.pagerLabel} className="rounded-card-s bg-accent-soft p-t5 sm:rounded-card sm:p-t6">
      <div className="flex flex-wrap items-center justify-between gap-t2">
        <p className="text-caption text-text-muted">{item.context}</p>
        {items.length > 1 && (
          <div className="flex h-tap items-center rounded-sm bg-surface">
            <button type="button" aria-label={ui.previous} disabled={idx === 0} onClick={() => go(idx - 1)}
              className="inline-flex h-tap w-tap items-center justify-center rounded-sm text-accent disabled:bg-surface2 disabled:text-text-muted">
              <ChevronLeft aria-hidden size={20} />
            </button>
            <span className="tnum w-tap text-center text-caption text-text">{ui.pageOf(idx + 1, items.length)}</span>
            <button type="button" aria-label={ui.next} disabled={idx === items.length - 1} onClick={() => go(idx + 1)}
              className="inline-flex h-tap w-tap items-center justify-center rounded-sm text-accent disabled:bg-surface2 disabled:text-text-muted">
              <ChevronRight aria-hidden size={20} />
            </button>
          </div>
        )}
      </div>
      <span ref={status} role="status" className="sr-only" />
      <h2 className="mt-t5 text-h2 font-display text-text">{item.title}</h2>
      <p className="mt-t4 text-small text-text-muted">{item.summary}</p>
      <Button full className="mt-t5" onClick={() => onOpen?.(item.id)}>{t.seeHow}</Button>
    </section>
  );
}

/** Body of the InsightSheet (put inside <Sheet>). Blocks: What's happening · What it would change · If you want them. */
export function InsightSheetBody({ item }: { item: InsightItem }) {
  return (
    <div className="flex flex-col gap-t6">
      <section>
        <h3 className="text-h3 text-text">{t.whatsHappening}</h3>
        <p className="mt-t2 text-body text-text-muted">{item.happening}</p>
      </section>
      {item.wouldChange && (
        <section>
          <h3 className="text-h3 text-text">{t.whatItWouldChange}</h3>
          <p className="mt-t2 text-body text-text-muted">{item.wouldChange}</p>
        </section>
      )}
      {item.ifYouWant && (
        <section>
          <h3 className="text-h3 text-text">{t.ifYouWant}</h3>
          <p className="mt-t2 text-body text-text-muted">{item.ifYouWant}</p>
        </section>
      )}
    </div>
  );
}
