// Shared two-column page template (UX round 2, 4.1): the main column on the left, a context rail on the right.
// Desktop (≥1,024): side by side, the rail ~2/5 of the width. Phones and tablets: one column, the rail's content
// after the main content. Pages using it pass `wide` to PortalShell.
import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export function PageColumns({ main, rail, railLabel, className }: { main: ReactNode; rail?: ReactNode; railLabel?: string; className?: string }) {
  if (!rail) return <div className={cx("desktop:max-w-[760px]", className)}>{main}</div>;
  return (
    <div className={cx("flex flex-col gap-t4 desktop:flex-row desktop:items-start desktop:gap-t6", className)}>
      <div className="min-w-0 desktop:flex-[3_1_0]">{main}</div>
      <aside aria-label={railLabel} className="flex min-w-0 flex-col gap-t4 desktop:flex-[2_1_0]">{rail}</aside>
    </div>
  );
}
