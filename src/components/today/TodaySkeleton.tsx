// Today loading state (redesign 07/10/2026): the same frame, header and card shapes as the loaded page, so
// nothing jumps when the figures arrive. The hero placeholder keeps the hero's colour and size.
import { CardSkeleton } from "./Card";

const label = "Loading Today";

export function TodayHeaderSkeleton() {
  return (
    <header aria-hidden className="flex items-center gap-t4 px-gutter pb-t3 pt-t4 sm:pb-t4 sm:pt-t5 desktop:pt-t7">
      <div className="min-w-0 flex-1">
        <div className="h-[28px] w-[140px] rounded-pill bg-chip desktop:h-[34px]" />
        <div className="mt-t2 h-[14px] w-[200px] rounded-pill bg-chip" />
      </div>
      <div className="h-tap w-tap rounded-pill bg-surface shadow-card desktop:h-[48px] desktop:w-[48px]" />
    </header>
  );
}

export function TodaySkeleton() {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-t4 sm:grid sm:grid-cols-2 sm:gap-t6 desktop:flex desktop:flex-row desktop:flex-wrap desktop:items-start">
      <div className="contents desktop:flex desktop:min-w-0 desktop:flex-[2_1_560px] desktop:flex-col desktop:gap-t6">
        <div className="order-1 h-[591px] animate-pulse rounded-hero-s bg-hero shadow-hero motion-reduce:animate-none sm:col-span-2 sm:h-[473px] desktop:h-[489px] desktop:rounded-hero" />
        <div className="order-2 flex gap-t3 overflow-hidden sm:col-span-2 sm:grid sm:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-[84px] w-[76px] shrink-0 rounded-tile bg-surface shadow-card sm:h-[96px] sm:w-auto" />)}
        </div>
        <CardSkeleton height={280} className="order-4 sm:col-span-2" />
        <CardSkeleton height={380} className="order-8 sm:order-9 sm:col-span-2" />
      </div>
      <div className="contents desktop:flex desktop:min-w-0 desktop:flex-[1_1_320px] desktop:flex-col desktop:gap-t6">
        <CardSkeleton height={170} className="order-5 desktop:min-h-[415px]" />
        <CardSkeleton height={300} className="order-7 desktop:order-6" />
        <CardSkeleton height={320} className="order-6 desktop:order-7" />
      </div>
    </div>
  );
}
