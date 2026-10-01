// Component 01. Shows progress to the NEXT stage boundary (the dominant visual), number inside.
// Precedence: override/unavailable → loading → not enough history → normal.
import { Info } from "lucide-react";
import { scoreRing } from "@/content/components";
import type { ScoreState } from "@/lib/selectors/score";
import { ringGeometry } from "@/lib/ui/geometry";
import { cx } from "@/components/ui/cx";

export type RingSize = "hero" | "medium" | "small";
const dims: Record<RingSize, { d: number; s: number; disc: number }> = {
  hero: { d: 200, s: 12, disc: 48 },
  medium: { d: 112, s: 8, disc: 40 },
  small: { d: 48, s: 4, disc: 40 },
};

export interface ScoreRingProps {
  state: ScoreState;
  size?: RingSize;
  /** Brand gradient host (hero only): white arc on the light Building track. */
  brand?: boolean;
  loading?: boolean;
  onSeeDetails?: () => void;
}

export function ScoreRing({ state, size = "hero", brand = false, loading, onSeeDetails }: ScoreRingProps) {
  const { d, s, disc } = dims[size];
  const box = { width: d, height: d };

  if (state.kind === "unavailable" || (state.kind === "override" && state.override !== "thin_file")) {
    return (
      <div className="flex flex-col items-center gap-t2 text-center">
        <div className="flex items-center justify-center" style={box}>
          <span className="inline-flex items-center justify-center rounded-pill bg-neutral-soft text-neutral" style={{ width: disc, height: disc }}>
            <Info aria-hidden size={24} />
          </span>
        </div>
        <p className="text-small text-text">{scoreRing.override}</p>
        {onSeeDetails && (
          <button type="button" onClick={onSeeDetails} className="min-h-tap rounded-sm px-t2 text-small text-accent hover:bg-surface2">{scoreRing.seeDetails}</button>
        )}
      </div>
    );
  }

  if (loading) {
    const g = ringGeometry(d, s, 0);
    return (
      <div aria-busy="true" className="flex flex-col items-center gap-t2">
        <div className="relative" style={box}>
          <svg aria-hidden width={d} height={d} viewBox={`0 0 ${d} ${d}`}>
            <circle cx={d / 2} cy={d / 2} r={g.r} fill="none" stroke="var(--chart-ring-track)" strokeWidth={s} />
          </svg>
          {size !== "small" && <span aria-hidden className="absolute left-1/2 top-1/2 h-t4 w-[56px] -translate-x-1/2 -translate-y-1/2 rounded-xs bg-surface2" />}
        </div>
        <p role="status" className="text-small text-text-muted">{scoreRing.loading}</p>
      </div>
    );
  }

  if (state.kind === "override") {
    // Thin file: insufficient history, not a poor result. No meter, no zero.
    return (
      <div className="flex flex-col items-center gap-t2 text-center">
        <div className="flex items-center justify-center" style={box}>
          <span className="inline-flex items-center justify-center rounded-pill bg-neutral-soft text-neutral" style={{ width: disc, height: disc }}>
            <Info aria-hidden size={24} />
          </span>
        </div>
        <p className="text-small text-text">{scoreRing.nullState}</p>
      </div>
    );
  }

  const { score, stage } = state;
  const g = ringGeometry(d, s, stage.progress);
  const arc = brand ? "var(--brand-on)" : `var(--stage-${stage.stage.id})`;
  const track = brand ? "var(--brand-track)" : "var(--chart-ring-track)";
  const ink = brand ? "text-brand-on" : "text-text";
  const muted = brand ? "text-brand-on" : "text-text-muted";
  const valueText = scoreRing.meterText(score, stage.name, stage.next?.pointsToGo ?? null, stage.next?.name ?? null);

  const ring = (
    <svg aria-hidden width={d} height={d} viewBox={`0 0 ${d} ${d}`} className="shrink-0">
      <circle cx={d / 2} cy={d / 2} r={g.r} fill="none" stroke={track} strokeWidth={s} />
      {!g.hideArc && (
        <circle
          cx={d / 2} cy={d / 2} r={g.r} fill="none" stroke={arc} strokeWidth={s} strokeLinecap="round"
          strokeDasharray={`${g.dash} ${g.circumference}`} transform={`rotate(-90 ${d / 2} ${d / 2})`}
        />
      )}
    </svg>
  );

  const meterProps = {
    role: "meter" as const,
    "aria-valuemin": stage.stage.min,
    "aria-valuemax": stage.next?.at ?? 1000,
    "aria-valuenow": score,
    "aria-valuetext": valueText,
    "aria-label": "SmartScore",
  };

  if (size === "small") {
    return (
      <div {...meterProps} className="inline-flex flex-col">
        <div className="flex items-center gap-t3">
          {ring}
          <div aria-hidden>
            <p className="tnum text-body-strong text-text">{score}</p>
            <p className="mt-t1 text-small text-text-muted">{stage.name}</p>
          </div>
        </div>
        {stage.next && <p aria-hidden className="mt-t3 text-small text-text">{scoreRing.toNext(stage.next.pointsToGo, stage.next.name)}</p>}
      </div>
    );
  }

  return (
    <div {...meterProps} className="flex flex-col items-center text-center">
      <div className="relative" style={box}>
        {ring}
        <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cx("tnum font-numeric", size === "hero" ? "text-figure-l" : "text-h1", ink)}>{score}</span>
          <span className={cx("text-small", ink)}>{stage.name}</span>
        </div>
      </div>
      {stage.next && (
        <div aria-hidden className={cx(size === "hero" ? "mt-t4" : "mt-t3")}>
          <p className={cx(size === "hero" ? "text-h2 font-display" : "text-h3", ink)}>{scoreRing.toNext(stage.next.pointsToGo, stage.next.name)}</p>
          {size === "hero" && <p className={cx("tnum mt-t2 text-caption", muted)}>{scoreRing.endpoints(stage.stage.min, stage.next.at)}</p>}
        </div>
      )}
    </div>
  );
}
