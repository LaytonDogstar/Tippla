// "Sample logic" marker for open-question placeholders (docs/10). Hidden in presentation mode.
import { cx } from "./cx";

export function SampleTag({ q, present, className }: { q: string; present?: boolean; className?: string }) {
  if (present) return null;
  return (
    <span className={cx("inline-flex h-[20px] items-center rounded-xs bg-neutral-soft px-t2 text-caption text-neutral", className)}>
      Sample logic · {q}
    </span>
  );
}
