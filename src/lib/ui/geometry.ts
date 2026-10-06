// Pure geometry for the score ring, stage scale and donut (components.md 01, 02, 07). Unit tested.

/** Ring stroke maths. At exactly zero progress the arc is hidden so a round cap can't read as progress. */
export function ringGeometry(diameter: number, stroke: number, progress: number) {
  const r = (diameter - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return { r, circumference, dash: circumference * p, hideArc: p <= 0 };
}

/** Marker x within the stage strip: segmentStart + clamp(progress) × segmentWidth, allowing for gaps. */
export function stageMarkerX(innerWidth: number, stageIndex: number, progress: number, gap = 4, segments = 4) {
  const seg = (innerWidth - (segments - 1) * gap) / segments;
  return stageIndex * (seg + gap) + Math.min(1, Math.max(0, progress)) * seg;
}

export interface Sector { key: string; value: number; start: number; end: number }

/** Angles (radians, 0 = 12 o'clock, clockwise) from non-negative amounts. No minimum angle. */
export function donutSectors(items: { key: string; value: number }[]): Sector[] {
  const total = items.reduce((a, b) => a + Math.max(0, b.value), 0);
  let a = 0;
  return items.filter((i) => i.value > 0).map((i) => {
    const sweep = total ? (i.value / total) * Math.PI * 2 : 0;
    const s = { key: i.key, value: i.value, start: a, end: a + sweep };
    a += sweep;
    return s;
  });
}

const pt = (cx: number, cy: number, r: number, a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const;

/** SVG path for an annulus sector. */
export function annulusPath(cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number): string {
  if (end - start >= Math.PI * 2 - 1e-9) {
    // Full ring: two half arcs.
    const mid = start + Math.PI;
    return annulusPath(cx, cy, rOuter, rInner, start, mid) + " " + annulusPath(cx, cy, rOuter, rInner, mid, end);
  }
  const large = end - start > Math.PI ? 1 : 0;
  const [x0, y0] = pt(cx, cy, rOuter, start), [x1, y1] = pt(cx, cy, rOuter, end);
  const [x2, y2] = pt(cx, cy, rInner, end), [x3, y3] = pt(cx, cy, rInner, start);
  const f = (n: number) => n.toFixed(3);
  return `M${f(x0)} ${f(y0)}A${rOuter} ${rOuter} 0 ${large} 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${rInner} ${rInner} 0 ${large} 0 ${f(x3)} ${f(y3)}Z`;
}

/** PayCycleHero strip (components.md 04): denominator max(max(balance,0), due); covered min(max(balance,0), due). */
export function coverage(balanceCents: number, dueCents: number) {
  const bal = Math.max(balanceCents, 0);
  const denom = Math.max(bal, dueCents);
  if (denom <= 0) return { covered: 0, remainder: 0, short: false };
  const covered = Math.min(bal, dueCents);
  return { covered: covered / denom, remainder: (denom - covered) / denom, short: balanceCents < dueCents };
}
