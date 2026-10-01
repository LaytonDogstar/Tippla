// Component 03: one native button per factor. Null shows an em dash, never 0 / 10. No value bar (spec).
import { ChevronRight } from "lucide-react";
import { factorTile } from "@/content/components";
import { copy } from "@/content/en-AU";
import type { Factor } from "@/lib/selectors/score";
import { cx } from "@/components/ui/cx";

export function FactorTile({ factor, strongest, explanation, onOpen }: { factor: Factor; strongest?: boolean; explanation?: string; onOpen?: () => void }) {
  const isNull = factor.value === null;
  const value = isNull ? factorTile.nullValue : factorTile.outOf(factor.value!.toFixed(1));
  const text = isNull ? copy.score.factorNull : explanation ?? factor.explains;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={[strongest && factorTile.strongest, factor.name, isNull ? "" : value, text].filter(Boolean).join(". ")}
      className={cx(
        "block w-full rounded-md p-t5 text-left transition-colors duration-fast ease-tippla",
        strongest ? "min-h-[140px] bg-accent-soft active:shadow-[inset_0_0_0_2px_var(--color-accent)] hover:shadow-[inset_0_0_0_2px_var(--color-accent)]" : "min-h-[112px] bg-surface hover:bg-surface2 active:bg-surface2",
      )}
    >
      {strongest && <p aria-hidden className="mb-t3 text-caption text-accent">{factorTile.strongest}</p>}
      <span aria-hidden className="grid grid-cols-[minmax(0,1fr)_auto_20px] items-start gap-t3">
        <span className="text-h3 text-text">{factor.name}</span>
        <span className={cx("tnum text-h3 font-numeric", isNull ? "text-text-muted" : "text-text")}>{value}</span>
        <ChevronRight size={20} className="mt-[1px] text-text-muted" />
      </span>
      <span aria-hidden className="mt-t4 block text-small text-text-muted">{text}</span>
    </button>
  );
}
