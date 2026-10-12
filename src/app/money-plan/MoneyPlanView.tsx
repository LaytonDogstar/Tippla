"use client";
// Your money plan (12/10/2026; reference: tippla-money-plan-mockup.dc.html). One column: where the last full pay
// cycle's money went, then the cards ranked by dollar impact a pay cycle (the member's plan first), Your progress,
// Smaller wins, the SmartScore link and the footer. Each card has one main action; "Remind me next pay cycle",
// "Not relevant to me" and "Switch plan" sit behind "More options". Hides and ticks are kept per pay cycle.
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Ban, Check, ChevronDown, Circle, CircleDot, CreditCard, Ellipsis, ExternalLink, Phone } from "lucide-react";
import { moneyPlan as t } from "@/content/moneyPlan";
import { planCopy } from "@/content/plans";
import { billSwitchCopy } from "@/content/actions";
import { gamblingSupport } from "@/content/support";
import { NDH } from "@/config/services";
import { PLAN_ADVANCE_STEPS } from "@/config/flags";
import { ENERGY_COMPARE_VIC, PROGRAMS } from "@/data/directories";
import { formatDayMonth, formatShortDay, formatWhole } from "@/lib/format";
import type { PersonaId } from "@/lib/api/types";
import type { AccountState, PlanType } from "@/lib/account/state";
import type { PlanProgress } from "@/lib/selectors/plans";
import type { Lender, MoneyWent, ProgressRow, SpendGroup, Win } from "@/lib/selectors/moneyPlan";
import { useAccount } from "@/lib/account/client";
import { track } from "@/lib/analytics/client";
import { loadCyclePrefs, saveCyclePrefs, type CyclePref } from "@/lib/ui/cyclePrefs";
import { useStepEvents } from "@/components/domain/PlanCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Form";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Feedback";
import { cx } from "@/components/ui/cx";

type Range = { start: string; end: string };
type Run = { provider: string; count: number; since: string; amount: number; fee: number | null } | null;
type Gambling = { total: number; shareOfPay: number; operators: string[]; thisCycle: number } | null;
type Progress = { last: Range; now: Range; asOf: string; rows: ProgressRow[] } | null;

export interface MoneyPlanViewProps {
  persona: PersonaId; account: AccountState; asOf: string; present: boolean;
  last: Range | null; now: Range; next: Range;
  went: MoneyWent | null;
  nowAdvances: { date: string; amount: number; provider: string }[];
  run: Run;
  take: { low: number; high: number } | null;
  shortfall: number;
  lenders: Lender[];
  gambling: Gambling;
  progress: Progress;
  wins: Win[];
  state: string;
  plan: PlanProgress | null; options: PlanType[]; suggested: PlanType | null;
}

const card = "rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card";
const pct = (n: number) => `${Math.round(n * 100)}%`;
const range = (r: Range) => `${formatDayMonth(r.start)}–${formatDayMonth(r.end)}`;
const calendarHref = (r: Range) => `/calendar?from=${r.start}&to=${r.end}`;
/** Category tokens for the six groups; every other group is striped too, so colour is never the only cue. */
const GROUP_STYLE: Record<SpendGroup, { color: string; striped: boolean }> = {
  rent: { color: "var(--cat-housing)", striped: false },
  everyday: { color: "var(--cat-food)", striped: true },
  gambling: { color: "var(--cat-gambling)", striped: false },
  loans: { color: "var(--cat-loan-repayment)", striped: true },
  advance: { color: "var(--cat-wage-advance)", striped: false },
  bills: { color: "var(--cat-bills)", striped: true },
};
const fill = (g: SpendGroup) => ({
  backgroundColor: GROUP_STYLE[g].color,
  backgroundImage: GROUP_STYLE[g].striped ? "repeating-linear-gradient(135deg, rgba(255,255,255,.4) 0 3px, transparent 3px 7px)" : undefined,
});

export function MoneyPlanView(p: MoneyPlanViewProps) {
  const cycleKey = `${p.persona}:${p.now.start}`;
  const allKey = `${p.persona}:always`;
  const [prefs, setPrefs] = useState<Record<string, CyclePref>>({});
  const [always, setAlways] = useState<Record<string, CyclePref>>({});
  useEffect(() => { setPrefs(loadCyclePrefs(cycleKey)); setAlways(loadCyclePrefs(allKey)); }, [cycleKey, allKey]);
  const setPref = (id: string, v: CyclePref | null) => {
    const next = { ...prefs }; if (v) next[id] = v; else delete next[id];
    setPrefs(next); saveCyclePrefs(cycleKey, next);
  };
  const setAlwaysPref = (id: string, v: CyclePref | null) => {
    const next = { ...always }; if (v) next[id] = v; else delete next[id];
    setAlways(next); saveCyclePrefs(allKey, next);
  };
  const hideState = (id: string): "snoozed" | "hidden" | null => (always[id] === "hidden" ? "hidden" : prefs[id] === "snoozed" ? "snoozed" : null);
  const menu = (id: string) => ({
    onRemind: () => setPref(id, "snoozed"),
    onNotRelevant: () => setAlwaysPref(id, "hidden"),
  });
  const restore = (id: string) => { setPref(id, null); setAlwaysPref(id, null); };

  const repayTotal = Math.round(p.lenders.reduce((s, l) => s + l.perCycle, 0));
  // Ranked by dollar impact a pay cycle; the member's plan always comes first.
  const others = [
    p.lenders.length ? { id: "repay", impact: repayTotal } : null,
    p.gambling ? { id: "gambling", impact: p.gambling.total } : null,
  ].filter((x): x is { id: string; impact: number } => !!x).sort((a, b) => b.impact - a.impact);
  const nonRentMax = Math.max(0, ...(p.went?.groups.filter((g) => g.group !== "rent" && g.group !== "loans" && g.group !== "advance").map((g) => g.total) ?? []));
  const cardsBelow = others.some((o) => !hideState(o.id));

  const titles: Record<string, string> = { plan: p.plan?.title ?? "", repay: t.repay.title(formatWhole(repayTotal)), gambling: t.gambling.title(formatWhole(p.gambling?.total ?? 0)) };
  const hiddenRow = (id: string) => {
    const s = hideState(id)!;
    return (
      <p key={id} role="status" className="flex flex-wrap items-center justify-between gap-t2 rounded-card-s bg-surface px-t5 py-t3 text-meta text-text-muted shadow-card sm:rounded-card">
        <span>{s === "snoozed" ? t.snoozed(titles[id]!) : t.dismissed(titles[id]!)}</span>
        <Button variant="link" onClick={() => restore(id)}>{t.undo}</Button>
      </p>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[660px] flex-col gap-t5 pb-t7">
      <p className="px-[2px] text-body14 text-text-muted">{p.last ? t.sub(formatShortDay(p.last.start), formatShortDay(p.last.end)) : t.subNoCycle}</p>

      {p.went ? <WhereItWent went={p.went} run={p.run} /> : <p className={cx(card, "text-body14 text-text-muted")}>{t.went.none}</p>}

      {p.plan && (hideState("plan") ? hiddenRow("plan") : (
        <PlanCardV2 {...p} plan={p.plan} cardsBelow={cardsBelow} menu={menu("plan")} />
      ))}
      {others.map((o) => (hideState(o.id) ? hiddenRow(o.id)
        : o.id === "repay" ? <RepaymentsCard key="repay" lenders={p.lenders} total={repayTotal} paid={p.went?.paid ?? 0} gap={(p.went?.net ?? 0) < 0 || p.shortfall > 0}
            biggest={!!p.went?.groups.some((g) => g.group === "rent") && repayTotal >= nonRentMax} menu={menu("repay")} />
        : <GamblingCard key="gambling" g={p.gambling!} menu={menu("gambling")} />))}
      {!p.plan && !others.length && <p className={cx(card, "text-body14 text-text-muted")}>{t.noCards}</p>}

      {p.progress && <ProgressCard progress={p.progress} />}
      <SmallerWins wins={p.wins} prefs={prefs} toggle={(id, on) => setPref(id, on ? "done" : null)} state={p.state} />

      <section aria-labelledby="mp-score-h" className={cx(card, "flex flex-col gap-t2")}>
        <h2 id="mp-score-h" className="text-body font-extrabold text-text">{t.score.title}</h2>
        <p className="text-meta text-text-secondary">{t.score.body}</p>
        <Link href="/score" className="inline-flex min-h-tap items-center self-start text-body14 font-bold text-accent underline-offset-2 hover:underline">{t.score.link}</Link>
      </section>

      <p className="max-w-[600px] px-[2px] text-meta-s text-text-muted">{t.footer}</p>
    </div>
  );
}

// ---- Where your money went ------------------------------------------------------------------------------------------

function WhereItWent({ went, run }: { went: MoneyWent; run: Run }) {
  const gap = -went.net;
  const headline = Math.round(gap) > 0 ? t.went.over(formatWhole(gap)) : Math.round(went.net) > 0 ? t.went.under(formatWhole(went.net)) : t.went.even;
  const label = (g: SpendGroup, merchants: string[]) => (g === "advance" && merchants.length === 1 ? `${merchants[0]} repayment` : t.went.groups[g]);
  const hint = (g: MoneyWent["groups"][number]) => {
    const share = pct(g.shareOfPay);
    if (g.group === "everyday") return t.went.everydayHint(share);
    if (g.group === "loans") return t.went.loansHint(share, g.merchants.length);
    if (g.group === "advance") return t.went.advanceHint(share, run?.fee ? formatWhole(run.fee) : null);
    return t.went.ofPay(share);
  };
  const parts = went.groups.map((g) => `${t.went.groupsSpoken[g.group]} ${pct(g.total / went.spent)}`).join(", ");
  const ranOut = went.payRanOutAt;
  const first = went.advances[0];
  // Only worth saying when it is a real part of the pay (10% or more).
  const heavy = went.heavyShare >= 0.1 ? t.went.heavy(t.went.shareWords(went.heavyShare) ?? pct(went.heavyShare)) : null;
  const covered = gap >= 1 ? (first ? t.went.coveredBy(formatWhole(gap), formatWhole(first.amount), first.provider, formatDayMonth(first.date)) : t.went.coveredByBalance(formatWhole(gap))) : null;
  return (
    <section aria-labelledby="mp-went-h" className={cx(card, "flex flex-col gap-t4")}>
      <div className="flex flex-wrap items-baseline justify-between gap-t2">
        <h2 id="mp-went-h" className="text-[1.25rem] font-extrabold leading-7 tracking-[-0.01em] text-text">{headline}</h2>
        <span className="text-meta text-text-muted">{t.went.paidSpent(formatWhole(went.paid), formatWhole(went.spent))}</span>
      </div>
      {went.spent > 0 && (
        <div className="flex flex-col gap-[6px]">
          <div role="img" aria-label={t.went.barLabel(parts, ranOut !== null ? pct(ranOut) : null)} className="relative flex h-[34px] gap-[2px] overflow-hidden rounded-[10px] bg-surface2">
            {went.groups.map((g) => <div key={g.group} className="h-full" style={{ width: `${(g.total / went.spent) * 100}%`, ...fill(g.group) }} />)}
            {ranOut !== null && <div aria-hidden className="absolute inset-y-0 w-[3px] bg-text shadow-[0_0_0_2px_var(--color-surface)]" style={{ left: `${ranOut * 100}%` }} />}
          </div>
          {ranOut !== null && (
            <div aria-hidden className="relative h-[18px] text-meta-s font-bold text-text">
              <span className="absolute whitespace-nowrap" style={ranOut > 0.5 ? { right: `${(1 - ranOut) * 100}%` } : { left: `${ranOut * 100}%` }}>
                {ranOut > 0.5 ? `${t.went.ranOut} ↑` : `↑ ${t.went.ranOut}`}
              </span>
            </div>
          )}
        </div>
      )}
      <ul className="grid grid-cols-2 gap-x-[18px] gap-y-[14px] sm:grid-cols-3">
        {went.groups.map((g) => (
          <li key={g.group} className="flex min-w-0 items-start gap-[10px]">
            <span aria-hidden className="mt-[4px] h-[12px] w-[12px] shrink-0 rounded-[3px]" style={fill(g.group)} />
            <span className="flex min-w-0 flex-col gap-[2px]">
              <span className="text-meta font-semibold text-text-secondary">{label(g.group, g.merchants)}</span>
              <span className="text-body font-extrabold tabular-nums text-text">{formatWhole(g.total)}</span>
              <span className="text-meta-s text-text-muted">{hint(g)}</span>
            </span>
          </li>
        ))}
      </ul>
      {(covered || heavy) && <p className="text-meta text-text-muted">{[covered, heavy].filter(Boolean).join(" ")}</p>}
    </section>
  );
}

// ---- More options -------------------------------------------------------------------------------------------------

function MoreMenu({ items }: { items: { label: string; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); box.current?.querySelector<HTMLButtonElement>("button")?.focus(); } };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={box} className="relative shrink-0">
      <button type="button" aria-label={t.more} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)}
        className="flex h-tap w-tap items-center justify-center rounded-pill border border-line bg-surface text-text-secondary hover:bg-surface2">
        <Ellipsis aria-hidden size={18} />
      </button>
      {open && (
        <ul className="absolute right-0 top-[50px] z-10 flex min-w-[220px] flex-col rounded-[12px] border border-line bg-surface p-[6px] shadow-e2">
          {items.map((it) => (
            <li key={it.label}>
              <button type="button" onClick={() => { setOpen(false); it.onClick(); }}
                className="flex min-h-tap w-full items-center rounded-[8px] px-t3 text-left text-body14 text-text hover:bg-surface2">{it.label}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type MenuActions = { onRemind: () => void; onNotRelevant: () => void };

function CardHead({ id, eyebrow, title, accent, menu }: { id: string; eyebrow: string; title: string; accent?: boolean; menu: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-t3">
      <div className="flex min-w-0 flex-col gap-[6px]">
        <span className={cx("text-meta-s font-bold uppercase tracking-[0.04em]", accent ? "text-accent-strong" : "text-text-muted")}>{eyebrow}</span>
        <h2 id={id} className="text-[1.25rem] font-extrabold leading-7 tracking-[-0.01em] text-text">{title}</h2>
      </div>
      {menu}
    </div>
  );
}

// ---- The plan (Get off pay advances, or the member's other plan) -------------------------------------------------

function PlanCardV2(p: MoneyPlanViewProps & { plan: PlanProgress; cardsBelow: boolean; menu: MenuActions }) {
  const { plan } = p;
  const { update } = useAccount(p.persona, p.account);
  const toast = useToast();
  const [switching, setSwitching] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [limit, setLimit] = useState("");
  useStepEvents(plan);
  const advances = plan.type === "off_advances";
  const start = (type: PlanType) => {
    track(p.account.plan || plan.explicit ? "plan_switched" : "plan_started", { plan_type: type });
    update((l) => ({ ...l, plan: { type, startedAt: p.asOf } }));
    setSwitching(false);
    toast({ kind: "confirm", message: planCopy.started(planCopy.titles[type]) });
  };
  const markDone = (i: number) => update((l) => ({ ...l, plan: { ...(l.plan ?? { type: plan.type, startedAt: plan.startedAt }), manual: { ...l.plan?.manual, [String(i)]: p.asOf } } }));
  const saveLimit = () => {
    const n = Number(limit.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(n) || n < 0 || n > 5000) return;
    update((l) => ({ ...l, plan: { ...(l.plan ?? { type: plan.type, startedAt: plan.startedAt }), limit: Math.round(n) } }));
  };
  const nowTotal = p.nowAdvances.reduce((s, a) => s + a.amount, 0);
  /** The current advance step's status line: this cycle's dates and any advance taken. */
  const advanceLine = (i: number) => {
    const max = PLAN_ADVANCE_STEPS[i] ?? 0;
    const head = t.plan.thisCycle(formatDayMonth(p.now.start), formatDayMonth(p.now.end));
    if (!p.nowAdvances.length) return `${head}: ${t.plan.noneYet(formatWhole(max))}`;
    const taken = t.plan.taken(formatWhole(nowTotal), p.nowAdvances.map((a) => formatDayMonth(a.date)).join(" and "));
    return `${head}: ${taken}, ${nowTotal > max ? t.plan.over : t.plan.underSoFar(formatWhole(max))}`;
  };
  const run = p.run;
  const body = advances && run
    ? run.count > 1
      ? t.plan.run(formatWhole(run.amount), run.provider, formatDayMonth(run.since), run.fee ? formatWhole(run.fee) : null, run.fee ? formatWhole(run.amount + run.fee) : null)
      : t.plan.runOnce(formatWhole(run.amount), run.provider, formatDayMonth(run.since))
    : null;
  const showPlanNext = advances || plan.type === "reach_payday";
  const current = plan.current !== null ? plan.steps[plan.current] : null;
  return (
    <section aria-labelledby="mp-plan-h" className={cx(card, "flex flex-col gap-t4 ring-1 ring-inset ring-accent-tint2")}>
      <CardHead id="mp-plan-h" accent eyebrow={plan.explicit ? t.plan.eyebrow : t.plan.eyebrowSuggested} title={plan.title}
        menu={<MoreMenu items={[{ label: t.switchPlan, onClick: () => setSwitching(true) }, { label: t.remind, onClick: p.menu.onRemind }, { label: t.notRelevant, onClick: p.menu.onNotRelevant }]} />} />
      {body && <p className="text-body14 text-text-secondary">{body}</p>}
      {plan.type === "gambling_less" && <p className="text-meta text-text-muted">{planCopy.optIn}</p>}
      <ol className="flex flex-col gap-[14px]">
        {plan.steps.map((s, i) => {
          const Icon = s.status === "done" ? Check : s.status === "current" ? CircleDot : Circle;
          return (
            <li key={s.label} aria-current={s.status === "current" ? "step" : undefined} className="flex items-start gap-t3">
              <Icon aria-hidden size={22} className={cx("mt-[1px] shrink-0", s.status === "upcoming" ? "text-icon-muted" : "text-accent")} />
              <div className="flex min-w-0 flex-col gap-[3px]">
                <span className={cx("text-meta-s font-bold", s.status === "upcoming" ? "text-text-muted" : "text-accent-strong")}>{t.plan.stepStatus(i + 1, plan.steps.length, s.status)}</span>
                <span className={cx("text-body", s.status === "current" ? "font-bold text-text" : "font-semibold text-text")}>{s.label}</span>
                {s.doneOn && <span className="text-meta text-text-muted">{planCopy.done(formatDayMonth(s.doneOn))}</span>}
                {s.status === "current" && (
                  <div className="flex flex-col gap-t2">
                    {advances
                      ? <span className="text-meta text-text-muted">{advanceLine(i)}</span>
                      : <>
                          {s.soFar && <span className="text-meta text-text-muted">{planCopy.thisCycle}: {s.soFar}</span>}
                          {s.kind === "cycle" && <span className="text-meta text-text-muted">{planCopy.carriesOver}</span>}
                        </>}
                    {plan.type === "gambling_less" && i === 0 && (
                      <form noValidate className="flex items-end gap-t2" onSubmit={(e) => { e.preventDefault(); saveLimit(); }}>
                        <div className="flex-1"><TextInput label={planCopy.limitLabel} inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} /></div>
                        <Button type="submit" variant="secondary">{planCopy.setLimit}</Button>
                      </form>
                    )}
                    {s.kind === "manual" && (
                      <div className="flex flex-wrap gap-t2">
                        {s.link && <Link href={s.link} className="inline-flex min-h-tap items-center text-meta font-semibold text-accent underline-offset-2 hover:underline">{plan.type === "gambling_less" ? planCopy.blockLink : s.label}</Link>}
                        <Button variant="secondary" onClick={() => markDone(i)}>{planCopy.manual}</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {plan.completed && <p role="status" className="text-body14 text-text">{t.plan.completed}</p>}
      {advances && p.take && (
        <div className="flex flex-col gap-t2 rounded-[14px] bg-accent-soft p-t4">
          <h3 className="text-body14 font-extrabold text-text">{t.plan.takeTitle}</h3>
          <p className="text-body14 text-text-secondary">{t.plan.take(formatWhole(Math.round(p.shortfall / 10) * 10), formatWhole(p.take.low), formatWhole(p.take.high), p.cardsBelow)}</p>
        </div>
      )}
      {showPlanNext && (
        <div className="flex flex-wrap gap-[10px]">
          <Button onClick={() => setPlanning(true)}>{t.plan.planNext}</Button>
          <ButtonLink href={calendarHref(p.now)} variant="secondary">{t.plan.seeCalendar}</ButtonLink>
        </div>
      )}

      <Sheet open={planning} onClose={() => setPlanning(false)} title={t.planSheet.title} subtitle={t.planSheet.sub(formatShortDay(p.next.start), formatShortDay(p.next.end))}>
        <div className="flex flex-col gap-t3 text-body14 text-text">
          {current && <p className="font-bold">{t.planSheet.goal(current.label)}</p>}
          {p.shortfall > 0 && <p>{t.planSheet.short(formatWhole(Math.round(p.shortfall / 10) * 10))}</p>}
          {p.lenders.length > 0 && <p>{t.planSheet.repayments(formatWhole(Math.round(p.lenders.reduce((s, l) => s + l.perCycle, 0))))}</p>}
          <h3 className="mt-t2 text-body14 font-extrabold">{t.planSheet.ideasTitle}</h3>
          <ul className="flex flex-col gap-t3">
            {t.planSheet.ideas.map((idea) => (
              <li key={idea.id} className="flex flex-col gap-t1">
                <span>{idea.text}</span>
                {idea.id === "wins"
                  ? <button type="button" onClick={() => { setPlanning(false); setTimeout(() => document.getElementById("mp-wins-h")?.scrollIntoView({ block: "start" }), 50); }}
                      className="inline-flex min-h-tap items-center self-start text-body14 font-bold text-accent underline-offset-2 hover:underline">{idea.link}</button>
                  : <Link href={idea.href ?? calendarHref(p.next)} className="inline-flex min-h-tap items-center self-start text-body14 font-bold text-accent underline-offset-2 hover:underline">{idea.link}</Link>}
              </li>
            ))}
          </ul>
          <p className="text-meta text-text-muted">{t.planSheet.note}</p>
        </div>
      </Sheet>
      <Sheet open={switching} onClose={() => setSwitching(false)} title={planCopy.switchTitle} subtitle={planCopy.switchIntro}>
        <ul className="flex flex-col gap-t2">
          {p.options.map((type) => (
            <li key={type}>
              <button type="button" onClick={() => start(type)} aria-current={type === plan.type || undefined}
                className={cx("flex min-h-tap w-full items-center justify-between gap-t3 rounded-md border p-t4 text-left", type === plan.type ? "border-accent bg-accent-soft" : "border-divider bg-surface")}>
                <span>
                  <span className="block text-body text-text">{planCopy.titles[type]}</span>
                  <span className="block text-caption text-text-muted">{type === p.suggested ? planCopy.suggested : ""}{type === "gambling_less" ? `${type === p.suggested ? " · " : ""}${planCopy.optIn}` : ""}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </section>
  );
}

// ---- Your repayments ----------------------------------------------------------------------------------------------

function RepaymentsCard({ lenders, total, paid, gap, biggest, menu }: { lenders: Lender[]; total: number; paid: number; gap: boolean; biggest: boolean; menu: MenuActions }) {
  const share = paid ? total / paid : 0;
  const shareText = paid ? t.went.shareWords(share) ?? pct(share) : null;
  const detail = (l: Lender) => {
    const kind = t.repay.kinds[l.kind];
    if (l.kind === "advance") return l.fee ? `${kind} · ${t.repay.advanceFee(formatWhole(l.fee))}` : kind;
    if (l.frequency === "monthly") return `${kind} · ${t.repay.freq.monthly}, ${t.repay.monthlyAs(formatWhole(l.amount))}`;
    if (l.frequency === "weekly") return `${kind} · ${t.repay.freq.weekly}, ${t.repay.weeklyAs(formatWhole(l.amount))}`;
    return `${kind} · ${t.repay.freq[l.frequency]}`;
  };
  return (
    <section aria-labelledby="mp-repay-h" className={cx(card, "flex flex-col gap-t4")}>
      <CardHead id="mp-repay-h" eyebrow={biggest ? t.repay.eyebrow : t.repay.eyebrowPlain} title={t.repay.title(formatWhole(total))}
        menu={<MoreMenu items={[{ label: t.remind, onClick: menu.onRemind }, { label: t.notRelevant, onClick: menu.onNotRelevant }]} />} />
      <p className="text-body14 text-text-secondary">{gap ? t.repay.body(lenders.length, shareText) : t.repay.bodyNoGap(lenders.length, paid ? pct(share) : null)}</p>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{t.repay.total}</caption>
        <tbody>
          {lenders.map((l) => (
            <tr key={l.provider} className="border-t border-divider first:border-t-0">
              <th scope="row" className="py-[11px] pr-t3 font-normal">
                <span className="block text-body14 font-bold text-text">{l.provider}</span>
                <span className="block text-meta-s text-text-muted">{detail(l)}</span>
              </th>
              <td className="whitespace-nowrap py-[11px] text-right text-body14 font-extrabold tabular-nums text-text">{formatWhole(l.perCycle)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-line">
            <th scope="row" className="py-[11px] text-body14 font-extrabold text-text">{t.repay.total}</th>
            <td className="whitespace-nowrap py-[11px] text-right text-body font-extrabold tabular-nums text-text">{formatWhole(total)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-meta-s text-text-muted">{t.repay.cantSee}</p>
      <div className="flex flex-col gap-[10px] rounded-[14px] bg-surface2 p-t4">
        <h3 className="text-body14 font-extrabold text-text">{t.repay.helpTitle}</h3>
        <p className="text-body14 text-text-secondary">{t.repay.helpBody}</p>
        <div className="flex flex-wrap gap-[10px]">
          <a href={NDH.tel}
            className="inline-flex min-h-tap items-center justify-center gap-t2 rounded-pill bg-accent px-t3 text-center text-body-strong text-on-accent">
            <Phone aria-hidden size={18} />{t.repay.call(NDH.name, NDH.phoneDisplay)}
          </a>
          <ButtonLink href="/hardship" variant="secondary" className="bg-surface">{t.repay.hardship}</ButtonLink>
        </div>
      </div>
    </section>
  );
}

// ---- Gambling -----------------------------------------------------------------------------------------------------

const OPTION_ICONS = { block: CreditCard, betstop: Ban, gho: Phone } as const;

function GamblingCard({ g, menu }: { g: NonNullable<Gambling>; menu: MenuActions }) {
  const [open, setOpen] = useState(false);
  const ops = g.operators.length > 1 ? `${g.operators.slice(0, -1).join(", ")} and ${g.operators.at(-1)}` : g.operators[0] ?? "";
  return (
    <section aria-labelledby="mp-gamb-h" className={cx(card, "flex flex-col gap-t4")}>
      <CardHead id="mp-gamb-h" eyebrow={t.gambling.eyebrow} title={t.gambling.title(formatWhole(g.total))}
        menu={<MoreMenu items={[{ label: t.remind, onClick: menu.onRemind }, { label: t.gambling.hide, onClick: menu.onNotRelevant }]} />} />
      <p className="text-body14 text-text-secondary">{t.gambling.body(pct(g.shareOfPay), ops, formatWhole(g.thisCycle))}</p>
      <ul>
        {t.gambling.options.map((o) => {
          const Icon = OPTION_ICONS[o.id as keyof typeof OPTION_ICONS];
          return (
            <li key={o.id} className="flex items-start gap-t3 border-t border-divider py-t3 first:border-t-0">
              <span aria-hidden className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent-strong"><Icon size={16} /></span>
              <span className="flex min-w-0 flex-col gap-[2px]">
                <span className="text-body14 font-bold text-text">{o.title}</span>
                <span className="text-meta text-text-muted">{o.body}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <div><Button onClick={() => setOpen(true)}>{t.gambling.cta}</Button></div>
      <Sheet open={open} onClose={() => setOpen(false)} title={gamblingSupport.title} subtitle={gamblingSupport.intro}>
        <ul className="flex flex-col gap-t4">
          {gamblingSupport.items.map((s) => (
            <li key={s.id} className="flex flex-col gap-t1">
              <span className="text-body font-bold text-text">{s.name}</span>
              <span className="text-body14 text-text-secondary">{s.body}</span>
              {s.href && (
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center gap-t1 self-start text-body14 font-bold text-accent underline-offset-2 hover:underline">
                  {new URL(s.href).hostname.replace(/^www\./, "")}<ExternalLink aria-hidden size={14} /><span className="sr-only"> {gamblingSupport.opensIn}</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      </Sheet>
    </section>
  );
}

// ---- Your progress ------------------------------------------------------------------------------------------------

function Money({ n }: { n: number }) {
  // A balance below $0 sits on the soft negative tint, with the minus sign as its label (never a saturated red).
  return n < 0
    ? <span className="inline-block rounded-[6px] bg-negative-soft px-[6px] font-extrabold tabular-nums text-negative">−{formatWhole(-n)}</span>
    : <span className="font-extrabold tabular-nums text-text">{formatWhole(n)}</span>;
}

function ProgressCard({ progress }: { progress: NonNullable<Progress> }) {
  const change = (r: ProgressRow) => {
    if (Math.round(r.change) === 0) return { text: t.progress.noChange, good: false };
    // Repayments are scheduled: a lower figure part-way through the cycle is only "so far".
    if (r.key === "loans" && r.change < 0) return { text: t.progress.soFar, good: false };
    const better = r.key === "lowest" ? r.change > 0 : r.change < 0;
    return { text: r.change < 0 ? t.progress.down(formatWhole(-r.change)) : t.progress.up(formatWhole(r.change)), good: better };
  };
  return (
    <section aria-labelledby="mp-prog-h" className={cx(card, "flex flex-col gap-t3")}>
      <div className="flex flex-col gap-t1">
        <h2 id="mp-prog-h" className="text-[1.125rem] font-extrabold text-text">{t.sections.progress.title}</h2>
        <p className="text-meta-s text-text-muted">{t.progress.sub(formatDayMonth(progress.asOf))}</p>
      </div>
      <table className="w-full table-fixed border-collapse text-left text-body14">
        <caption className="sr-only">{t.progress.caption}</caption>
        <thead>
          <tr className="text-meta-s font-bold text-text-muted">
            <td className="w-[40%] pb-t2" />
            <th scope="col" className="pb-t2 font-bold">{range(progress.last)}</th>
            <th scope="col" className="pb-t2 font-bold">{range(progress.now)}</th>
          </tr>
        </thead>
        <tbody>
          {progress.rows.map((r) => {
            const c = change(r);
            return (
              <tr key={r.key} className="border-t border-divider align-top">
                <th scope="row" className="py-[10px] pr-t2 font-semibold text-text">{t.progress.rows[r.key]}</th>
                <td className="py-[10px]"><Money n={r.last} /></td>
                <td className="py-[10px]">
                  <span className="flex flex-col items-start gap-[2px]">
                    <Money n={r.now} />
                    <span className={cx("text-meta-s font-bold", c.good ? "text-positive" : "text-text-muted")}>
                      {r.nowForecast ? `${c.text} · ${t.progress.forecast}` : c.text}
                    </span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Link href="/progress" className="inline-flex min-h-tap items-center self-start text-body14 font-bold text-accent underline-offset-2 hover:underline">{t.progress.seeAll}</Link>
    </section>
  );
}

// ---- Smaller wins -------------------------------------------------------------------------------------------------

function SmallerWins({ wins, prefs, toggle, state }: { wins: Win[]; prefs: Record<string, CyclePref>; toggle: (id: string, on: boolean) => void; state: string }) {
  const [open, setOpen] = useState(true);
  const [tips, setTips] = useState<string | null>(null);
  const vic = state === "VIC";
  const total = wins.reduce((s, w) => s + (w.saving ?? 0), 0);
  const done = wins.filter((w) => prefs[`win-${w.id}`] === "done").length;
  const items = useMemo(() => wins.map((w) => {
    const c = t.wins.items;
    switch (w.id) {
      case "subscriptions": return { w, title: c.subscriptions.title, detail: c.subscriptions.detail(listOf(w.names ?? []), formatWhole(Math.round(w.amount ?? 0))), link: { label: c.subscriptions.link, href: "/subscriptions" }, save: t.wins.upTo(formatWhole(w.saving ?? 0)) };
      case "failed_debits": return { w, title: c.failed_debits.title, detail: c.failed_debits.detail(w.count ?? 0, formatDayMonth(w.lastDate!), formatWhole(w.fees ?? 0)), link: { label: c.failed_debits.link, href: "/calendar" }, save: t.wins.about(formatWhole(w.saving ?? 0)) };
      case "phone": return { w, title: c.phone.title, detail: c.phone.detail(w.merchant!, formatWhole(Math.round(w.monthly ?? 0))), link: { label: c.phone.link, tips: w.merchant! }, save: t.wins.varies };
      case "energy": return { w, title: c.energy.title, detail: c.energy.detail(w.merchant!, formatWhole(Math.round(w.monthly ?? 0)), vic), link: { label: c.energy.link(vic), external: vic ? ENERGY_COMPARE_VIC : PROGRAMS.energy_compare.url }, save: t.wins.varies };
    }
  }), [wins, vic]);
  return (
    <section aria-labelledby="mp-wins-h" className={cx(card, "flex scroll-mt-[72px] flex-col gap-t3")} id="mp-wins">
      <div className="flex items-center justify-between gap-t2">
        <div className="flex min-w-0 flex-col gap-t1">
          <h2 id="mp-wins-h" className="scroll-mt-[72px] text-[1.125rem] font-extrabold text-text">{t.sections.wins.title}</h2>
          <p className="text-meta-s text-text-muted">{wins.length ? (total > 0 ? t.wins.sub(formatWhole(total), done, wins.length) : t.wins.subVaries(done, wins.length)) : t.wins.none}</p>
        </div>
        {wins.length > 0 && <Button variant="secondary" aria-expanded={open} aria-controls="mp-wins-list" onClick={() => setOpen((v) => !v)}>
          <span className="inline-flex items-center gap-t1">{open ? t.wins.hide : t.wins.show}<ChevronDown aria-hidden size={16} className={cx("transition-transform", open && "rotate-180")} /></span>
        </Button>}
      </div>
      <ul id="mp-wins-list" hidden={!open}>
        {items.map(({ w, title, detail, link, save }) => {
          const id = `win-${w.id}`;
          const ticked = prefs[id] === "done";
          return (
            <li key={w.id} className="flex items-start gap-t3 border-t border-divider py-t3 first:border-t-0">
              <input type="checkbox" id={id} checked={ticked} onChange={(e) => toggle(id, e.target.checked)}
                className="mt-[12px] h-[20px] w-[20px] shrink-0 accent-[color:var(--color-accent)]" />
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <label htmlFor={id} className={cx("flex min-h-tap cursor-pointer items-center text-body14 font-bold", ticked ? "text-text-muted line-through" : "text-text")}>{title}</label>
                <span className="text-meta-s text-text-muted">{detail}</span>
                {"href" in link && link.href && <Link href={link.href} className="inline-flex min-h-tap items-center self-start text-meta font-bold text-accent underline-offset-2 hover:underline">{link.label}</Link>}
                {"tips" in link && link.tips && <button type="button" onClick={() => { track("bill_switch_link_opened", {}); setTips(link.tips!); }} className="inline-flex min-h-tap items-center self-start text-meta font-bold text-accent underline-offset-2 hover:underline">{link.label}</button>}
                {"external" in link && <a href={link.external} target="_blank" rel="noopener noreferrer" onClick={() => track("bill_switch_link_opened", {})}
                  className="inline-flex min-h-tap items-center gap-t1 self-start text-meta font-bold text-accent underline-offset-2 hover:underline">{link.label}<ExternalLink aria-hidden size={14} /><span className="sr-only"> {t.wins.opensIn}</span></a>}
              </div>
              <span className="mt-[12px] whitespace-nowrap text-meta font-extrabold tabular-nums text-positive">{save}</span>
            </li>
          );
        })}
      </ul>
      <Sheet open={!!tips} onClose={() => setTips(null)} title={tips ? billSwitchCopy.tipsTitle(tips) : ""}>
        <ul className="flex list-disc flex-col gap-t2 pl-t5 text-body text-text">{billSwitchCopy.tips.map((x) => <li key={x}>{x}</li>)}</ul>
        <p className="mt-t4 text-caption text-text-muted">{billSwitchCopy.general}</p>
      </Sheet>
    </section>
  );
}

const listOf = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0] ?? "");
