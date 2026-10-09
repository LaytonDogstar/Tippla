"use client";
// Section wayfinding (Spending v5 and Today, 09/10/2026). A heading outside the cards (a small numbered marker, a
// title, one line of purpose and a thin rule), sized between the page title and card titles; and sticky chips that
// highlight the section in view and jump to it. On phones the chip row scrolls sideways inside itself only.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";

/** Space between groups of cards, the same on both pages (cards within a group sit 10px apart). */
export const GROUP_GAP = "gap-[40px]";
export const IN_GROUP_GAP = "gap-[10px]";

export function Section({ id, n, title, desc, children, className }: { id: string; n?: number; title?: string; desc?: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={title ? `${id}-h` : undefined} data-section={id} className={cx("flex flex-col", IN_GROUP_GAP, className)}>
      {title && (
        <div id={id} className="flex scroll-mt-[72px] items-center gap-t3 px-[2px] pb-t1">
          {n !== undefined && <span aria-hidden className="flex min-h-[26px] min-w-[26px] shrink-0 items-center justify-center rounded-[8px] px-[4px] bg-accent-tint2 text-meta font-extrabold text-accent-strong">{n}</span>}
          <div className="min-w-0">
            <h2 id={`${id}-h`} className="text-[1.25rem] font-extrabold leading-7 tracking-[-0.015em] text-text">{title}</h2>
            {desc && <p className="text-meta text-text-muted">{desc}</p>}
          </div>
          <span aria-hidden className="h-px min-w-t4 flex-1 self-center bg-line" />
        </div>
      )}
      {children}
    </section>
  );
}

export function SectionChips({ items, label }: { items: { id: string; label: string }[]; label: string }) {
  const [current, setCurrent] = useState(items[0]?.id ?? "");
  const [stuck, setStuck] = useState(false);
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const onScroll = () => {
      setStuck((nav.current?.getBoundingClientRect().top ?? 1) <= 0.5);
      let cur = items[0]?.id ?? "";
      for (const it of items) {
        const el = document.querySelector(`[data-section="${it.id}"]`);
        if (el && el.getBoundingClientRect().top < 240) cur = it.id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = items.at(-1)?.id ?? cur;
      setCurrent(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);
  // Keep the current chip in view inside the row (never scrolls the page sideways).
  useEffect(() => {
    const row = nav.current, a = row?.querySelector<HTMLElement>(`a[data-chip="${current}"]`);
    if (row && a && (a.offsetLeft < row.scrollLeft || a.offsetLeft + a.offsetWidth > row.scrollLeft + row.clientWidth)) row.scrollLeft = a.offsetLeft - 16;
  }, [current]);
  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    setCurrent(id);
  };
  return (
    <nav ref={nav} aria-label={label}
      className={cx("sticky top-0 z-20 -mx-gutter flex gap-[6px] overflow-x-auto border-b bg-bg px-gutter py-[6px] [scrollbar-width:none] desktop:-mx-t2 desktop:px-t2", stuck ? "border-line" : "border-transparent")}>
      {items.map((it) => (
        <a key={it.id} href={`#${it.id}`} data-chip={it.id} onClick={go(it.id)} aria-current={current === it.id ? "location" : undefined}
          className={cx("inline-flex min-h-tap shrink-0 items-center rounded-pill px-[14px] text-meta font-bold",
            current === it.id ? "bg-text text-surface" : "text-text-secondary hover:bg-chip")}>
          {it.label}
        </a>
      ))}
    </nav>
  );
}
