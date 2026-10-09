"use client";
// The month calendar (09/10/2026; reference: tippla-calendar-mockup.dc.html). Monday-to-Sunday weeks; days outside
// the month are muted and not interactive. Each day is a real button: the date (filled for today), a tag (Today,
// Forecast or Lowest), up to two chips (pay, pay advances, bills, predicted items) then "+N more", "Out $X" (posted
// spending only, never on forecast days) and the end-of-day balance. Below $0: the soft negative tint, the figure in
// the negative colour. Forecast days: a dashed border, the balance in italics. Only the lowest forecast day has a
// strong border. Below 720px a cell is just the date and the balance.
import { useEffect, useRef } from "react";
import type { CalDay, CalItem } from "@/lib/selectors/calendarMonth";
import { calendarPage as c } from "@/content/spending";
import { formatShortDay, formatWhole } from "@/lib/format";
import { cx } from "@/components/ui/cx";

const t = c.grid;
const signed = (n: number) => `${n > 0 ? "+" : ""}${formatWhole(n)}`;

/** The chip for an item, if it gets one (pay, pay advances, bills, and anything predicted). */
export function chipFor(i: CalItem): { text: string; cls: string } | null {
  if (i.status === "pending") return null;
  const predicted = i.status === "predicted";
  if (i.kind === "pay") return { text: t.pay(signed(Math.round(i.amount))), cls: predicted ? CHIP.predicted : CHIP.pay };
  if (i.kind === "advance") return { text: `${i.name} ${signed(Math.round(i.amount))}`, cls: predicted ? CHIP.predicted : CHIP.advance };
  if (i.kind === "bill" || predicted) return { text: `${i.name} ${formatWhole(Math.abs(i.amount))}`, cls: predicted ? CHIP.predicted : CHIP.bill };
  return null;
}
export const CHIP = {
  pay: "bg-positive-soft text-positive",
  advance: "bg-[color-mix(in_srgb,var(--cat-wage-advance)_16%,var(--color-surface))] text-[color:color-mix(in_srgb,var(--cat-wage-advance)_62%,var(--color-text))]",
  bill: "bg-caution-soft text-caution",
  predicted: "bg-surface2 text-text-secondary border border-dashed border-text-muted",
};

export interface GridHandlers {
  onPress: (date: string, e: { shift: boolean; drag: boolean }) => void;
  onEnter: (date: string) => void;
}

export function MonthCalendar({ cells, byDate, label, lowest, isSelected, handlers }: {
  cells: { date: string; inMonth: boolean }[];
  byDate: Map<string, CalDay>;
  label: string;
  /** The lowest forecast day, which gets the strong border and the "Lowest" tag. */
  lowest: string | null;
  isSelected: (date: string) => boolean;
  handlers: GridHandlers;
}) {
  // Whether the last press came from a mouse (it selected on pointer down, so its click is ignored).
  const mouse = useRef(false);
  useEffect(() => { const up = () => { mouse.current = false; }; window.addEventListener("blur", up); return () => window.removeEventListener("blur", up); }, []);
  return (
    <div role="group" aria-label={label} className="grid select-none grid-cols-7 gap-[4px] min-[720px]:gap-[6px]">
      {t.weekdays.map((w) => <div key={w} aria-hidden className="px-[4px] pb-[4px] text-meta-s font-bold text-text-muted">{w}</div>)}
      {cells.map(({ date, inMonth }) => {
            const day = byDate.get(date);
            if (!inMonth || !day) {
              return (
                <div key={date} aria-hidden
                  className="flex min-h-[62px] rounded-[9px] border border-dashed border-line p-[5px] text-meta-s font-semibold text-text-muted min-[720px]:min-h-[118px] min-[720px]:rounded-[12px] min-[720px]:p-[8px]">
                  {Number(date.slice(8))}
                </div>
              );
            }
            const chips = day.items.map(chipFor).filter((x): x is NonNullable<typeof x> => !!x);
            const neg = day.balance !== null && day.balance < 0;
            const isLowest = date === lowest;
            const sel = isSelected(date);
            const tag = day.isToday ? t.today : isLowest ? t.lowest : day.isFuture ? t.forecast : "";
            const balance = day.balance === null ? null : formatWhole(day.balance);
            return (
              <div key={date}>
                <button type="button" aria-pressed={sel}
                  aria-label={t.dayLabel(formatShortDay(date), day.isFuture, balance, [tag, ...chips.map((x) => x.text), !day.isFuture && day.moneyOut > 0 ? t.out(formatWhole(day.moneyOut)) : ""].filter(Boolean))}
                  onPointerDown={(e) => {
                    if (e.pointerType !== "mouse" || e.button !== 0) return;
                    mouse.current = true;
                    handlers.onPress(date, { shift: e.shiftKey, drag: true });
                  }}
                  onPointerEnter={(e) => { if (e.pointerType === "mouse" && e.buttons === 1) handlers.onEnter(date); }}
                  onClick={(e) => {
                    // Mouse presses were handled on pointer down; taps and Enter / Space select here.
                    if (mouse.current && e.detail > 0) { mouse.current = false; return; }
                    handlers.onPress(date, { shift: e.shiftKey, drag: false });
                  }}
                  className={cx(
                    "flex h-full min-h-[62px] w-full min-w-0 flex-col gap-[4px] rounded-[9px] border p-[5px] text-left text-text transition-colors duration-fast min-[720px]:min-h-[118px] min-[720px]:rounded-[12px] min-[720px]:px-[9px] min-[720px]:py-[8px]",
                    sel ? "border-accent bg-accent-soft" : neg ? "border-negative-soft bg-negative-soft" : day.isFuture ? "border-dashed border-text-muted bg-surface" : "border-line bg-surface hover:border-accent",
                    isLowest && "border-2 !border-solid !border-negative",
                  )}>
                  <span className="flex items-center justify-between gap-[4px]">
                    <span className={cx("inline-flex min-h-[24px] min-w-[24px] items-center justify-center rounded-pill px-[2px] text-meta-s font-bold", day.isToday && "bg-text text-surface")}>{Number(date.slice(8))}</span>
                    {tag && <span className={cx("hidden truncate text-[0.6875rem] font-bold uppercase tracking-[0.02em] min-[720px]:inline", isLowest && !day.isToday ? "text-negative" : "text-text-secondary")}>{tag}</span>}
                  </span>
                  {chips.slice(0, 2).map((x, i) => (
                    <span key={i} className={cx("hidden max-w-full truncate rounded-[6px] px-[6px] py-[2px] text-[0.75rem] font-semibold min-[720px]:block", x.cls)}>{x.text}</span>
                  ))}
                  {chips.length > 2 && <span className="hidden text-[0.75rem] font-semibold text-text-secondary min-[720px]:block">{t.more(chips.length - 2)}</span>}
                  <span className="mt-auto flex items-baseline justify-end gap-[4px] min-[720px]:justify-between">
                    <span className="tnum hidden min-w-0 truncate text-[0.75rem] text-text-secondary min-[720px]:inline">{!day.isFuture && day.moneyOut > 0 ? t.out(formatWhole(day.moneyOut)) : ""}</span>
                    <span className={cx("tnum min-w-0 text-right text-[0.75rem] font-extrabold tracking-[-0.02em] [overflow-wrap:anywhere] min-[720px]:whitespace-nowrap min-[720px]:text-[1rem]", neg ? "text-negative" : "text-text", day.isFuture && "italic")}>
                      {balance ?? t.noBalance}
                    </span>
                  </span>
                </button>
              </div>
            );
      })}
    </div>
  );
}
