"use client";
// Component 02: ordinal path through four stages (not a 0–1,000 axis). Marker from score-derived progress.
import { ChevronRight } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { STAGES, type StageId } from "@/config/stages";
import { stageNames } from "@/content/en-AU";
import { scoreRing, stageScale } from "@/content/components";
import type { StageInfo } from "@/lib/selectors/score";
import { stageMarkerX } from "@/lib/ui/geometry";
import { cx } from "@/components/ui/cx";

export function StageScale({ score, stage, onStage, onNext }: { score: number; stage: StageInfo; onStage?: (id: StageId) => void; onNext?: () => void }) {
  const strip = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(310);
  useLayoutEffect(() => {
    const el = strip.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const idx = STAGES.findIndex((s) => s.id === stage.stage.id);
  const x = stageMarkerX(w, idx, stage.progress);

  return (
    <section aria-label={stageScale.label} className="min-h-[196px] rounded-md bg-surface p-t5">
      <div className="flex flex-wrap items-baseline justify-between gap-t3">
        <p className="text-h3 text-text">{stage.name}</p>
        <p className="tnum text-h3 font-numeric text-text">{score}</p>
      </div>
      <div ref={strip} className="relative mt-t4">
        <div aria-hidden className="flex gap-t1">
          {STAGES.map((s) => <span key={s.id} className="h-t2 flex-1 rounded-pill" style={{ background: `var(--stage-${s.id})` }} />)}
        </div>
        <span
          aria-hidden
          className="absolute top-1/2 flex h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-pill border-2 border-text bg-surface"
          style={{ left: x }}
        >
          <span className="h-t1 w-t1 rounded-pill bg-text" />
        </span>
      </div>
      <ol className="mt-t3 flex gap-t1">
        {STAGES.map((s) => {
          const current = s.id === stage.stage.id;
          return (
            <li key={s.id} className="flex-1">
              <button
                type="button"
                onClick={() => onStage?.(s.id)}
                aria-current={current ? "step" : undefined}
                aria-label={stageScale.about(stageNames[s.id])}
                className="flex min-h-tap w-full flex-col items-center justify-start rounded-xs pt-t1 hover:bg-surface2 active:bg-surface2"
              >
                <span className={cx("text-caption", current ? "text-text" : "text-text-muted")}>{stageNames[s.id]}</span>
                {current && <span aria-hidden className="mt-t2 h-[2px] w-full max-w-[48px] bg-text" />}
              </button>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={onNext} className="mt-t5 flex min-h-tap w-full items-center gap-t3 rounded-sm text-left hover:bg-surface2">
        <span className="flex-1 text-h2 font-display text-text">
          {stage.next ? scoreRing.toNext(stage.next.pointsToGo, stage.next.name) : stageScale.current}
        </span>
        <ChevronRight aria-hidden size={20} className="text-accent" />
      </button>
    </section>
  );
}
