// The homepage hero phone: the SmartScore screen as real markup, so it stays crisp at any size. It takes the figures
// as props (content/siteExamples today), so it can show live or demo data later without changing.
import { ArrowDown, ArrowUp } from "lucide-react";
import { site } from "@/content/site";
import { formatDayMonth, type ISODate } from "@/lib/format/dates";

const t = site.home.phone;

export interface HeroPhoneData {
  score: number;
  max: number;
  change: { delta: number; since: ISODate } | null;
  next: { name: string; at: number; toGo: number } | null;
  moved: readonly { name: string; points: number }[];
  nextStep: string | null;
}

export function HeroPhone({ data, example }: { data: HeroPhoneData; example?: string }) {
  const max = data.max.toLocaleString("en-AU");
  const share = Math.min(100, Math.max(0, (data.score / data.max) * 100));
  const down = (data.change?.delta ?? 0) < 0;
  return (
    <div className="relative w-[272px] rotate-[-3deg] rounded-[44px] bg-site-phone p-[10px] shadow-[0_40px_80px_rgba(8,10,40,0.45)] motion-reduce:rotate-0 min-[420px]:w-[300px]">
      <div className="flex flex-col overflow-hidden rounded-[35px] bg-site-phone-screen pb-t4 text-site-text">
        <div className="flex items-center justify-between px-t5 pb-t3 pt-[26px]">
          <p className="text-[1.125rem] font-extrabold">{t.title}</p>
          {example && <p className="rounded-pill border border-site-line bg-site-surface px-t2 py-[2px] text-[0.625rem] font-bold text-site-muted">{example}</p>}
        </div>
        <div className="mx-[14px] flex flex-col items-center rounded-[22px] bg-site-navy px-t4 pb-t4 pt-[18px] text-site-navy-on">
          <svg viewBox="0 0 240 130" className="h-auto w-[200px] min-[420px]:w-[220px]" role="img" aria-label={t.gaugeLabel(data.score, max)}>
            <path d="M20 120 A100 100 0 0 1 220 120" fill="none" stroke="var(--site-navy-chip)" strokeWidth="16" strokeLinecap="round" />
            <path d="M20 120 A100 100 0 0 1 220 120" fill="none" stroke="var(--site-navy-on)" strokeWidth="16" strokeLinecap="round" pathLength={100} strokeDasharray={`${share} 100`} />
          </svg>
          <p aria-hidden className="mt-[-64px] text-[3rem] font-extrabold leading-none tracking-[-0.03em]">{data.score}</p>
          <p className="mt-t1 text-[0.6875rem] text-site-navy-muted">{t.outOf(max)}</p>
          {data.change && (
            <p className="mt-t3 inline-flex items-center gap-[6px] rounded-pill bg-site-navy-chip px-[10px] py-[5px] text-[0.6875rem] font-bold">
              {down ? <ArrowDown aria-hidden size={12} strokeWidth={3} className="text-hero-negative-mark" /> : <ArrowUp aria-hidden size={12} strokeWidth={3} className="text-hero-positive-mark" />}
              {t.change(data.change.delta, formatDayMonth(data.change.since))}
            </p>
          )}
        </div>
        {data.next && (
          <div className="mx-[14px] mt-t3 flex items-center justify-between rounded-[16px] bg-site-surface px-[14px] py-t3">
            <div>
              <p className="text-[0.6875rem] font-semibold text-site-muted">{t.nextStage}</p>
              <p className="text-[0.875rem] font-extrabold">{t.stageAt(data.next.name, data.next.at)}</p>
            </div>
            <p className="rounded-pill bg-site-lilac px-[10px] py-[6px] text-[0.75rem] font-extrabold text-site-indigo">{t.toGo(data.next.toGo)}</p>
          </div>
        )}
        {data.moved.length > 0 && (
          <div className="mx-[14px] mt-[10px] flex flex-col gap-[8px] rounded-[16px] bg-site-surface px-[14px] py-t3">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-site-muted">{t.moved}</p>
            <ul className="flex flex-col gap-[8px]">
              {data.moved.map((m) => (
                <li key={m.name} className="flex items-center justify-between gap-t2 text-[0.8125rem]">
                  <span className="min-w-0 font-semibold">{m.name}</span>
                  <span className={m.points < 0 ? "shrink-0 rounded-pill bg-site-pink-tint px-[6px] font-extrabold text-site-magenta" : "shrink-0 rounded-pill bg-site-teal-tint px-[6px] font-extrabold text-site-teal"}>{t.points(m.points)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.nextStep && (
          <div className="mx-[14px] mt-[10px] rounded-[16px] bg-site-lilac px-[14px] py-t3">
            <p className="text-[0.6875rem] font-extrabold uppercase text-site-indigo">{t.nextStep}</p>
            <p className="mt-[3px] text-[0.8125rem] font-bold">{data.nextStep}</p>
          </div>
        )}
      </div>
    </div>
  );
}
