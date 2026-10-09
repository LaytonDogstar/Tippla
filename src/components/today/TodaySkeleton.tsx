// Today loading state (single column, 09/10/2026): the same header and card shapes as the loaded page, in the same
// one column, so nothing jumps when the figures arrive. The hero placeholder keeps the hero's colour.
import { CardSkeleton } from "./Card";

const label = "Loading Today";

export function TodayHeaderSkeleton() {
  return (
    <header aria-hidden className="mx-auto w-full px-gutter pb-t3 pt-t4 sm:pb-t4 sm:pt-t5 desktop:max-w-[calc(660px+2*var(--gutter))] desktop:pt-t7">
      <div className="flex items-center gap-t4">
        <div className="min-w-0 flex-1">
          <div className="h-[28px] w-[140px] rounded-pill bg-chip desktop:h-[34px]" />
          <div className="mt-t2 h-[14px] w-[200px] rounded-pill bg-chip" />
        </div>
        <div className="h-tap w-tap rounded-pill bg-surface shadow-card desktop:h-[48px] desktop:w-[48px]" />
      </div>
      <div className="mt-t3 h-[52px] rounded-pill bg-surface shadow-card" />
    </header>
  );
}

export function TodaySkeleton() {
  return (
    <div role="status" aria-label={label} className="mx-auto flex w-full max-w-[660px] flex-col gap-[32px]">
      <div className="flex flex-col gap-[10px]">
        <div className="h-[520px] animate-pulse rounded-hero-s bg-hero shadow-hero motion-reduce:animate-none sm:h-[440px] desktop:rounded-hero" />
        <CardSkeleton height={340} />
        <CardSkeleton height={220} />
      </div>
      <CardSkeleton height={380} />
      <CardSkeleton height={420} className="bg-accent-soft" />
    </div>
  );
}
