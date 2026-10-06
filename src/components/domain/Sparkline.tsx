// Six-pay-cycle trend line in the category colour. Decorative: the row's text carries the numbers.
// Gaps (no data yet) break the line rather than dropping to $0.
import { catVar } from "@/components/icons";

export function Sparkline({ values, category, width = 56, height = 20 }: { values: (number | null)[]; category: string; width?: number; height?: number }) {
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) return null;
  const max = Math.max(...known), min = Math.min(...known), span = max - min || 1;
  const x = (i: number) => (values.length === 1 ? width / 2 : (i * (width - 4)) / (values.length - 1) + 2);
  const y = (v: number) => height - 3 - ((v - min) / span) * (height - 6);
  const segs: string[][] = [[]];
  values.forEach((v, i) => (v === null ? segs.push([]) : segs[segs.length - 1]!.push(`${x(i).toFixed(1)},${y(v).toFixed(1)}`)));
  const lastI = values.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0).at(-1)!;
  return (
    <svg aria-hidden width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      {segs.filter((s) => s.length > 1).map((s, k) => (
        <polyline key={k} points={s.join(" ")} fill="none" stroke={catVar(category)} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      <circle cx={x(lastI)} cy={y(values[lastI]!)} r={2.4} fill={catVar(category)} />
    </svg>
  );
}
