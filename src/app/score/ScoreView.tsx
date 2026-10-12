"use client";
// SmartScore, one column (12/10/2026; reference: smartscore-mock.dc.html), like Today and Spending: section pills,
// then 1 Where you stand (the dark hero and What changed), 2 Next step (the plan, the action and the estimate, with
// the shortfall note when Today shows one), 3 What's behind it (one grouped list: Most room to move, then the other
// factors behind a toggle) and 4 Over time (the trend with the band lines, then How your score works). Sections 1
// and 2 swap with SCORE_SECTION_ORDER. Factor detail opens as a sheet (deep link /score/[factor]); the related step
// replaces the sheet's content with Back, never a second scrim.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Info, TriangleAlert } from "lucide-react";
import type { FactorKey } from "@/lib/api/types";
import type { Factor, ScoreState } from "@/lib/selectors/score";
import type { DriverFact } from "@/lib/selectors/factorDetail";
import type { Recommendation } from "@/lib/selectors/recommendations";
import type { FactorLine } from "@/lib/selectors/scorePage";
import type { ScoreAttribution } from "@/lib/selectors/scoreAttribution";
import type { PlanProgress } from "@/lib/selectors/plans";
import type { ScoreProjection } from "@/lib/scoring/estimate";
import { scorePage as t } from "@/content/factors";
import { copy, stageNames } from "@/content/en-AU";
import { STAGES } from "@/config/stages";
import { formatDate, formatDayMonth, formatShortDay, formatUpdated } from "@/lib/format";
import { FACTOR_SLUGS } from "@/lib/ui/factorSlugs";
import { Section, SectionChips, GROUP_GAP } from "@/components/shell/Sections";
import { HeroCard } from "@/components/today/HeroCard";
import { InsightSheetBody } from "@/components/domain/Insight";
import { Button } from "@/components/ui/Button";
import { SampleTag } from "@/components/ui/SampleTag";
import { Sheet } from "@/components/ui/Sheet";
import { cx } from "@/components/ui/cx";

type Key = Exclude<FactorKey, "GOVERNMENT_RELIANCE">;
export interface FactorPanel { factor: Factor; drivers: DriverFact[]; related: Recommendation | null; explanation?: string }

export interface ScoreViewProps {
  state: ScoreState;
  attribution: ScoreAttribution | null;
  /** The previous update's score and date ("Was 489", "since 11/09"). */
  previous: { score: number; date: string } | null;
  direction: { dir: "up" | "down" | "steady"; weeks: number } | null;
  sections: { id: "stand" | "next"; n: number }[];
  plan: { progress: PlanProgress; title: string } | null;
  action: { title: string } | null;
  projection: ScoreProjection | null;
  shortfall: { amount: number; payday: string } | null;
  room: FactorLine[];
  other: FactorLine[];
  strongest: FactorLine | null;
  /** The gambling cross-link goes only where gambling insights aren't hidden. */
  gamblingLink: boolean;
  trend: { date: string; score: number }[];
  panels: Record<Key, FactorPanel>;
  scoredAt: string | null;
  initial: Key | null;
  present: boolean;
  stagesSample: boolean;
}

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}`;
const changeText = (c: number | null) => (c === null ? "–" : c === 0 ? t.list.noChange : `${c > 0 ? "↑" : "↓"} ${Math.abs(c).toFixed(1)}`);

export function ScoreView(p: ScoreViewProps) {
  const router = useRouter();
  const [open, setOpen] = useState<Key | null>(p.initial);
  const [related, setRelated] = useState(false);
  const [others, setOthers] = useState(false);
  const [how, setHow] = useState(false);
  const show = (k: FactorKey) => { setRelated(false); setOpen(k as Key); window.history.replaceState(null, "", `/score/${FACTOR_SLUGS[k as Key]}`); };
  const close = () => { setOpen(null); setRelated(false); window.history.replaceState(null, "", "/score"); };
  const panel = open ? p.panels[open] : null;
  const since = p.previous ? formatDayMonth(p.previous.date) : null;

  const chips = [
    ...p.sections.map((s) => ({ id: `s-${s.id}`, label: t.sections[s.id].chip })),
    { id: "s-factors", label: t.sections.factors.chip },
    ...(p.trend.length >= 2 ? [{ id: "s-trend", label: t.sections.trend.chip }] : []),
  ];
  const body = {
    stand: <Stand {...p} since={since} onOpen={show} />,
    next: <NextStep {...p} />,
  };

  return (
    <div className="mx-auto w-full max-w-[660px] pb-t6">
      <SectionChips items={chips} label={t.pillsLabel} />
      <div className={cx("mt-t4 flex flex-col", GROUP_GAP)}>
        {p.sections.map((s) => (
          <Section key={s.id} id={`s-${s.id}`} n={s.n} title={t.sections[s.id].title} desc={t.sections[s.id].desc}>{body[s.id]}</Section>
        ))}

        <Section id="s-factors" n={3} title={t.sections.factors.title} desc={t.sections.factors.desc(p.room.length + p.other.length)}>
          <div className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
            <div aria-hidden className="grid grid-cols-[minmax(0,1fr)_64px_80px] gap-t2 pb-[6px] text-meta-s font-bold uppercase tracking-[0.04em] text-text-muted">
              <span>{p.room.length ? t.list.room : t.list.all}</span><span className="text-right">{t.list.score}</span><span className="text-right">{since ? t.list.since(since) : t.list.sinceNone}</span>
            </div>
            <ul>
              {p.room.map((f) => (
                <li key={f.key} className="border-t border-divider">
                  <FactorButton f={f} strong onOpen={() => show(f.key)} />
                  {f.key === "ADVERSE_SPEND" && p.gamblingLink && <CrossLink href="/spending?category=gambling">{t.list.gambling}</CrossLink>}
                  {f.key === "LOAN_AMOUNT_AND_TYPE" && <CrossLink href="/loans">{t.list.borrowing}</CrossLink>}
                </li>
              ))}
            </ul>
            {p.room.length > 0 && <SampleTag q="Points available" present={p.present} className="mt-t1" />}
            {p.room.length === 0 && (
              <ul>{p.other.map((f) => <li key={f.key} className="border-t border-divider"><FactorButton f={f} onOpen={() => show(f.key)} /></li>)}</ul>
            )}
            {p.room.length > 0 && p.other.length > 0 && (
              <>
                <button type="button" aria-expanded={others} aria-controls="other-factors" onClick={() => setOthers((v) => !v)}
                  className="mt-t2 flex min-h-tap w-full items-center justify-between gap-t3 border-t border-divider pb-t1 pt-t3 text-left">
                  <span>
                    <span className="block text-body14 font-bold text-text">{t.list.others(p.other.length)}</span>
                    {p.strongest && <span className="block text-meta text-text-muted">{t.list.strongest(p.strongest.name, p.strongest.value!.toFixed(1))}</span>}
                  </span>
                  <span className="inline-flex items-center gap-t1 text-meta font-semibold text-accent">{others ? t.list.hide : t.list.show}<ChevronDown aria-hidden size={16} className={cx("transition-transform", others && "rotate-180")} /></span>
                </button>
                <ul id="other-factors" hidden={!others}>
                  {p.other.map((f) => <li key={f.key} className="border-t border-divider"><FactorButton f={f} onOpen={() => show(f.key)} /></li>)}
                </ul>
              </>
            )}
          </div>
        </Section>

        {p.trend.length >= 2 && (
          <Section id="s-trend" n={4} title={t.sections.trend.title} desc={t.sections.trend.desc}>
            <TrendCard trend={p.trend} state={p.state} />
            <button type="button" onClick={() => setHow(true)}
              className="flex min-h-[56px] w-full items-center justify-between rounded-card-s bg-surface px-t5 text-left text-body font-bold text-text shadow-card sm:rounded-card">
              {t.howItWorks}<ChevronRight aria-hidden size={18} className="text-icon-muted" />
            </button>
          </Section>
        )}
        {p.trend.length < 2 && (
          <button type="button" onClick={() => setHow(true)}
            className="flex min-h-[56px] w-full items-center justify-between rounded-card-s bg-surface px-t5 text-left text-body font-bold text-text shadow-card sm:rounded-card">
            {t.howItWorks}<ChevronRight aria-hidden size={18} className="text-icon-muted" />
          </button>
        )}
      </div>

      <Sheet open={how} onClose={() => setHow(false)} title={t.howItWorks}>
        <div className="flex flex-col gap-t3 text-body14 text-text-secondary">
          {t.howBody.map((x) => <p key={x}>{x}</p>)}
          <p>{t.incomeMix}</p>
          <p>{t.stagesNote} <SampleTag q="Q4" present={p.present} /></p>
        </div>
      </Sheet>

      <Sheet open={!!panel} onClose={close} onBack={related ? () => setRelated(false) : undefined}
        title={related && panel?.related ? panel.related.title : panel ? `${panel.factor.name}` : ""}
        subtitle={related ? undefined : panel ? `${panel.factor.value === null ? "—" : `${panel.factor.value.toFixed(1)} / 10`}${p.scoredAt ? ` · ${formatUpdated(p.scoredAt)}` : ""}` : undefined}
        footer={panel?.related && !related ? (
          <>
            <p className="text-caption text-text-muted">{t.related}</p>
            <button type="button" onClick={() => setRelated(true)} className="flex min-h-[64px] w-full items-center gap-t3 rounded-sm bg-accent-soft px-t4 text-left text-body-strong text-accent hover:shadow-[inset_0_0_0_2px_var(--color-accent)]">
              <span className="flex-1">{panel.related.title}</span><ChevronRight aria-hidden size={20} />
            </button>
          </>
        ) : related && panel?.related ? (
          <Button full variant="secondary" onClick={() => router.push(panel.related!.action.href)}>{panel.related.action.label}</Button>
        ) : undefined}>
        {panel && !related && (
          <div className="flex flex-col gap-t6">
            <section><h3 className="text-h3 text-text">{t.measures}</h3><p className="mt-t2 text-small text-text-muted">{panel.factor.explains}.</p></section>
            <section>
              <h3 className="text-h3 text-text">{t.driving}</h3>
              <ul className="mt-t2 flex list-disc flex-col gap-t2 pl-t5 text-small text-text-muted marker:text-neutral">
                {panel.drivers.map((d) => <li key={d.text}>{d.text}{d.sample && <SampleTag q="Q2" present={p.present} className="ml-t2" />}</li>)}
              </ul>
            </section>
            {panel.factor.value !== null && <section><h3 className="text-h3 text-text">{t.lifts}</h3><p className="mt-t2 text-small text-text-muted">{panel.factor.lifts.replace(/\.$/, "")}.{panel.factor.key === "PRODUCTIVE_SPEND" && <SampleTag q="Q2" present={p.present} className="ml-t2" />}</p></section>}
          </div>
        )}
        {panel?.related && related && (
          <InsightSheetBody item={{ id: panel.related.id, context: panel.related.factor, title: panel.related.title, summary: panel.related.why, happening: panel.related.sheet.happening, wouldChange: panel.related.sheet.wouldChange, ifYouWant: panel.related.sheet.ifYouWant }} />
        )}
      </Sheet>
    </div>
  );
}

// ---- 1 Where you stand ---------------------------------------------------------------------------------------

function Stand({ state, attribution, previous, direction, since, onOpen, stagesSample, present }: ScoreViewProps & { since: string | null; onOpen: (k: FactorKey) => void }) {
  if (state.kind !== "scored") {
    return (
      <HeroCard labelledBy="ss-h">
        <div className="flex items-start gap-t3">
          <Info aria-hidden size={20} className="mt-[2px] shrink-0 text-hero-on-muted" />
          <div>
            <h3 id="ss-h" className="text-body font-bold">{copy.score.factorNull}</h3>
            <p className="mt-t1 text-body14 text-hero-on-muted">{state.kind === "override" && state.override === "thin_file" ? copy.score.thinFile : copy.score.unavailable}</p>
            {state.kind === "override" && state.estimatedReadyDate && <p className="mt-t1 text-meta text-hero-on-muted">{copy.score.thinFileDate(formatDate(state.estimatedReadyDate))}</p>}
          </div>
        </div>
      </HeroCard>
    );
  }
  const { score, stage } = state;
  const delta = previous ? score - previous.score : null;
  return (
    <>
      <HeroCard labelledBy="ss-h">
        <div className="flex flex-wrap items-center gap-t2">
          <h3 id="ss-h" className="text-body14 text-hero-on-muted">{t.hero.label}</h3>
          <span className="inline-flex items-center gap-t2 rounded-pill bg-hero-glass px-t3 py-[4px] text-meta font-bold">
            <span aria-hidden className={cx("h-[7px] w-[7px] rounded-pill", direction?.dir === "down" ? "bg-hero-caution-mark" : direction?.dir === "up" ? "bg-hero-positive-mark" : "bg-hero-on-muted")} />
            {direction ? t.hero.direction(stage.name, direction.dir, direction.weeks) : stage.name}
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-x-t4 gap-y-t1">
          <p className="tnum text-[4rem] font-extrabold leading-none tracking-[-0.03em]"><span className="sr-only">{t.hero.sr(score, stage.name)}</span><span aria-hidden>{score}</span></p>
          <div className="pb-[6px]">
            {delta !== null && since && <p className="tnum text-body font-bold">{t.hero.change(delta, since)}</p>}
            <p className="tnum text-meta text-hero-on-muted">{previous ? t.hero.was(previous.score) : t.hero.outOf}</p>
          </div>
        </div>
        <HeroBandBar score={score} bandId={stage.stage.id} />
        <p className="tnum rounded-[14px] bg-hero-glass px-[14px] py-t3 text-body14">{stage.next ? t.hero.toNext(stage.next.pointsToGo, stage.next.name, stage.next.at) : t.hero.top}</p>
        {stagesSample && <SampleTag q="Q4 stage bands" present={present} className="self-start" />}
      </HeroCard>

      {attribution && attribution.parts.length > 0 && since && (
        <div className="rounded-card-s bg-surface px-t5 pb-t4 pt-t5 shadow-card sm:rounded-card">
          <div className="flex flex-wrap items-baseline justify-between gap-t3">
            <h3 className="text-card text-text">{t.changed.title}</h3>
            <span className="tnum text-meta text-text-muted">{t.changed.range(attribution.from.score, attribution.to.score, since)}</span>
          </div>
          <ul className="mt-t2">
            {attribution.parts.map((x) => (
              <li key={x.factor} className="border-b border-divider last:border-b-0">
                <button type="button" onClick={() => onOpen(x.factor)} className="flex min-h-tap w-full items-center gap-t3 py-t3 text-left text-text">
                  <span className="min-w-0 flex-1">
                    <span className="block text-body14 font-semibold">{x.name} <span className="tnum font-medium text-text-muted">{x.from.toFixed(1)} → {x.to.toFixed(1)}</span></span>
                    {x.reason && <span className="block text-meta text-text-muted">{x.reason}</span>}
                  </span>
                  <span className={cx("tnum text-body14 font-bold", x.points < 0 ? "text-negative" : x.points > 0 ? "text-positive" : "text-text-muted")}>{signed(x.points)}</span>
                  <ChevronRight aria-hidden size={16} className="shrink-0 text-icon-muted" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-t2 text-meta-s text-text-muted">{t.changed.footnote(signed(attribution.delta))} <SampleTag q="Q3" present={present} /></p>
        </div>
      )}
    </>
  );
}

function HeroBandBar({ score, bandId }: { score: number; bandId: string }) {
  return (
    <ol aria-label={`Bands: ${STAGES.map((s) => stageNames[s.id]).join(", ")}`} className="grid grid-cols-4 gap-[4px]">
      {STAGES.map((b) => {
        const here = b.id === bandId;
        const at = here ? Math.round(((score - b.min) / (b.max - b.min + 1)) * 100) : null;
        return (
          <li key={b.id} aria-current={here ? "step" : undefined} className="relative flex flex-col gap-t2">
            <span aria-hidden className={cx("h-[8px] rounded-pill", !here && "bg-hero-glass")} style={here ? { background: `var(--band-${b.id})` } : undefined} />
            {at !== null && <span aria-hidden className="absolute -top-[3px] h-[14px] w-[14px] rounded-pill bg-hero-on shadow-[0_0_0_3px_var(--hero-from)]" style={{ left: `calc(${at}% - 7px)` }} />}
            <span className={cx("text-meta-s", here ? "font-bold text-hero-on" : "text-hero-on-muted")}>{stageNames[b.id]}</span>
          </li>
        );
      })}
    </ol>
  );
}

// ---- 2 Next step -------------------------------------------------------------------------------------------------

function NextStep({ plan, action, projection, shortfall, present }: ScoreViewProps) {
  const steps = plan?.progress.steps ?? [];
  const current = plan?.progress.current ?? null;
  const step = current !== null ? steps[current] : null;
  if (!plan && !action && !projection) return <p className="rounded-card-s bg-surface p-t5 text-body14 text-text-muted shadow-card sm:rounded-card">{t.next.none}</p>;
  return (
    <div className="flex flex-col gap-t4 rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
      <div>
        <div className="flex items-center justify-between gap-t3">
          <span className="text-meta text-text-muted">{plan && current !== null ? t.next.plan(current + 1, steps.length) : t.next.nextStep}</span>
          {plan && <Link href="/money-plan" className="inline-flex min-h-tap items-center text-meta font-semibold text-accent">{t.next.seePlan}</Link>}
        </div>
        {plan && steps.length > 0 && (
          <div aria-hidden className="mt-t2 grid gap-[4px]" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
            {steps.map((s, i) => <span key={i} className={cx("h-[6px] rounded-pill", s.status === "upcoming" ? "bg-surface2" : "bg-accent")} />)}
          </div>
        )}
        <h3 className="mt-t3 text-[1.125rem] font-bold text-text">{plan?.title ?? action?.title}</h3>
        {step && <p className="mt-[2px] text-body14 text-text-secondary">{t.next.thisStep(step.label)}</p>}
      </div>
      {(action || projection) && (
        <div className="flex flex-wrap gap-t3">
          {action && (
            <div className="flex-[1_1_220px] rounded-[16px] bg-surface2 px-t4 py-[14px]">
              <p className="text-meta-s font-bold uppercase tracking-[0.04em] text-text-muted">{t.next.tryThis}</p>
              <p className="mt-t1 text-body14 font-bold text-text">{action.title}</p>
            </div>
          )}
          {projection && (
            <div className="flex-[1_1_160px] rounded-[16px] bg-surface2 px-t4 py-[14px]">
              <p className="text-meta-s font-bold uppercase tracking-[0.04em] text-text-muted">{t.next.couldReach}</p>
              <p className="tnum mt-t1"><span className="text-[1.375rem] font-extrabold text-text">~{projection.to}</span> <span className="text-meta text-text-muted">{t.next.by(formatDayMonth(projection.by))}</span></p>
              <SampleTag q="Q3" present={present} className="mt-t1" />
            </div>
          )}
        </div>
      )}
      {shortfall && (
        <div role="note" className="flex flex-col gap-[6px] rounded-[16px] bg-caution-soft px-t4 py-[14px]">
          <p className="flex items-start gap-t2 text-body14 font-bold text-text"><TriangleAlert aria-hidden size={18} className="mt-[1px] shrink-0 text-caution" />{t.next.short(`$${shortfall.amount}`, formatShortDay(shortfall.payday))}</p>
          <p className="text-meta text-text-secondary">{t.next.shortBody}</p>
          <Link href="/hardship" className="inline-flex min-h-tap items-center self-start text-meta font-bold text-accent-strong underline-offset-2 hover:underline">{t.next.shortLink} <span aria-hidden>&nbsp;→</span></Link>
        </div>
      )}
    </div>
  );
}

// ---- 3 What's behind it ------------------------------------------------------------------------------------------

function FactorButton({ f, strong = false, onOpen }: { f: FactorLine; strong?: boolean; onOpen: () => void }) {
  const v = f.value === null ? "—" : f.value.toFixed(1);
  return (
    <button type="button" onClick={onOpen} className="grid w-full grid-cols-[minmax(0,1fr)_64px_80px] items-center gap-t2 py-t3 text-left text-text">
      <span className="min-w-0">
        <span className={cx("block text-body14", strong ? "font-bold" : "font-semibold")}>{f.name}</span>
        {strong && f.reason && <span className="block text-meta text-text-muted">{f.reason}</span>}
        <span aria-hidden className="mt-t2 block h-[6px] max-w-[260px] overflow-hidden rounded-pill bg-surface2">
          <span className="block h-full rounded-pill bg-accent" style={{ width: `${(f.value ?? 0) * 10}%` }} />
        </span>
      </span>
      <span className="tnum text-right text-body14 font-bold">{v}{f.value !== null && <span className="text-meta-s font-medium text-text-muted"> {t.list.outOf}</span>}</span>
      <span className="tnum text-right text-meta font-semibold text-text-secondary">{changeText(f.change)}</span>
    </button>
  );
}

function CrossLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="-mt-t1 mb-t2 inline-flex min-h-tap items-center text-meta font-semibold text-accent">{children}<span aria-hidden>&nbsp;→</span></Link>;
}

// ---- 4 Over time -------------------------------------------------------------------------------------------------

function TrendCard({ trend, state }: { trend: { date: string; score: number }[]; state: ScoreState }) {
  // Drawn at the card's real width, so labels stay at their real size on phones.
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(480);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e!.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const first = trend[0]!, last = trend.at(-1)!;
  const weeks = Math.round((Date.parse(last.date) - Date.parse(first.date)) / (7 * 864e5));
  const delta = last.score - first.score;
  // The axis runs from the current band's start to the next band's threshold, so the slope isn't exaggerated.
  const band = state.kind === "scored" ? state.stage : null;
  const lo = Math.min(band?.stage.min ?? Math.min(...trend.map((x) => x.score)), ...trend.map((x) => x.score));
  const nextAt = band?.next?.at ?? null;
  const hi = Math.max(nextAt ?? band?.stage.max ?? Math.max(...trend.map((x) => x.score)), ...trend.map((x) => x.score));
  const W = width, H = 200, L = 40, R = W - 6, TOP = 50, BASE = 140;
  const y = (s: number) => BASE - ((s - lo) / Math.max(1, hi - lo)) * (BASE - TOP);
  const x = (i: number) => (trend.length === 1 ? (L + R) / 2 : L + 18 + (i / (trend.length - 1)) * (R - 18 - L - 18));
  const sr = t.over.sr(formatDate(first.date), formatDate(last.date), trend.map((p) => p.score).join(", "), band?.next?.name ?? null, nextAt);
  return (
    <div className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
      <div className="flex items-center justify-between gap-t3">
        <h3 className="text-card text-text">{t.over.title(weeks)}</h3>
        <span className={cx("tnum rounded-pill px-[10px] py-[3px] text-meta-s font-bold", delta < 0 ? "bg-negative-soft text-negative" : delta > 0 ? "bg-positive-soft text-positive" : "bg-chip text-text-secondary")}>{t.over.chip(delta, formatDayMonth(first.date))}</span>
      </div>
      <div ref={box} className="mt-t3">
      <svg role="img" aria-label={sr} width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full font-[inherit]">
        {nextAt && <>
          <line x1={L} x2={R} y1={y(nextAt)} y2={y(nextAt)} strokeWidth={1.5} strokeDasharray="4 4" style={{ stroke: "var(--color-positive)" }} />
          <text x={R} y={y(nextAt) - 6} textAnchor="end" fontSize={11} fontWeight={700} style={{ fill: "var(--color-positive)" }}>{t.over.healthyLine(band!.next!.name, nextAt)}</text>
          <text x={L - 6} y={y(nextAt) + 4} textAnchor="end" fontSize={10} style={{ fill: "var(--color-text-muted)" }}>{nextAt}</text>
        </>}
        <line x1={L} x2={R} y1={y(lo)} y2={y(lo)} strokeWidth={1} style={{ stroke: "var(--color-line)" }} />
        {band && <text x={R} y={y(lo) + 16} textAnchor="end" fontSize={11} style={{ fill: "var(--color-text-muted)" }}>{t.over.baseLine(band.name, lo)}</text>}
        <text x={L - 6} y={y(lo) + 4} textAnchor="end" fontSize={10} style={{ fill: "var(--color-text-muted)" }}>{lo}</text>
        <polyline points={trend.map((p, i) => `${x(i)},${y(p.score)}`).join(" ")} fill="none" strokeWidth={2.5} strokeLinejoin="round" style={{ stroke: "var(--color-accent)" }} />
        {trend.map((p, i) => {
          const isLast = i === trend.length - 1;
          return (
            <g key={p.date}>
              <circle cx={x(i)} cy={y(p.score)} r={isLast ? 5 : 4} strokeWidth={2} style={{ fill: isLast ? "var(--color-accent)" : "var(--color-surface)", stroke: "var(--color-accent)" }} />
              <text x={x(i)} y={y(p.score) - 10} textAnchor="middle" fontSize={isLast ? 12 : 11} fontWeight={isLast ? 700 : 400} style={{ fill: "var(--color-text)" }}>{p.score}</text>
              <text x={x(i)} y={H - 10} textAnchor="middle" fontSize={10} style={{ fill: "var(--color-text-muted)" }}>{formatDayMonth(p.date)}</text>
            </g>
          );
        })}
      </svg>
      </div>
    </div>
  );
}
