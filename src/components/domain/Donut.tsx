"use client";
// Component 07. Charts are controls: tap a slice or legend row to select (filters below); tap again clears.
// Non-selected fills use the contrast-safe dimmed colours (--cat-dim-*), never whole-SVG opacity.
import { Check } from "lucide-react";
import { donut as t } from "@/content/components";
import { formatPercent, formatWhole } from "@/lib/format";
import type { CategoryRow, SpendCategory } from "@/lib/selectors/spending";
import { annulusPath, donutSectors } from "@/lib/ui/geometry";
import { catVar } from "@/components/icons";
import { FilterChip } from "@/components/ui/Chips";
import { cx } from "@/components/ui/cx";

const SIZE = 250, C = SIZE / 2, RO = 120, RI = 80;

export function Donut({ rows, total, periodLabel, selected, onSelect, loading, legend = true }: {
  /** false when full-size category rows follow (they are the precise-access alternative). */
  legend?: boolean;
  rows: CategoryRow[]; total: number; periodLabel: string; selected: SpendCategory | null; onSelect: (c: SpendCategory | null) => void; loading?: boolean;
}) {
  if (loading) {
    return (
      <section aria-busy="true" className="rounded-lg bg-surface p-t5">
        <h2 className="text-h3 text-text">{t.heading}</h2>
        <svg aria-hidden width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto mt-t4 block">
          <circle cx={C} cy={C} r={(RO + RI) / 2} fill="none" stroke="var(--chart-ring-track)" strokeWidth={RO - RI} />
        </svg>
        <p role="status" className="mt-t2 text-center text-small text-text-muted">{t.loading}</p>
      </section>
    );
  }
  if (!rows.length || total <= 0) {
    return <section className="rounded-lg bg-surface p-t5"><h2 className="text-h3 text-text">{t.heading}</h2><p className="mt-t3 text-small text-text">{t.empty}</p></section>;
  }
  const sectors = donutSectors(rows.map((r) => ({ key: r.category, value: r.total })));
  const sel = selected ? rows.find((r) => r.category === selected) : null;
  const toggle = (c: SpendCategory) => onSelect(selected === c ? null : c);

  return (
    <section className="rounded-lg bg-surface p-t5">
      <h2 className="text-h3 text-text">{t.heading}</h2>
      <div className="relative mx-auto mt-t4" style={{ width: SIZE, height: SIZE }}>
        <svg role="img" aria-label={t.summary(formatWhole(total), rows[0]!.name)} width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {sectors.map((s) => {
            const isSel = s.key === selected;
            const d = annulusPath(C, C, RO, RI, s.start, s.end);
            return (
              <g key={s.key}>
                <path
                  d={d}
                  fill={selected && !isSel ? catVar(s.key, true) : catVar(s.key)}
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                  className="cursor-pointer transition-[fill] duration-base ease-tippla"
                  onClick={() => toggle(s.key as SpendCategory)}
                />
                {isSel && (
                  <path d={annulusPath(C, C, RO + 4, RI - 4, s.start, s.end)} fill="none" stroke="var(--color-text)" strokeWidth={2} pointerEvents="none" />
                )}
              </g>
            );
          })}
        </svg>
        <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-t6 text-center">
          {sel ? (
            <>
              <span className="max-w-[144px] text-small text-text">{sel.name}</span>
              <span className="tnum mt-t1 text-figure-l font-numeric text-text">{formatWhole(sel.total)}</span>
              <span className="mt-t1 text-caption text-text-muted">{t.shareOf(formatPercent((sel.total / total) * 100, 0))}</span>
            </>
          ) : (
            <>
              <span className="text-caption text-text-muted">{t.centreLabel}</span>
              <span className="tnum mt-t1 text-figure-l font-numeric text-text">{formatWhole(total)}</span>
              <span className="mt-t1 text-caption text-text-muted">{periodLabel}</span>
            </>
          )}
        </div>
      </div>
      {sel && <div className="mt-t4"><FilterChip label={sel.name} onRemove={() => onSelect(null)} /></div>}
      {legend && <ul className="mt-t4">
        {rows.map((r) => {
          const isSel = r.category === selected;
          return (
            <li key={r.category}>
              <button
                type="button"
                aria-pressed={isSel}
                onClick={() => toggle(r.category)}
                className={cx("flex min-h-tap w-full items-center gap-t4 rounded-sm px-t2 text-left hover:bg-surface2", isSel && "shadow-[inset_0_0_0_2px_var(--color-accent)]")}
              >
                <span aria-hidden className="h-t3 w-t3 shrink-0 rounded-pill" style={{ background: catVar(r.category) }} />
                <span className="flex-1 text-small text-text">{r.name}</span>
                {isSel && <Check aria-hidden size={16} className="text-accent" />}
                <span className="tnum text-caption text-text-muted">{formatWhole(r.total)}</span>
              </button>
            </li>
          );
        })}
      </ul>}
    </section>
  );
}
