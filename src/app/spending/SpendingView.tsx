"use client";
// Spending (v5, single column, 09/10/2026; reference: tippla-spending-single-column-v5.html). One centred column in
// the order people think: this cycle so far (a one-line shortfall link, the summary, where it went) → plan ahead
// (budget ideas) → longer term (how lenders see it) → activity (the transactions) → housekeeping. Section headings
// sit outside the cards, with sticky chips to jump between them. Every figure comes from spendingView(), the same
// selector Today's Spending section uses; recategorising a transaction moves everything at once.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, TriangleAlert } from "lucide-react";
import type { CategoryId, PersonaId, Transaction } from "@/lib/api/types";
import { categoryNames, categoryTypes, periodLabels } from "@/content/en-AU";
import { spending as sp } from "@/content/spending";
import { transaction as txCopy } from "@/content/components";
import { formatCents, formatDayMonth, formatShortDay, formatWhole } from "@/lib/format";
import { useBudgets, useCategoryEdits } from "@/lib/edits/client";
import {
  budgetSuggestions, lenderFacts, PERIOD_IDS, resolvePeriod, spendingFeed, spendingInsights, spendingView,
  type CategoryOverrides, type GamblingFacts, type FeedDirection, type PayCycleSummary, type PeriodId, type SpendCategory, type SpendData,
} from "@/lib/selectors";
import { SpendSummary } from "@/components/money/SpendSummary";
import { WhereItWent } from "@/components/money/WhereItWent";
import { Section, SectionChips, GROUP_GAP } from "@/components/shell/Sections";
import { TransactionRow } from "@/components/domain/TransactionRow";
import { Button } from "@/components/ui/Button";
import { FilterChip, SegmentedControl } from "@/components/ui/Chips";
import { EmptyState, useToast } from "@/components/ui/Feedback";
import { cx } from "@/components/ui/cx";
import { BudgetSheet, MerchantSheet, TransactionSheet, type SheetState } from "./sheets";
import { InsightSheetBody } from "@/components/domain/Insight";
import { SupportOptions } from "@/components/domain/SupportOptions";
import { Sheet } from "@/components/ui/Sheet";
import { gamblingSupport } from "@/content/support";
import { factorCopy } from "@/content/en-AU";
import { FACTOR_SLUGS } from "@/lib/ui/factorSlugs";
import { ButtonLink } from "@/components/ui/Button";

export interface SpendingParams { period?: string; month?: string; category?: string; direction?: string; q?: string }

const t = sp.v5;
const isSpendCat = (v: unknown): v is SpendCategory => typeof v === "string" && v in categoryTypes;
const PREVIEW = 10;
const PAGE = 30;

export function SpendingView({ persona, data, initialEdits, payCycle, params, asOf, corrections = null, doubles = {}, hideGambling = false, gambling = null }: {
  /** For the gambling insight (how it affects the SmartScore, and support), opened from the lenders card. */
  gambling?: GamblingFacts | null;
  persona: PersonaId; data: SpendData; initialEdits: CategoryOverrides; payCycle: PayCycleSummary; params: SpendingParams; asOf: string;
  corrections?: { oneOff: string[]; regular: string[] } | null;
  /** Transaction id → Needs a look item id, for transactions flagged as a possible double charge. */
  doubles?: Record<string, string>;
  hideGambling?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const original = useMemo(() => Object.fromEntries(data.transactions.map((x) => [x.id, x.category])) as Record<string, CategoryId>, [data]);
  const { edits, setCategory, restore } = useCategoryEdits(persona, initialEdits, original);
  const { budgets, save: saveBudgets } = useBudgets(persona);
  const [periodKey, setPeriodKey] = useState<{ period?: string; month?: string }>({ period: params.period, month: params.month });
  const [selected, setSelected] = useState<SpendCategory | null>(isSpendCat(params.category) ? params.category : null);
  const [direction, setDirection] = useState<FeedDirection>(params.direction === "out" || params.direction === "in" ? params.direction : "all");
  const [q, setQ] = useState(params.q ?? "");
  const [shown, setShown] = useState(params.category || params.direction || params.q ? PAGE : PREVIEW);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<SheetState>(null);
  const [gamblingSheet, setGamblingSheet] = useState<"insight" | "support" | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Filters live in the URL (shareable, survives reload) without a server round trip.
  useEffect(() => {
    const u = new URL(window.location.href);
    const set = (k: string, v: string | null | undefined) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k));
    u.searchParams.delete("tab");
    set("period", periodKey.month ? null : periodKey.period && periodKey.period !== "this_cycle" ? periodKey.period : null);
    set("month", periodKey.month);
    set("category", selected);
    set("direction", direction === "all" ? null : direction);
    set("q", q.trim() || null);
    window.history.replaceState(window.history.state, "", u.toString());
  }, [periodKey, selected, direction, q]);
  // Links into Activity (a category, a direction or a search) land on it.
  useEffect(() => { if (params.category || params.direction || params.q) document.getElementById("activity")?.scrollIntoView({ block: "start" }); }, [params.category, params.direction, params.q]);

  // ---- Numbers: every one through the selectors ---------------------------------------------------------
  const p = useMemo(() => resolvePeriod(data, periodKey), [data, periodKey]);
  const v = useMemo(() => spendingView(data, p, edits, { budgets, hideGambling }), [data, p, edits, budgets, hideGambling]);
  const lenders = useMemo(() => lenderFacts(data, p, edits, { hideGambling }), [data, p, edits, hideGambling]);
  const ideas = useMemo(() => budgetSuggestions(data, budgets, edits).filter((x) => !dismissed.has(x.category)), [data, budgets, edits, dismissed]);
  const feed = useMemo(() => spendingFeed(data, p, edits, { category: selected, direction, q }), [data, p, edits, selected, direction, q]);
  const allInPeriod = useMemo(() => spendingFeed(data, p, edits, {}), [data, p, edits]);
  const txById = useMemo(() => new Map(data.transactions.map((x) => [x.id, { ...x, category: edits[x.id] ?? x.category }])), [data, edits]);
  const cycle = v.kind === "cycle";
  const gamblingInsight = useMemo(() => (gambling ? spendingInsights(data, p, edits, gambling).find((i) => i.id === "gambling") ?? null : null), [data, p, edits, gambling]);
  const double = Object.keys(doubles).map((id) => txById.get(id)).filter((x): x is Transaction => !!x && x.date >= p.start && x.date <= p.end);

  const recategorise = (id: string, category: CategoryId) => {
    const before = edits;
    setCategory(id, category);
    toast({ kind: "confirm", message: sp.tx.moved(categoryNames[category]), onUndo: () => restore(before) });
  };
  const toActivity = (focus = false) => requestAnimationFrame(() => {
    document.getElementById("activity")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    if (focus) searchRef.current?.focus({ preventScroll: true });
  });
  const setBudget = (c: SpendCategory, amount: number) => {
    saveBudgets({ ...budgets, [c]: amount });
    toast({ kind: "confirm", message: sp.budgets.saved(categoryNames[c]), onUndo: () => saveBudgets(budgets) });
    router.refresh();
  };

  const sections = [
    { id: "s-cycle", label: t.sections.cycle.chip },
    { id: "s-plan", label: t.sections.plan.chip },
    { id: "s-lenders", label: t.sections.lenders.chip },
    { id: "activity", label: t.sections.activity.chip },
  ];

  return (
    <div className="mx-auto w-full max-w-[660px] pb-t6">
      {/* Period: one control instead of four chips, with the dates (and payday) beside it. */}
      <div className="flex items-center justify-between gap-t3">
        <label className="relative inline-flex min-h-tap shrink-0 items-center rounded-pill border border-line bg-surface pl-[14px] pr-t6 font-bold text-text focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--color-focus)]">
          <span className="sr-only">{t.periodLabel}</span>
          <select value={p.id === "month" ? `month:${p.month}` : p.id} onChange={(e) => setPeriodKey(e.target.value.startsWith("month:") ? { month: e.target.value.slice(6) } : { period: e.target.value as PeriodId })}
            className="appearance-none bg-transparent py-t2 text-body14 font-bold outline-none">
            {PERIOD_IDS.map((id) => <option key={id} value={id}>{periodLabels[id]}</option>)}
            {p.id === "month" && <option value={`month:${p.month}`}>{p.label}</option>}
          </select>
          <ChevronDown aria-hidden size={14} strokeWidth={2.5} className="pointer-events-none absolute right-[12px]" />
        </label>
        <p className="tnum min-w-0 text-right text-meta text-text-muted">
          {cycle ? t.cycleMeta(formatDayMonth(p.start), formatDayMonth(p.end), formatShortDay(payCycle.nextPayday)) : t.periodMeta(formatDayMonth(p.start), formatDayMonth(p.end > asOf ? asOf : p.end))}
        </p>
      </div>
      {p.limitedByHistory && <p className="mt-t2 text-caption text-text-muted">{sp.limitedHistory(p.basedOnDays)}</p>}

      <div className="mt-t3"><SectionChips items={sections} label={t.sectionsLabel} /></div>

      <div className={cx("mt-t4 flex flex-col", GROUP_GAP)}>
        <Section id="s-cycle" n={1} title={cycle ? t.sections.cycle.title : t.sections.cycle.titlePeriod} desc={cycle ? t.sections.cycle.desc : t.sections.cycle.descPeriod}>
          {/* The shortfall lives on Today; here it's one line that links to Coming up. Only the figure is red. */}
          {cycle && payCycle.isShort && (
            <Link href="/#coming-up" className="flex min-h-tap items-center justify-between gap-t3 rounded-[14px] bg-surface px-t4 py-t3 text-body14 font-semibold text-text shadow-card">
              <span className="tnum"><span className="text-negative">{t.short(formatWhole(-payCycle.leftAfterBills))}</span>{t.shortRest}</span>
              <span className="shrink-0 text-accent">{t.seeComingUp} <span aria-hidden>→</span></span>
            </Link>
          )}
          <section aria-labelledby="sum-h" className="rounded-card-s bg-surface p-t4 shadow-card sm:rounded-card sm:p-t5">
            <div className="flex items-baseline justify-between gap-t3">
              <h3 id="sum-h" className="text-card text-text sm:text-card-l">{cycle ? t.summary.heading : t.summary.headingPeriod(p.label)}</h3>
              <Link href="/spending/compare" className="inline-flex min-h-tap items-center text-body14 font-semibold text-accent">{t.summary.compare}</Link>
            </div>
            <div className="mt-t1"><SpendSummary v={v} size="large" /></div>
          </section>
          <WhereItWent v={v} budgets={budgets}
            onTransaction={(id) => setSheet({ kind: "tx", id })}
            onWrongCategory={(merchant) => setSheet({ kind: "merchant", merchant })}
            onSeeAll={(c) => { setSelected(c); setDirection("all"); setShown(PAGE); toActivity(); }}
            onBudget={(c, amount) => setSheet({ kind: "budget", category: c, suggest: amount })} />
        </Section>

        <Section id="s-plan" n={2} title={t.sections.plan.title} desc={t.sections.plan.desc}>
          <section aria-labelledby="ideas-h" className="rounded-card-s bg-surface p-t4 shadow-card sm:rounded-card sm:p-t5">
            <div className="flex items-baseline justify-between gap-t3">
              <h3 id="ideas-h" className="text-card text-text sm:text-card-l">{t.budgets.heading}</h3>
              <Link href="/spending/budgets" className="inline-flex min-h-tap items-center text-body14 font-semibold text-accent">{t.budgets.all}</Link>
            </div>
            {ideas.length ? (
              <>
                <p className="mt-t1 text-meta text-text-muted">{t.budgets.intro}</p>
                <ul className="mt-t2">
                  {ideas.map((x) => (
                    <li key={x.category} className="flex flex-col gap-t2 border-t border-divider py-t3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
                      <p className="tnum text-body14 text-text"><strong className="font-bold">{x.name}:</strong> {t.budgets.idea(formatWhole(x.average), formatWhole(x.suggested))}</p>
                      <div className="flex shrink-0 gap-t1">
                        <Button onClick={() => setBudget(x.category, x.suggested)} aria-label={t.budgets.setSr(formatWhole(x.suggested), x.name)}>{t.budgets.set}</Button>
                        <Button variant="secondary" onClick={() => setSheet({ kind: "budget", category: x.category, suggest: x.suggested })} aria-label={`${t.budgets.adjust}: ${x.name}`}>{t.budgets.adjust}</Button>
                        <Button variant="tertiary" onClick={() => setDismissed((d) => new Set(d).add(x.category))} aria-label={`${t.budgets.notNow}: ${x.name}`}>{t.budgets.notNow}</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : <p className="mt-t2 text-body14 text-text-muted">{t.budgets.none}</p>}
          </section>
        </Section>

        <Section id="s-lenders" n={3} title={t.sections.lenders.title} desc={t.sections.lenders.desc}>
          <section aria-labelledby="lenders-h" className="rounded-card-s bg-accent-soft p-t4 sm:rounded-card sm:p-t5">
            <div className="flex items-baseline justify-between gap-t3">
              <h3 id="lenders-h" className="text-card text-text sm:text-card-l">{t.lenders.heading}</h3>
              <Link href="/loans" className="inline-flex min-h-tap items-center text-body14 font-semibold text-accent-strong">{t.lenders.details}<span className="sr-only">{t.lenders.detailsSr}</span></Link>
            </div>
            <p className="mt-t1 text-body14 text-text-secondary">{t.lenders.body}</p>
            <dl className={cx("tnum mt-t3 grid gap-t2", lenders.gamblingDeposits === null ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
              <Fact label={t.lenders.loans} value={t.lenders.lendersN(lenders.lenders)} />
              <Fact label={t.lenders.payAdvances} value={t.lenders.advancesN(lenders.payAdvances)} />
              {lenders.gamblingDeposits !== null && (gamblingInsight
                ? <Fact label={t.lenders.gambling} value={t.lenders.depositsN(lenders.gamblingDeposits)} className="col-span-2 sm:col-span-1" onOpen={() => setGamblingSheet("insight")} />
                : <Fact label={t.lenders.gambling} value={t.lenders.depositsN(lenders.gamblingDeposits)} className="col-span-2 sm:col-span-1" />)}
            </dl>
            <Link href="/score" className="mt-t3 flex min-h-tap items-center justify-between gap-t3 rounded-inset bg-surface px-t4 py-t2 text-body14 text-text">
              <span>{t.lenders.scoreLine}</span><span className="shrink-0 font-semibold text-accent">{t.lenders.seeHow}</span>
            </Link>
          </section>
        </Section>

        {/* Activity: a flat list on the page background (not a card), white row groups, sticky day headers. */}
        <Section id="activity" n={4} title={t.sections.activity.title} desc={t.sections.activity.desc(allInPeriod.length)}>
          <label className="flex min-h-[48px] items-center gap-t2 rounded-pill border border-line bg-surface px-t4 focus-within:border-accent focus-within:outline focus-within:outline-[length:var(--focus-width)] focus-within:outline-offset-[var(--focus-offset)] focus-within:outline-focus">
            <Search aria-hidden size={18} className="text-text-muted" />
            <span className="sr-only">{sp.feed.searchLabel}</span>
            <input id="spending-search" ref={searchRef} type="search" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder={sp.feed.searchLabel}
              className="min-w-0 flex-1 self-stretch bg-transparent text-body text-text outline-none placeholder:text-text-muted" />
          </label>
          <SegmentedControl label={sp.feed.directionLabel} value={selected ? null : direction}
            onChange={(d) => { if (selected) setSelected(null); setDirection(d); setShown(PAGE); }}
            options={(["all", "out", "in"] as FeedDirection[]).map((d) => ({ value: d, label: sp.feed.direction[d] }))} />
          {selected && (
            <div className="flex flex-wrap items-center gap-t2">
              <FilterChip label={categoryNames[selected]} onRemove={() => setSelected(null)} />
              <span role="status" className="text-meta text-text-muted">{sp.feed.count(feed.length)}</span>
            </div>
          )}
          {double.length > 1 && (
            <div className="flex min-h-tap items-center justify-between gap-t3 rounded-inset bg-caution-soft px-t4 py-t2 text-meta font-semibold text-caution">
              <span className="inline-flex items-center gap-t1"><TriangleAlert aria-hidden size={14} />{t.activity.double(double[0]!.merchant, formatCents(-double[0]!.amount))}</span>
              <button type="button" onClick={() => setSheet({ kind: "tx", id: double[0]!.id })} className="min-h-tap shrink-0 underline underline-offset-2">{t.activity.review}</button>
            </div>
          )}
          {feed.length === 0
            ? <EmptyState variant={q ? "noSearchResults" : "noTransactions"} query={q} onAction={() => { setQ(""); setDirection("all"); setSelected(null); }} />
            : <DayGroups feed={feed.slice(0, shown)} edits={edits} doubles={doubles} onOpen={(id) => setSheet({ kind: "tx", id })} />}
          {feed.length > shown && (
            shown === PREVIEW
              ? <button type="button" onClick={() => setShown(PAGE)} className="flex min-h-tap items-center justify-center text-body14 font-semibold text-accent">{t.activity.seeAll(feed.length)}</button>
              : <Button full variant="secondary" onClick={() => setShown((n) => n + PAGE)}>{sp.feed.showMore(Math.min(PAGE, feed.length - shown))}</Button>
          )}
        </Section>

        <Section id="s-house">
          <div className="flex items-center justify-between gap-t3 rounded-card-s border border-line px-t4 py-t3 sm:rounded-card sm:px-t5">
            <div className="min-w-0">
              <h2 className="text-body14 font-bold text-text">{t.housekeeping.heading}</h2>
              <p className="text-meta text-text-muted">{t.housekeeping.body}</p>
            </div>
            <button type="button" onClick={() => toActivity(true)} className="inline-flex min-h-tap shrink-0 items-center px-t2 text-body14 font-semibold text-accent">{t.housekeeping.fix}</button>
          </div>
        </Section>
      </div>

      {/* ---- Sheets (one at a time; follow-ons replace content with Back) ---- */}
      {gamblingInsight && (
        <Sheet open={!!gamblingSheet} onClose={() => setGamblingSheet(null)}
          title={gamblingSheet === "support" ? gamblingSupport.title : gamblingInsight.title}
          subtitle={gamblingSheet === "support" ? undefined : `${categoryNames.gambling} · ${factorCopy.ADVERSE_SPEND.name}`}
          onBack={gamblingSheet === "support" ? () => setGamblingSheet("insight") : undefined}
          footer={gamblingSheet === "insight" ? <>
            <ButtonLink full variant="secondary" href={`/score/${FACTOR_SLUGS.ADVERSE_SPEND}`}>{sp.insights.scoreMethod}</ButtonLink>
            <Button full variant="secondary" onClick={() => setGamblingSheet("support")}>{sp.insights.support}</Button>
            <Button full variant="tertiary" onClick={() => setGamblingSheet(null)}>{sp.insights.notNow}</Button>
          </> : undefined}>
          {gamblingSheet === "support" ? <SupportOptions /> : <InsightSheetBody item={{ id: gamblingInsight.id, context: gamblingInsight.context, title: gamblingInsight.title, summary: gamblingInsight.summary, happening: gamblingInsight.happening, wouldChange: gamblingInsight.wouldChange, ifYouWant: gamblingInsight.ifYouWant }} />}
        </Sheet>
      )}
      <MerchantSheet sheet={sheet} setSheet={setSheet} data={data} p={p} edits={edits} original={original} onRecategorise={recategorise} />
      <TransactionSheet sheet={sheet} setSheet={setSheet} tx={sheet?.kind === "tx" ? txById.get(sheet.id) ?? null : null} original={original} edits={edits} onRecategorise={recategorise}
        double={sheet?.kind === "tx" && !!doubles[sheet.id]} persona={persona} corrections={corrections}
        onReset={(id) => recategorise(id, original[id]!)} />
      <BudgetSheet sheet={sheet} setSheet={setSheet} data={data} budgets={budgets} edits={edits}
        onSave={(c, value) => {
          const next = { ...budgets };
          if (value === null) delete next[c]; else next[c] = value;
          saveBudgets(next);
          toast({ kind: "confirm", message: value === null ? sp.budgets.removed(categoryNames[c]) : sp.budgets.saved(categoryNames[c]), onUndo: () => saveBudgets(budgets) });
          setSheet(null);
          router.refresh();
        }} />
    </div>
  );
}

function Fact({ label, value, className, onOpen }: { label: string; value: string; className?: string; onOpen?: () => void }) {
  return (
    <div className={cx("relative rounded-[12px] bg-surface px-t3 py-t2", className)}>
      <dt className="text-meta-s font-semibold text-text-muted">{label}</dt>
      <dd className="text-body14 font-extrabold text-text">
        {onOpen ? <button type="button" onClick={onOpen} className="text-left after:absolute after:inset-0 after:content-['']">{value}<span className="sr-only">{t.lenders.gamblingSr}</span></button> : value}
      </dd>
    </div>
  );
}

function DayGroups({ feed, edits, doubles, onOpen }: { feed: Transaction[]; edits: CategoryOverrides; doubles: Record<string, string>; onOpen: (id: string) => void }) {
  const groups: { date: string; items: Transaction[] }[] = [];
  for (const x of feed) {
    const g = groups.at(-1);
    if (g && g.date === x.date) g.items.push(x); else groups.push({ date: x.date, items: [x] });
  }
  return (
    <div>
      {groups.map((g) => (
        <div key={g.date}>
          <h3 className="sticky top-[56px] z-[5] bg-bg px-[2px] pb-t1 pt-t3 text-meta font-bold text-text-muted">{formatShortDay(g.date)}/{g.date.slice(0, 4)}</h3>
          <ul className="overflow-hidden rounded-[14px] bg-surface">
            {g.items.map((x) => (
              <li key={x.id} className="border-b border-divider last:border-b-0">
                <TransactionRow tx={{ ...x, category: edits[x.id] ?? x.category }} edited={!!edits[x.id]} showDate={false} flag={doubles[x.id] ? txCopy.possibleDouble : null} onOpen={() => onOpen(x.id)} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
