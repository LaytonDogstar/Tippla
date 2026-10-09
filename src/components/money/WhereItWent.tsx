"use client";
// Where it went (Spending v5, 09/10/2026). Fixed costs and Repayments as grey panels that open to what's in them;
// then every everyday category in Essentials and Lifestyle (each with a subtotal), sorted by amount spent, with this
// cycle's amount and the change since the same day of the last cycle (grey unless it passes CHANGE_THRESHOLD).
// Tapping a row opens its panel (B2): three tiles ("Spent so far" on a soft lavender gradient on track, soft amber
// when over) (spent so far, usual by day n, usual full cycle), a status line and
// a detail line chosen by rule, the merchants (tap for their transactions), and actions. Same wording for every
// category, gambling included.
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { spending as s } from "@/content/spending";
import { formatCents, formatShortDay, formatWhole } from "@/lib/format";
import type { CategoryLine, Line, SpendingView } from "@/lib/selectors/spendingCycle";
import type { SpendCategory } from "@/lib/selectors/spending";
import type { ChangeTone } from "@/lib/selectors/today";
import { categoryIcons, catVar } from "@/components/icons";
import { cx } from "@/components/ui/cx";

const t = s.v5.where;
const TONE: Record<ChangeTone, string> = { up: "text-negative", down: "text-positive", neutral: "text-text-muted" };
const GRID = "grid grid-cols-[minmax(0,1fr)_auto_62px_18px] items-center gap-t2 sm:grid-cols-[minmax(0,1fr)_auto_76px_20px] sm:gap-t3";

export function WhereItWent({ v, budgets, onTransaction, onWrongCategory, onSeeAll, onBudget }: {
  v: SpendingView;
  budgets: Partial<Record<SpendCategory, number>>;
  onTransaction: (id: string) => void;
  onWrongCategory: (merchant: string) => void;
  onSeeAll: (c: SpendCategory) => void;
  onBudget: (c: SpendCategory, amount: number) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const compare = v.groups.some((g) => g.rows.some((r) => r.change !== null)) || v.fixed.change !== null;
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));
  return (
    <section aria-labelledby="where-h" className="rounded-card-s bg-surface p-t4 shadow-card sm:rounded-card sm:p-t5">
      <div className="flex items-baseline justify-between gap-t3">
        <h3 id="where-h" className="text-card text-text sm:text-card-l">{t.heading}</h3>
        <span className="tnum text-meta text-text-muted">{t.count(v.categoryCount)}</span>
      </div>

      {[{ key: "fixed", label: t.fixed, line: v.fixed }, { key: "repayments", label: t.repayments, line: v.repayments }].filter((x) => x.line.total > 0).map(({ key, label, line }) => (
        <LinePanel key={key} id={key} label={label} line={line} compare={compare} open={open === key} onToggle={() => toggle(key)} />
      ))}

      {v.groups.length > 0 && (
        <div aria-hidden className={cx(GRID, "pt-t4 text-meta-s font-bold uppercase tracking-[0.04em] text-text-muted")}>
          <span>{t.colEveryday}</span><span className="text-right">{v.kind === "cycle" ? t.colThis : t.colThisPeriod}</span><span className="text-right">{compare ? t.colVs : ""}</span><span />
        </div>
      )}
      {v.groups.map((g) => (
        <div key={g.type}>
          <p className="tnum mt-t3 flex justify-between border-b border-line pb-t1 text-meta-s font-bold uppercase tracking-[0.06em] text-text-muted">
            <span>{t.groups[g.type]}</span><span>{formatWhole(g.total)}</span>
          </p>
          <ul>
            {g.rows.map((r) => (
              <li key={r.category} className="border-b border-divider last:border-b-0">
                <button type="button" aria-expanded={open === r.category} aria-controls={`cat-${r.category}`} onClick={() => toggle(r.category)}
                  className={cx(GRID, "min-h-[56px] w-full py-t2 text-left")}>
                  <CatName category={r.category} name={r.name} />
                  <span className="tnum text-body14 font-extrabold text-text">{formatWhole(r.total)}</span>
                  <Change value={compare ? r.change : null} tone={r.tone} />
                  <ChevronDown aria-hidden size={16} className={cx("text-icon-muted transition-transform duration-fast motion-reduce:transition-none", open === r.category && "rotate-180")} />
                </button>
                {open === r.category && (
                  <Panel id={`cat-${r.category}`} r={r} v={v} budget={budgets[r.category]}
                    onTransaction={onTransaction} onWrongCategory={onWrongCategory} onSeeAll={() => onSeeAll(r.category)} onBudget={onBudget} />
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function CatName({ category, name }: { category: SpendCategory; name: string }) {
  const Icon = categoryIcons[category];
  return (
    <span className="flex min-w-0 items-center gap-t2 sm:gap-t3">
      <span aria-hidden className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] bg-surface2" style={{ color: catVar(category) }}><Icon size={16} /></span>
      <span className="min-w-0 text-body14 font-semibold text-text">{name}</span>
    </span>
  );
}

function Change({ value, tone }: { value: number | null; tone: ChangeTone }) {
  if (value === null) return <span />;
  const n = Math.round(value);
  if (n === 0) return <span className="text-right text-meta font-bold text-text-muted"><span aria-hidden>{t.same}</span><span className="sr-only">, {t.sameSr}</span></span>;
  return (
    <span className={cx("tnum whitespace-nowrap text-right text-meta font-bold", TONE[tone])}>
      <span aria-hidden>{n > 0 ? "↑" : "↓"} {formatWhole(Math.abs(n))}</span><span className="sr-only">, {t.changeSr(formatWhole(Math.abs(n)), n > 0)}</span>
    </span>
  );
}

function LinePanel({ id, label, line, compare, open, onToggle }: { id: string; label: string; line: Line; compare: boolean; open: boolean; onToggle: () => void }) {
  return (
    <div className="mt-t3 rounded-inset bg-chip">
      <button type="button" aria-expanded={open} aria-controls={`line-${id}`} onClick={onToggle} className={cx(GRID, "min-h-[56px] w-full px-t3 py-t2 text-left")}>
        <span className="min-w-0">
          <span className="block text-body14 font-bold text-text">{label}</span>
          <span className="block text-meta text-text-muted">{line.categories.map((c) => c.name).join(" · ")}</span>
        </span>
        <span className="tnum text-body14 font-extrabold text-text">{formatWhole(line.total)}</span>
        <Change value={compare ? line.change : null} tone="neutral" />
        <ChevronDown aria-hidden size={16} className={cx("text-icon-muted", open && "rotate-180")} />
      </button>
      {open && (
        <ul id={`line-${id}`} className="px-t3 pb-t2">
          {line.categories.map((c) => (
            <li key={c.category} className="tnum flex justify-between gap-t3 border-t border-line py-[6px] text-meta text-text-secondary">
              <span className="min-w-0">{c.name}{c.merchants.length ? ` · ${c.merchants.join(", ")}` : ""}</span>
              <b className="text-text">{formatWhole(c.total)}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Panel({ id, r, v, budget, onTransaction, onWrongCategory, onSeeAll, onBudget }: {
  id: string; r: CategoryLine; v: SpendingView; budget: number | undefined;
  onTransaction: (id: string) => void; onWrongCategory: (merchant: string) => void; onSeeAll: () => void; onBudget: (c: SpendCategory, amount: number) => void;
}) {
  const [openM, setOpenM] = useState<string | null>(null);
  const cycle = v.kind === "cycle";
  const over = r.over;
  const status = r.status;
  const detail = [
    r.detail.change !== null ? t.detailChange(r.detail.change > 0, formatWhole(Math.abs(r.detail.change))) : null,
    r.detail.mostly ? t.detailMostly(r.detail.mostly.merchant, formatWhole(r.detail.mostly.total)) : null,
  ].filter(Boolean).join(" ");
  return (
    <div id={id} className="mb-t3 rounded-inset bg-surface2 p-t3 sm:ml-[42px] sm:p-t4">
      <dl className="tnum grid grid-cols-3 gap-[6px]">
        <Tile label={cycle ? t.tiles.spent : t.tiles.spentPeriod} value={formatWhole(r.total)} lead={over ? "over" : "ok"} />
        {cycle && r.usualByNow !== null && <Tile label={t.tiles.usualByDay(v.day)} value={formatWhole(r.usualByNow)} />}
        {r.usual !== null && <Tile label={t.tiles.usualFull} value={formatWhole(r.usual)} />}
      </dl>
      {status ? (
        <p className={cx("tnum mt-t2 text-body14 font-bold", over ? "text-caution" : "text-text-secondary")}>
          {status.kind === "about" ? t.status.about : t.status[status.kind](formatWhole(status.amount))}
        </p>
      ) : r.usual === null && <p className="mt-t2 text-meta text-text-muted">{t.noUsual}</p>}
      {detail && <p className="tnum mt-t1 text-meta text-text-secondary">{detail}</p>}

      <ul aria-label={t.merchantsLabel(r.name)} className="mt-t3 rounded-[10px] bg-surface px-t3">
        {r.merchants.map((m) => {
          const k = `${m.merchant}|${m.pending}`;
          return (
            <li key={k} className="border-b border-divider last:border-b-0">
              <button type="button" aria-expanded={openM === k} onClick={() => setOpenM((o) => (o === k ? null : k))}
                className="grid min-h-tap w-full grid-cols-[minmax(0,1fr)_28px_auto_14px] items-center gap-t2 py-t2 text-left">
                <span className="min-w-0 text-body14 font-bold text-text">
                  {m.merchant}{m.pending && <span className="ml-t1 rounded-[6px] bg-caution-soft px-[6px] text-meta-s font-bold text-caution">{t.pending}</span>}
                </span>
                <span className="rounded-pill bg-chip text-center text-meta-s text-text-muted"><span aria-hidden>{m.count}</span><span className="sr-only">{t.txCount(m.count)}</span></span>
                <span className="tnum text-right text-body14 font-extrabold text-text">−{formatCents(m.total)}</span>
                <ChevronDown aria-hidden size={14} className={cx("text-icon-muted", openM === k && "rotate-180")} />
              </button>
              {openM === k && (
                <ul className="pb-t2 pr-[22px]">
                  {m.tx.map((x) => (
                    <li key={x.id}>
                      <button type="button" onClick={() => onTransaction(x.id)} className="tnum flex min-h-tap w-full items-center justify-between text-meta text-text-secondary hover:text-text">
                        <span>{formatShortDay(x.date)}</span><span>−{formatCents(x.amount)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-t3 flex flex-wrap gap-x-t4 gap-y-t1">
        {budget !== undefined
          ? <button type="button" onClick={() => onBudget(r.category, budget)} className="min-h-tap text-meta font-semibold text-accent">{t.editBudget(formatWhole(budget))}</button>
          : r.budget && <button type="button" onClick={() => onBudget(r.category, r.budget!.amount)} className="min-h-tap text-meta font-semibold text-accent">{t.setBudget(formatWhole(r.budget.amount))}</button>}
        {r.merchants[0] && <button type="button" onClick={() => onWrongCategory(r.merchants[0]!.merchant)} className="min-h-tap text-meta font-semibold text-accent">{t.wrongCategory}</button>}
        {r.txCount > 5 && <button type="button" onClick={onSeeAll} className="min-h-tap text-meta font-semibold text-accent">{t.seeAll(r.txCount)}</button>}
      </div>
    </div>
  );
}

function Tile({ label, value, lead }: { label: string; value: string; lead?: "ok" | "over" }) {
  return (
    <div className={cx("min-w-0 rounded-[12px] px-t2 py-t2 sm:px-[11px]", lead === "over" ? "bg-[linear-gradient(135deg,var(--color-caution-soft),color-mix(in_srgb,var(--color-caution-mark)_18%,var(--color-caution-soft)))]"
      : lead === "ok" ? "bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent-tint2))]" : "bg-surface")}>
      <dt className="text-meta-s font-semibold text-text-muted">{label}</dt>
      <dd className="text-[1rem] font-extrabold text-text sm:text-[1.0625rem]">{value}</dd>
    </div>
  );
}
