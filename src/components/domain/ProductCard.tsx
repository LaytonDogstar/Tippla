// One card template for financial products on Borrowing (UX round 2, 3.5): loans, buy now pay later and pay
// advances all read the same way. Icon · name · product type; then label/value pairs (the key value bold, status
// text muted, never the boldest thing); then an optional note. The whole card opens the repayments (3.4).
import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cx } from "@/components/ui/cx";

export interface ProductPair {
  label: string;
  value: ReactNode;
  /** The value this card is about (e.g. the next repayment when there's no balance): larger and bold. */
  main?: boolean;
  /** A status rather than a figure ("Balance not available"): muted. */
  status?: boolean;
}

const STRETCH = "rounded-sm text-left outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:after:outline focus-visible:after:outline-[length:var(--focus-width)] focus-visible:after:outline-offset-[var(--focus-offset)] focus-visible:after:outline-focus";

export function ProductCard({ icon: Icon, name, type, pairs, note, onOpen, openLabel, action }: {
  icon: LucideIcon; name: string; type: string; pairs: ProductPair[]; note?: ReactNode;
  /** Opens this product's repayments. */
  onOpen?: () => void; openLabel?: string;
  /** A secondary control (e.g. "Not right?"), drawn above the card's own target. */
  action?: ReactNode;
}) {
  return (
    <article aria-label={name} className={cx("relative rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card sm:px-t6", onOpen && "pressable hover:bg-surface2")}>
      <div className="flex items-center gap-t3">
        <span aria-hidden className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-pill bg-accent-soft text-accent"><Icon size={20} strokeWidth={1.8} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-row text-text">
            {onOpen ? <button type="button" onClick={onOpen} aria-label={openLabel ? `${name}: ${openLabel}` : undefined} className={STRETCH}>{name}</button> : name}
          </h3>
          <p className="text-meta text-text-muted">{type}</p>
        </div>
        {onOpen && <ChevronRight aria-hidden size={20} className="shrink-0 text-icon-muted" />}
      </div>
      <dl className="mt-t4 grid grid-cols-2 gap-x-t4 gap-y-t3 sm:grid-cols-3">
        {pairs.map((p) => (
          <div key={p.label} className={cx("min-w-0", p.main && "col-span-2 sm:col-span-1")}>
            <dt className="text-meta text-text-muted">{p.label}</dt>
            <dd className={cx("tnum mt-[2px]", p.status ? "text-body14 text-text-muted" : p.main ? "text-section-num text-text" : "text-row text-text")}>{p.value}</dd>
          </div>
        ))}
      </dl>
      {note && <p className="mt-t3 text-meta text-text-muted">{note}</p>}
      {action && <div className="relative z-10 mt-t2">{action}</div>}
    </article>
  );
}
