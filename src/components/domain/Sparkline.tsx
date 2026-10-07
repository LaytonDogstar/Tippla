// Six-pay-cycle trend line, coloured by direction (UX round 2, 5.3): spend up on last cycle in the caution colour,
// down in the positive colour, flat in neutral; never by category. A faint dashed baseline sits at the previous
// cycle's value so the change can be read. Decorative: the row's text says the change in words.
// Gaps (no data yet) break the line rather than dropping to $0.
export function sparkDirection(values: (number | null)[]): "up" | "down" | "flat" {
  const [prev, last] = values.slice(-2);
  if (prev == null || last == null || Math.round(last) === Math.round(prev)) return "flat";
  return last > prev ? "up" : "down";
}
const STROKE = { up: "var(--color-caution)", down: "var(--color-positive)", flat: "var(--color-icon-muted)" } as const;

export function Sparkline({ values, width = 56, height = 20 }: { values: (number | null)[]; category?: string; width?: number; height?: number }) {
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) return null;
  const max = Math.max(...known), min = Math.min(...known), span = max - min || 1;
  const x = (i: number) => (values.length === 1 ? width / 2 : (i * (width - 4)) / (values.length - 1) + 2);
  const y = (v: number) => height - 3 - ((v - min) / span) * (height - 6);
  const segs: string[][] = [[]];
  values.forEach((v, i) => (v === null ? segs.push([]) : segs[segs.length - 1]!.push(`${x(i).toFixed(1)},${y(v).toFixed(1)}`)));
  const lastI = values.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0).at(-1)!;
  const prev = values[lastI - 1];
  const colour = STROKE[sparkDirection(values)];
  return (
    <svg aria-hidden width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      {prev != null && <line x1={0} x2={width} y1={y(prev)} y2={y(prev)} stroke="var(--color-icon-muted)" strokeWidth={1} strokeDasharray="2 2" opacity={0.6} />}
      {segs.filter((s) => s.length > 1).map((s, k) => (
        <polyline key={k} points={s.join(" ")} fill="none" stroke={colour} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      <circle cx={x(lastI)} cy={y(values[lastI]!)} r={2.6} fill={colour} />
    </svg>
  );
}
