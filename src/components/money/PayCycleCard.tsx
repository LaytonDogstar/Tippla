"use client";
// Money plan's "last pay cycle" card (13/10/2026; reference: tippla-pay-cycle-option3.html). A hero with Paid / Spent /
// Difference, a waffle where each square is about 1% of pay (squares past 100 sit below "Your pay ran out here",
// hatched), the debt share, and the categories in two groups. Hovering, focusing or tapping a row (or a square)
// highlights its squares; a tap pins it. Supportive, never alarming: no red or warning colours in this card.
import { useState, type CSSProperties } from "react";
import { Clock, CreditCard, Dices, House, Info, Receipt, ShoppingCart, type LucideIcon } from "lucide-react";
import { moneyPlan } from "@/content/moneyPlan";
import { formatDayMonth, formatWhole } from "@/lib/format";
import type { SpendGroup } from "@/lib/selectors/moneyPlan";
import type { PayCycleCard as Card, PayCycleItem } from "@/lib/selectors/payCycleCard";
import { cx } from "@/components/ui/cx";

const t = moneyPlan.went;
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Colour token and icon for each category (the grouping itself is PAY_CYCLE_GROUPS). */
const STYLE: Record<SpendGroup, { icon: LucideIcon }> = {
  rent: { icon: House },
  everyday: { icon: ShoppingCart },
  bills: { icon: Receipt },
  gambling: { icon: Dices },
  loans: { icon: CreditCard },
  advance: { icon: Clock },
};
const colour = (g: SpendGroup) => `var(--pay-${g})`;
const onColour = (g: SpendGroup) => `var(--pay-${g}-on)`;
const HATCH = "repeating-linear-gradient(135deg, transparent 0 3px, var(--pay-hatch) 3px 5px)";

export function PayCycleCard({ card, fee }: { card: Card; fee: { provider: string; amount: number } | null }) {
  const [hover, setHover] = useState<SpendGroup | null>(null);
  const [pinned, setPinned] = useState<SpendGroup | null>(null);
  const active = hover ?? pinned;
  const toggle = (g: SpendGroup) => setPinned((p) => (p === g ? null : g));

  const gap = -card.net;
  const headline = Math.round(gap) > 0 ? t.over(formatWhole(gap)) : Math.round(card.net) > 0 ? t.under(formatWhole(card.net)) : t.even;
  const diff = Math.round(card.net) === 0 ? formatWhole(0) : card.net < 0 ? `−${formatWhole(-card.net)}` : `+${formatWhole(card.net)}`;

  const items = card.groups.flatMap((g) => g.items);
  const name = (i: PayCycleItem) => (i.group === "advance" && i.merchants.length === 1 ? t.advanceOne(i.merchants[0]!) : t.groups[i.group]);
  const sub = (i: PayCycleItem) =>
    i.group === "everyday" ? t.everydaySub
    : i.group === "loans" && i.merchants.length ? t.lenders(i.merchants.length)
    : i.group === "advance" && fee && i.merchants.length === 1 && i.merchants[0] === fee.provider ? t.feeSub(formatWhole(fee.amount))
    : null;

  // The squares in card order; the first 100 are the pay, the rest ran past it. Under 100: empty track to 100.
  const squares = items.flatMap((i) => Array.from({ length: i.squares }, () => i.group));
  const inPay = squares.slice(0, 100);
  const over = squares.slice(100);
  const track = Math.max(0, 100 - squares.length);
  const square = (g: SpendGroup, k: number, hatched: boolean) => (
    <span key={k} onMouseEnter={() => setHover(g)} onMouseLeave={() => setHover(null)} onClick={() => toggle(g)}
      className={cx("aspect-square rounded-[4px] motion-safe:transition-[opacity,transform] motion-safe:duration-base",
        active && (active === g ? "motion-safe:scale-[1.06]" : "opacity-[.18]"))}
      style={{ backgroundColor: colour(g), backgroundImage: hatched ? HATCH : undefined }} />
  );
  const grid = "grid grid-cols-10 gap-[4px] min-[560px]:grid-cols-[repeat(20,minmax(0,1fr))]";
  const waffleLabel = t.waffleLabel(items.map((i) => `${name(i)} ${pct(i.shareOfPay)}`).join(", "), `${card.squares}%`);
  const heavyShare = card.heavy && card.heavy.total > 0 ? card.heavy.shareOfPay : null;

  return (
    <section aria-labelledby="mp-went-eyebrow mp-went-h" className="overflow-hidden rounded-card-s bg-surface shadow-card sm:rounded-card">
      <div className="bg-hero px-t5 py-t5 text-hero-on min-[560px]:px-t6 min-[560px]:py-t6">
        <p id="mp-went-eyebrow" className="text-meta-s font-bold uppercase tracking-[.08em] text-hero-on-muted">{t.eyebrow}</p>
        <h2 id="mp-went-h" className="mt-t2 max-w-[30ch] text-[1.375rem] font-extrabold leading-tight tracking-[-0.02em] min-[560px]:text-[1.625rem]">{headline}</h2>
        <dl className="mt-t4 grid grid-cols-3 gap-t2 min-[560px]:flex min-[560px]:flex-wrap min-[560px]:gap-[10px]">
          {([[t.stats.paid, formatWhole(card.paid)], [t.stats.spent, formatWhole(card.spent)], [t.stats.difference, diff]] as const).map(([k, v]) => (
            <div key={k} className="min-w-0 rounded-[14px] bg-hero-glass px-[10px] py-[9px] min-[560px]:min-w-[120px] min-[560px]:px-[14px] min-[560px]:py-[10px]">
              <dt className="text-meta-s text-hero-on-muted">{k}</dt>
              <dd className="tnum text-[1rem] font-extrabold min-[560px]:text-[1.125rem]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-col p-t5 min-[560px]:p-t6">
        {card.squares > 0 && (
          <>
            <div className="mb-[10px] flex flex-col gap-[2px] min-[560px]:flex-row min-[560px]:items-baseline min-[560px]:justify-between">
              <h3 className="text-[0.9375rem] font-extrabold text-text">{t.waffleTitle}</h3>
              <span className="text-meta-s text-text-muted">{t.waffleKey}</span>
            </div>
            <div role="img" aria-label={waffleLabel} data-testid="waffle">
              <div className={grid}>
                {inPay.map((g, k) => square(g, k, false))}
                {Array.from({ length: track }, (_, k) => <span key={`t${k}`} className="aspect-square rounded-[4px] bg-[color:var(--pay-track)]" />)}
              </div>
              {over.length > 0 && (
                <>
                  <div aria-hidden className="my-[10px] flex items-center gap-t2 text-meta-s font-bold text-accent">
                    <span className="flex-1 border-t-2 border-dashed border-[color:var(--pay-bills)]" />{t.ranOut}<span className="flex-1 border-t-2 border-dashed border-[color:var(--pay-bills)]" />
                  </div>
                  <div className={grid}>{over.map((g, k) => square(g, k + 100, true))}</div>
                </>
              )}
            </div>
          </>
        )}

        {heavyShare !== null && (
          <p data-testid="debt-share" className={cx("flex items-center gap-t3 rounded-[16px] bg-accent-soft px-t4 py-[14px] text-body14 leading-relaxed text-text", card.squares > 0 && "mt-t5")}>
            <span aria-hidden className="h-[34px] w-[34px] shrink-0 rounded-pill shadow-[inset_0_0_0_3px_var(--color-accent-soft)]"
              style={{ background: `conic-gradient(var(--pay-gambling) 0 ${Math.min(100, heavyShare * 100)}%, var(--color-surface) 0 100%)` }} />
            <span>{t.heavy(t.shareWords(heavyShare) ?? t.shareOf(pct(heavyShare)), formatWhole(card.heavy!.total))}</span>
          </p>
        )}

        <div className={cx("mt-t5 grid gap-t4 min-[560px]:gap-t5", card.groups.length > 1 && "min-[560px]:grid-cols-2")}>
          {card.groups.map((g) => (
            <div key={g.id} className="min-w-0">
              <div className="mb-[4px] flex items-baseline justify-between gap-t2 border-b border-line pb-t2">
                <h3 className="text-meta-s font-extrabold uppercase tracking-[.05em] text-text-muted">{t.groupTitles[g.id]}</h3>
                <p className="tnum whitespace-nowrap text-[0.9375rem] font-extrabold text-text">{formatWhole(g.total)}<span className="ml-[4px] text-meta-s font-semibold text-text-muted">{t.ofPay(pct(g.shareOfPay))}</span></p>
              </div>
              <ul>
                {g.items.map((i) => {
                  const Icon = STYLE[i.group].icon;
                  const s = sub(i);
                  return (
                    <li key={i.group}>
                      <button type="button" aria-pressed={pinned === i.group} data-group={i.group}
                        onMouseEnter={() => setHover(i.group)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i.group)} onBlur={() => setHover(null)}
                        onClick={() => toggle(i.group)}
                        className={cx("-mx-t2 flex min-h-tap w-[calc(100%+16px)] items-center gap-t3 rounded-[12px] px-t2 py-[10px] text-left hover:bg-surface2", active === i.group && "bg-surface2")}>
                        <span aria-hidden className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[11px]" style={{ backgroundColor: colour(i.group) } as CSSProperties}>
                          <Icon size={18} strokeWidth={2} style={{ color: onColour(i.group) }} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-body14 font-bold leading-snug text-text">{name(i)}</span>
                          {s && <span className="block text-meta-s text-text-muted">{s}</span>}
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="tnum block text-body font-extrabold text-text">{formatWhole(i.total)}</span>
                          <span className="block text-meta-s font-semibold text-text-muted">{t.ofPay(pct(i.shareOfPay))}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {card.advance && Math.round(gap) > 0 && (
          <p className="mt-t5 flex items-center gap-[10px] border-t border-line pt-t4 text-meta text-text-muted">
            <Info aria-hidden size={18} className="shrink-0 text-accent" />
            <span>{t.coveredBy(formatWhole(gap), formatWhole(card.advance.amount), card.advance.provider, formatDayMonth(card.advance.date))}</span>
          </p>
        )}
      </div>
    </section>
  );
}
