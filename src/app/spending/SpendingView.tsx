"use client";
// P3 Spending, after reference/spending_interaction_prototype.html: the chart is a control, rows expand to
// merchants, any transaction can be recategorised and every figure (donut, rows, budgets, hero, Home) moves.
import { useCorrections } from "@/lib/account/useCorrections";
import { correctionCopy } from "@/content/corrections";
import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { CategoryId, PersonaId, Transaction } from "@/lib/api/types";
import { categoryNames, categoryTypes, copy, factorCopy, periodLabels } from "@/content/en-AU";
import { spending as t } from "@/content/spending";
import { gamblingSupport } from "@/content/support";
import { category as catCopy, transaction as txCopy } from "@/content/components";
import { formatCents, formatDate, formatDayMonth, formatShortDay, formatWhole } from "@/lib/format";
import { sumMoney } from "@/lib/format/money";
import { useBudgets, useCategoryEdits } from "@/lib/edits/client";
import {
  averagePerCycle, budgetView, categorySparkline, categoryTotals, currentCycle, EDITABLE_CATEGORIES, merchantsIn, paidInFor,
  PERIOD_IDS, previousOf, resolvePeriod, spendingFeed, spendingInsights, totalSpent,
  type CategoryOverrides, type FeedDirection, type GamblingFacts, type PayCycleSummary, type Period, type PeriodId, type SpendCategory,
  type SpendData, type SpendFilter, type CategoryRow as Row,
} from "@/lib/selectors";
import { FACTOR_SLUGS } from "@/lib/ui/factorSlugs";
import { CategoryRow } from "@/components/domain/CategoryRow";
import { Donut } from "@/components/domain/Donut";
import { DueSheet } from "@/components/domain/DueSheet";
import { InsightCard, InsightSheetBody, type InsightItem } from "@/components/domain/Insight";
import { SupportOptions } from "@/components/domain/SupportOptions";
import { TransactionRow } from "@/components/domain/TransactionRow";
import { categoryIcons, catVar } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Chip, ChipGroup, FilterChip, SegmentedControl } from "@/components/ui/Chips";
import { EmptyState, useToast } from "@/components/ui/Feedback";
import { CurrencyInput, SelectInput } from "@/components/ui/Form";
import { Sheet } from "@/components/ui/Sheet";
import { cx } from "@/components/ui/cx";

export interface SpendingParams { tab?: string; period?: string; month?: string; category?: string; direction?: string; q?: string }
type Tab = "overview" | "categories" | "budgets";
type Sort = "amount" | "change" | "az";
type SheetState =
  | null
  | { kind: "insight"; id: string }
  | { kind: "support"; id: string }
  | { kind: "merchant"; merchant: string }
  | { kind: "tx"; id: string; fromMerchant?: string }
  | { kind: "budget"; category: SpendCategory }
  | { kind: "due" };

const TABS: Tab[] = ["overview", "categories", "budgets"];
const isSpendCat = (v: unknown): v is SpendCategory => typeof v === "string" && v in categoryTypes;
const SEARCH_EVENT = "tippla:spending-search";
const PAGE = 30;

/** Header search button: jumps to the transaction search on the Overview tab. */
export function SpendingSearchButton() {
  return (
    <button type="button" aria-label={t.search} onClick={() => window.dispatchEvent(new Event(SEARCH_EVENT))}
      className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-pill bg-surface2 text-text hover:bg-neutral-soft">
      <Search aria-hidden size={24} />
    </button>
  );
}

function vsLabel(p: Period): string {
  if (p.id === "this_cycle") return t.vsLabel.this_cycle;
  if (p.id === "last_cycle") return t.vsLabel.last_cycle;
  if (p.id === "month") return t.vsLabel.month;
  return t.vsLabel.rolling;
}

export function SpendingView({ persona, data, initialEdits, payCycle, gambling, accounts, params, asOf, corrections = null }: {
  /** Spec 05: corrections on (with the payers the member has marked one-off or regular). */
  asOf?: string; corrections?: { oneOff: string[]; regular: string[] } | null;
  persona: PersonaId; present: boolean; data: SpendData; initialEdits: CategoryOverrides; payCycle: PayCycleSummary;
  gambling: GamblingFacts | null; accounts: { id: number; label: string }[]; params: SpendingParams;
}) {
  const router = useRouter();
  const toast = useToast();
  const original = useMemo(() => Object.fromEntries(data.transactions.map((x) => [x.id, x.category])) as Record<string, CategoryId>, [data]);
  const { edits, setCategory, restore } = useCategoryEdits(persona, initialEdits, original);
  const { budgets, save: saveBudgets } = useBudgets(persona);

  const [tab, setTab] = useState<Tab>(TABS.includes(params.tab as Tab) ? (params.tab as Tab) : "overview");
  const [periodKey, setPeriodKey] = useState<{ period?: string; month?: string }>({ period: params.period, month: params.month });
  const [selected, setSelected] = useState<SpendCategory | null>(isSpendCat(params.category) ? params.category : null);
  const [filter, setFilter] = useState<SpendFilter>("all");
  const [sort, setSort] = useState<Sort>("amount");
  const [account, setAccount] = useState("all");
  const [direction, setDirection] = useState<FeedDirection>(params.direction === "out" || params.direction === "in" ? params.direction : "all");
  const [q, setQ] = useState(params.q ?? "");
  const [shown, setShown] = useState(PAGE);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(isSpendCat(params.category) ? [params.category] : []));
  const [sheet, setSheet] = useState<SheetState>(null);
  const feedRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Filters live in the URL (shareable, survives reload) without a server round trip.
  useEffect(() => {
    const u = new URL(window.location.href);
    const set = (k: string, v: string | null | undefined) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k));
    set("tab", tab === "overview" ? null : tab);
    set("period", periodKey.month ? null : periodKey.period && periodKey.period !== "this_cycle" ? periodKey.period : null);
    set("month", periodKey.month);
    set("category", selected);
    set("direction", direction === "all" ? null : direction);
    set("q", q.trim() || null);
    window.history.replaceState(window.history.state, "", u.toString());
  }, [tab, periodKey, selected, direction, q]);

  const scrollToFeed = useCallback((focusSearch = false) => {
    requestAnimationFrame(() => {
      feedRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      if (focusSearch) searchRef.current?.focus({ preventScroll: true });
    });
  }, []);
  useEffect(() => {
    const onSearch = () => { setTab("overview"); scrollToFeed(true); };
    window.addEventListener(SEARCH_EVENT, onSearch);
    return () => window.removeEventListener(SEARCH_EVENT, onSearch);
  }, [scrollToFeed]);
  useEffect(() => { if (params.direction || params.q) scrollToFeed(); }, [params.direction, params.q, scrollToFeed]);
  useEffect(() => setShown(PAGE), [periodKey, selected, direction, q, filter]);

  // ---- Numbers: every one through the selectors -------------------------------------------------
  const scoped = useMemo<SpendData>(() => (account === "all" ? data : { ...data, transactions: data.transactions.filter((x) => String(x.account_id) === account) }), [data, account]);
  const p = useMemo(() => resolvePeriod(data, periodKey), [data, periodKey]);
  const cycle = useMemo(() => currentCycle(data), [data]);
  const allRows = useMemo(() => categoryTotals(scoped, p, edits), [scoped, p, edits]);
  const total = useMemo(() => totalSpent(scoped, p, edits), [scoped, p, edits]);
  const prev = useMemo(() => previousOf(data, p), [data, p]);
  const comparable = prev.basedOnDays > 0 && !prev.limitedByHistory;
  const insights = useMemo(() => spendingInsights(scoped, p, edits, gambling), [scoped, p, edits, gambling]);
  const insightItems: InsightItem[] = insights.map((i) => ({ id: i.id, context: i.context, title: i.title, summary: i.summary, happening: i.happening, wouldChange: i.wouldChange, ifYouWant: i.ifYouWant }));
  const showBudgets = p.id === "this_cycle";
  const feedFilter = tab === "categories" ? filter : "all";
  const feed = useMemo(() => spendingFeed(scoped, p, edits, { category: selected, filter: feedFilter, direction, q }), [scoped, p, edits, selected, feedFilter, direction, q]);
  const txById = useMemo(() => new Map(data.transactions.map((x) => [x.id, { ...x, category: edits[x.id] ?? x.category }])), [data, edits]);
  const cycleSpent = useMemo(() => totalSpent(data, cycle, edits), [data, cycle, edits]);
  const hero: PayCycleSummary = { ...payCycle, spent: cycleSpent };

  const listRows = useMemo(() => {
    const change = (r: Row) => Math.abs(r.change);
    const rows = categoryTotals(scoped, p, edits, tab === "categories" ? filter : "all").filter((r) => !selected || r.category === selected);
    return [...rows].sort(sort === "amount" ? (a, b) => b.total - a.total : sort === "change" ? (a, b) => change(b) - change(a) || b.total - a.total : (a, b) => a.name.localeCompare(b.name));
  }, [scoped, p, edits, tab, filter, selected, sort]);

  const changeText = (r: Row) => {
    if (!comparable) return undefined;
    if (Math.round(r.change) === 0) return t.categories.noChange(vsLabel(p));
    return t.categories.change(formatWhole(Math.abs(r.change)), r.change > 0, vsLabel(p));
  };

  // ---- Actions ------------------------------------------------------------------------------------
  const recategorise = (id: string, category: CategoryId) => {
    const before = edits;
    setCategory(id, category);
    toast({ kind: "confirm", message: t.tx.moved(categoryNames[category]), onUndo: () => restore(before) });
  };
  const selectCategory = (c: SpendCategory | null) => {
    setSelected(c);
    if (c) setExpanded((s) => new Set(s).add(c));
  };
  const choosePeriod = (id: PeriodId) => setPeriodKey({ period: id });
  const viewAll = (c: SpendCategory) => { setTab("overview"); selectCategory(c); scrollToFeed(); };

  const rowFor = (r: Row) => {
    const ins = insights.find((i) => i.category === r.category);
    return (
      <li key={r.category}>
        <CategoryRow
          row={r}
          showLifestyle
          merchants={merchantsIn(scoped, p, r.category, edits)}
          budget={showBudgets ? budgets[r.category] ?? null : undefined}
          insightLabel={ins?.chip}
          onInsight={ins ? () => setSheet({ kind: "insight", id: ins.id }) : undefined}
          onMerchant={(m) => setSheet({ kind: "merchant", merchant: m.merchant })}
          onViewAll={() => viewAll(r.category)}
          onEditBudget={showBudgets ? () => setSheet({ kind: "budget", category: r.category }) : undefined}
          changeText={changeText(r)}
          sparkline={categorySparkline(scoped, r.category, 6, edits)}
          expanded={expanded.has(r.category)}
          onToggle={(open) => setExpanded((s) => { const n = new Set(s); if (open) n.add(r.category); else n.delete(r.category); return n; })}
        />
      </li>
    );
  };

  const periodChips = (
    <div className="mt-t4">
      <ChipGroup label={t.periodsLabel}>
        {PERIOD_IDS.map((id) => <Chip key={id} selected={p.id === id} onClick={() => choosePeriod(id)}>{periodLabels[id]}</Chip>)}
        {p.id === "month" && <Chip selected>{p.label}</Chip>}
      </ChipGroup>
      {p.limitedByHistory && <p className="mt-t2 text-caption text-text-muted">{t.limitedHistory(p.basedOnDays)}</p>}
      {p.id === "month" && p.end > data.asOf && <p className="mt-t2 text-caption text-text-muted">{t.partialMonth(formatDayMonth(data.asOf))}</p>}
    </div>
  );

  const categoryList = (
    <section aria-labelledby="cats-h" className="mt-t3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-t3 px-t1 pb-t2 pt-t4">
        <h2 id="cats-h" className="text-h3 text-text">{t.categories.heading}</h2>
        <span className="text-caption text-text-muted">{t.categories.count(listRows.length)}</span>
      </div>
      {selected && <div className="pb-t3"><FilterChip label={categoryNames[selected]} onRemove={() => setSelected(null)} /></div>}
      {listRows.length ? <ul className="flex flex-col gap-t3">{listRows.map(rowFor)}</ul> : <p className="rounded-md bg-surface p-t5 text-small text-text">{t.categories.empty}</p>}
    </section>
  );

  return (
    <div className="pb-t6">
      <SegmentedControl label={t.tabsLabel} value={tab} onChange={setTab}
        options={TABS.map((v) => ({ value: v, label: t.tabs[v] }))} />

      {tab !== "budgets" && periodChips}

      {tab === "overview" && (
        <>
          <div className="mt-t4">
            <SpendingHero p={p} asOf={data.asOf} summary={hero} total={total} paidIn={paidInFor(scoped, p)}
              onSpent={() => { setDirection("out"); scrollToFeed(); }}
              onPaidIn={() => { setDirection("in"); setSelected(null); scrollToFeed(); }}
              onDue={() => setSheet({ kind: "due" })} />
          </div>
          {insightItems.length > 0 && (
            <div className="mt-t3">
              <InsightCard key={`${p.id}-${p.month ?? ""}`} items={insightItems} onOpen={(id) => setSheet({ kind: "insight", id })} />
            </div>
          )}
          <div className="mt-t3">
            <Donut legend={false} rows={allRows} total={total} periodLabel={p.label} selected={selected} onSelect={selectCategory} />
          </div>
          {categoryList}
          <nav aria-label={t.title} className="mt-t3 flex flex-col overflow-hidden rounded-md bg-surface">
            {[{ href: "/spending/compare", label: t.compareLink }, { href: "/calendar", label: t.calendarLink }, { href: "/subscriptions", label: t.subscriptionsLink }].map((l) => (
              <Link key={l.href} href={l.href} className="flex min-h-[52px] items-center justify-between border-b border-line px-t4 text-small text-accent last:border-b-0 hover:bg-surface2">
                {l.label}<ChevronRight aria-hidden size={20} />
              </Link>
            ))}
          </nav>
          <Feed ref={feedRef} searchRef={searchRef} feed={feed} shown={shown} onMore={() => setShown((n) => n + PAGE)} q={q} setQ={setQ}
            direction={direction} setDirection={setDirection} selected={selected} onClearCategory={() => setSelected(null)}
            edits={edits} onOpen={(id) => setSheet({ kind: "tx", id })}
            onClear={() => { setQ(""); setDirection("all"); setSelected(null); }} />
        </>
      )}

      {tab === "categories" && (
        <>
          <div className="mt-t4 flex flex-col gap-t3">
            <SegmentedControl label={t.categories.filterLabel} value={filter} onChange={(v) => { setFilter(v); setSelected(null); }}
              options={(["all", "essentials", "lifestyle"] as SpendFilter[]).map((v) => ({ value: v, label: t.categories.filters[v] }))} />
            <div className={cx("grid gap-t3", accounts.length > 1 && "grid-cols-2")}>
              <SelectInput label={t.categories.sortLabel} value={sort} onChange={setSort}
                options={(["amount", "change", "az"] as Sort[]).map((v) => ({ value: v, label: t.categories.sorts[v] }))} />
              {accounts.length > 1 && (
                <SelectInput label={t.categories.accountLabel} value={account} onChange={setAccount}
                  options={[{ value: "all", label: t.categories.allAccounts }, ...accounts.map((a) => ({ value: String(a.id), label: a.label }))]} />
              )}
            </div>
          </div>
          {categoryList}
        </>
      )}

      {tab === "budgets" && (
        <BudgetsTab data={data} cycle={cycle} budgets={budgets} edits={edits}
          onEdit={(c) => setSheet({ kind: "budget", category: c })}
          onMerchant={(m) => setSheet({ kind: "merchant", merchant: m })} />
      )}

      {/* ---- Sheets (one at a time; follow-ons replace content with Back) ---- */}
      <DueSheet open={sheet?.kind === "due"} onClose={() => setSheet(null)} payCycle={payCycle} persona={corrections ? persona : undefined} asOf={asOf} />
      <InsightSheets sheet={sheet} setSheet={setSheet} items={insightItems} insights={insights} budgets={budgets} onBudget={(c) => setSheet({ kind: "budget", category: c })} />
      <MerchantSheet sheet={sheet} setSheet={setSheet} data={scoped} p={p} edits={edits} original={original} onRecategorise={recategorise} />
      <TransactionSheet sheet={sheet} setSheet={setSheet} tx={sheet?.kind === "tx" ? txById.get(sheet.id) ?? null : null} original={original} edits={edits} onRecategorise={recategorise}
        persona={persona} corrections={corrections}
        onReset={(id) => recategorise(id, original[id]!)} />
      <BudgetSheet sheet={sheet} setSheet={setSheet} data={data} budgets={budgets} edits={edits}
        onSave={(c, v) => {
          const next = { ...budgets };
          if (v === null) delete next[c]; else next[c] = v;
          saveBudgets(next);
          toast({ kind: "confirm", message: v === null ? t.budgets.removed(categoryNames[c]) : t.budgets.saved(categoryNames[c]), onUndo: () => saveBudgets(budgets) });
          setSheet(null);
          router.refresh();
        }} />
    </div>
  );
}

// ---- Hero ------------------------------------------------------------------------------------------
function SpendingHero({ p, asOf, summary: s, total, paidIn, onSpent, onPaidIn, onDue }: {
  p: Period; asOf: string; summary: PayCycleSummary; total: number; paidIn: number; onSpent: () => void; onPaidIn: () => void; onDue: () => void;
}) {
  const isCycle = p.id === "this_cycle";
  const cycles = Math.max(1, p.basedOnDays / 14);
  const perCycle = Math.round(total / cycles);
  return (
    <section aria-label={isCycle ? copy.payCycle.range(formatDayMonth(s.cycle.start), formatDayMonth(s.cycle.end)) : p.label} className="overflow-hidden rounded-lg bg-surface">
      <div className="brand-surface on-brand p-t5">
        {isCycle ? (
          <>
            <p className="text-small">{copy.payCycle.range(formatDayMonth(s.cycle.start), formatDayMonth(s.cycle.end))}</p>
            <p className="mt-t3 text-h1 font-display">{s.isShort ? copy.payCycle.short(formatWhole(-s.leftAfterBills)) : copy.payCycle.left(formatWhole(s.leftAfterBills))}</p>
            <p className="mt-t3 text-caption">{copy.payCycle.daysToPayday(s.daysToPayday, formatShortDay(s.nextPayday))}</p>
          </>
        ) : (
          <>
            <p className="text-small">{p.label} · {formatDayMonth(p.start)} – {formatDayMonth(p.end > asOf ? asOf : p.end)}</p>
            <p className="tnum mt-t3 text-h1 font-display">{t.hero.total(formatWhole(total))}</p>
            {p.id !== "last_cycle" && <p className="mt-t3 text-caption">{t.hero.perCycle(formatWhole(perCycle))}</p>}
          </>
        )}
      </div>
      <div className="p-t5 pt-t4">
        <div className="flex flex-wrap justify-between gap-x-t4 gap-y-t1">
          <button type="button" onClick={onSpent} className="min-h-tap rounded-sm text-left hover:bg-surface2">
            <span className="tnum text-body-strong text-text">{copy.payCycle.spent(formatWhole(isCycle ? s.spent : total))}</span>
          </button>
          <button type="button" onClick={onPaidIn} className="min-h-tap rounded-sm text-right hover:bg-surface2">
            <span className="tnum text-body-strong text-text">{copy.payCycle.paidIn(formatWhole(isCycle ? s.paidIn : paidIn))}</span>
          </button>
        </div>
        {isCycle ? (
          <button type="button" onClick={onDue} className="mt-t3 flex min-h-tap w-full items-center justify-between rounded-sm text-small text-accent hover:bg-surface2">
            <span>{t.hero.seeDue}</span><ChevronRight aria-hidden size={20} />
          </button>
        ) : (
          <p className="mt-t3 text-caption text-text-muted">{t.hero.switchHint}</p>
        )}
      </div>
    </section>
  );
}

// ---- Feed --------------------------------------------------------------------------------------------

const Feed = forwardRef<HTMLElement, {
  searchRef: RefObject<HTMLInputElement>; feed: Transaction[]; shown: number; onMore: () => void; q: string; setQ: (v: string) => void;
  direction: FeedDirection; setDirection: (v: FeedDirection) => void; selected: SpendCategory | null; onClearCategory: () => void;
  edits: CategoryOverrides; onOpen: (id: string) => void; onClear: () => void;
}>(function Feed({ searchRef, feed, shown, onMore, q, setQ, direction, setDirection, selected, onClearCategory, edits, onOpen, onClear }, ref) {
  const visible = feed.slice(0, shown);
  const groups: { date: string; items: Transaction[] }[] = [];
  for (const x of visible) {
    const g = groups.at(-1);
    if (g && g.date === x.date) g.items.push(x); else groups.push({ date: x.date, items: [x] });
  }
  return (
    <section ref={ref} aria-labelledby="feed-h" className="mt-t3 scroll-mt-t6 rounded-md bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-x-t3 p-t4 pb-t2">
        <h2 id="feed-h" className="text-h3 text-text">{t.feed.heading}</h2>
        <span role="status" className="text-caption text-text-muted">{t.feed.count(feed.length)}</span>
      </div>
      <div className="flex flex-col gap-t3 px-t4 pb-t3">
        <label className="flex min-h-[52px] items-center gap-t2 rounded-sm border border-neutral bg-surface px-t3 focus-within:border-accent focus-within:outline focus-within:outline-[length:var(--focus-width)] focus-within:outline-offset-[var(--focus-offset)] focus-within:outline-focus">
          <Search aria-hidden size={20} className="text-text-muted" />
          <span className="sr-only">{t.feed.searchLabel}</span>
          <input id="spending-search" ref={searchRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.feed.searchLabel}
            className="min-w-0 flex-1 bg-transparent text-body text-text outline-none placeholder:text-text-muted" />
        </label>
        <SegmentedControl label={t.feed.directionLabel} value={direction} onChange={setDirection}
          options={(["all", "out", "in"] as FeedDirection[]).map((v) => ({ value: v, label: t.feed.direction[v] }))} />
        {selected && <FilterChip label={categoryNames[selected]} onRemove={onClearCategory} />}
      </div>
      {feed.length === 0 ? (
        <div className="px-t4 pb-t4"><EmptyState variant={q ? "noSearchResults" : "noTransactions"} query={q} onAction={onClear} /></div>
      ) : (
        <>
          {groups.map((g) => (
            <div key={g.date}>
              <h3 className="bg-surface2 px-t4 py-t2 text-caption text-text-muted">{formatShortDay(g.date)}/{g.date.slice(0, 4)}</h3>
              <ul>{g.items.map((x) => <li key={x.id} className="border-b border-line last:border-b-0"><TransactionRow tx={{ ...x, category: edits[x.id] ?? x.category }} edited={!!edits[x.id]} onOpen={() => onOpen(x.id)} /></li>)}</ul>
            </div>
          ))}
          {feed.length > shown && (
            <div className="p-t4"><Button full variant="secondary" onClick={onMore}>{t.feed.showMore(Math.min(PAGE, feed.length - shown))}</Button></div>
          )}
        </>
      )}
    </section>
  );
});

// ---- Insight + support -----------------------------------------------------------------------------
function InsightSheets({ sheet, setSheet, items, insights, budgets, onBudget }: {
  sheet: SheetState; setSheet: (s: SheetState) => void; items: InsightItem[]; insights: ReturnType<typeof spendingInsights>;
  budgets: Partial<Record<SpendCategory, number>>; onBudget: (c: SpendCategory) => void;
}) {
  const open = sheet?.kind === "insight" || sheet?.kind === "support";
  const id = open ? sheet.id : null;
  const item = items.find((i) => i.id === id);
  const ins = insights.find((i) => i.id === id);
  const support = sheet?.kind === "support";
  const close = () => setSheet(null);
  let footer = null;
  if (item && ins && !support) {
    footer = ins.id === "gambling" ? (
      <>
        <ButtonLink full variant="secondary" href={`/score/${FACTOR_SLUGS.ADVERSE_SPEND}`}>{t.insights.scoreMethod}</ButtonLink>
        <Button full variant="secondary" onClick={() => setSheet({ kind: "support", id: ins.id })}>{t.insights.support}</Button>
        <Button full variant="tertiary" onClick={close}>{t.insights.notNow}</Button>
      </>
    ) : ins.id === "food" ? (
      <>
        <Button full variant="secondary" onClick={() => onBudget("food")}>{budgets.food !== undefined ? t.insights.adjustBudget(categoryNames.food) : t.insights.setBudget(categoryNames.food)}</Button>
        <Button full variant="tertiary" onClick={close}>{t.insights.notNow}</Button>
      </>
    ) : (
      <>
        <ButtonLink full variant="secondary" href="/subscriptions">{t.insights.reviewSubscriptions}</ButtonLink>
        <Button full variant="tertiary" onClick={close}>{t.insights.notNow}</Button>
      </>
    );
  }
  return (
    <Sheet open={open && !!item} onClose={close} title={support ? gamblingSupport.title : item?.title ?? ""}
      subtitle={support ? undefined : ins ? `${categoryNames[ins.category]}${ins.id === "gambling" ? ` · ${factorCopy.ADVERSE_SPEND.name}` : ""}` : undefined}
      onBack={support ? () => setSheet({ kind: "insight", id: id! }) : undefined} footer={footer}>
      {support ? (
        <SupportOptions />
      ) : item ? <InsightSheetBody item={item} /> : null}
    </Sheet>
  );
}

// ---- Merchant sheet ----------------------------------------------------------------------------------
const categoryOptions = EDITABLE_CATEGORIES.map((c) => ({ value: c, label: categoryNames[c] }));

function MerchantSheet({ sheet, setSheet, data, p, edits, original, onRecategorise }: {
  sheet: SheetState; setSheet: (s: SheetState) => void; data: SpendData; p: Period; edits: CategoryOverrides;
  original: Record<string, CategoryId>; onRecategorise: (id: string, c: CategoryId) => void;
}) {
  const merchant = sheet?.kind === "merchant" ? sheet.merchant : null;
  const list = merchant ? spendingFeed(data, p, edits, {}).filter((x) => x.merchant === merchant && x.amount < 0) : [];
  const totalAmt = sumMoney(list.filter((x) => x.status === "posted").map((x) => -x.amount));
  return (
    <Sheet open={!!merchant} onClose={() => setSheet(null)} title={merchant ?? ""}
      subtitle={merchant ? t.merchant.lead(list.length, formatCents(totalAmt), p.label) : undefined}>
      <ul className="flex flex-col">
        {list.map((x) => (
          <li key={x.id} className="grid grid-cols-[1fr_auto] items-center gap-x-t3 gap-y-t2 border-t border-line py-t3">
            <button type="button" onClick={() => setSheet({ kind: "tx", id: x.id, fromMerchant: merchant! })} className="min-h-tap rounded-xs text-left text-small text-text hover:bg-surface2">
              {formatShortDay(x.date)}{x.status === "pending" ? ` · ${txCopy.pending}` : ""}
            </button>
            <span className="tnum text-body-strong text-text">−{formatCents(-x.amount)}</span>
            <div className="col-span-2">
              <SelectInput hideLabel label={t.merchant.categoryFor(x.merchant, formatDate(x.date))} value={x.category}
                options={categoryOptions} onChange={(v) => onRecategorise(x.id, v)} />
              {edits[x.id] && <p className="mt-t1 text-caption text-text-muted">{t.tx.original(categoryNames[original[x.id]!])}</p>}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-t4 text-small text-text-muted">{t.tx.hint}</p>
    </Sheet>
  );
}

// ---- Transaction sheet -------------------------------------------------------------------------------
function TransactionSheet({ sheet, setSheet, tx, original, edits, onRecategorise, onReset, persona, corrections }: {
  persona: PersonaId; corrections: { oneOff: string[]; regular: string[] } | null;
  sheet: SheetState; setSheet: (s: SheetState) => void; tx: Transaction | null; original: Record<string, CategoryId>;
  edits: CategoryOverrides; onRecategorise: (id: string, c: CategoryId) => void; onReset: (id: string) => void;
}) {
  const from = sheet?.kind === "tx" ? sheet.fromMerchant : undefined;
  const Icon = tx ? categoryIcons[tx.subcategory === "centrelink" ? "centrelink" : tx.category] : null;
  const debit = !!tx && tx.amount < 0;
  const { addRule } = useCorrections(persona);
  const c = correctionCopy.transaction;
  const kind = tx && corrections ? (corrections.oneOff.includes(tx.merchant) ? "one_off" : corrections.regular.includes(tx.merchant) ? "regular" : null) : null;
  return (
    <Sheet open={!!tx} onClose={() => setSheet(null)} title={tx?.merchant ?? ""}
      subtitle={tx ? `${formatShortDay(tx.date)} · ${tx.amount < 0 ? "−" : "+"}${formatCents(Math.abs(tx.amount))}` : undefined}
      onBack={from ? () => setSheet({ kind: "merchant", merchant: from }) : undefined}
      footer={tx && debit && !from ? <Button full variant="secondary" onClick={() => setSheet({ kind: "merchant", merchant: tx.merchant })}>{t.tx.allFrom(tx.merchant)}</Button> : undefined}>
      {tx && (
        <div className="flex flex-col gap-t4">
          <div className="flex items-center gap-t3">
            {Icon && <span aria-hidden className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-sm bg-surface2" style={{ color: catVar(tx.category) }}><Icon size={24} /></span>}
            <p className="text-small text-text-muted">{tx.description}</p>
          </div>
          {tx.status === "pending" && <p className="text-small text-text-muted">{t.tx.pending}</p>}
          {debit ? (
            <>
              <SelectInput label={t.tx.category} value={tx.category} options={categoryOptions} onChange={(v) => onRecategorise(tx.id, v)} />
              {edits[tx.id] && (
                <div className="flex flex-wrap items-center justify-between gap-t2">
                  <p className="text-caption text-text-muted">{t.tx.original(categoryNames[original[tx.id]!])}</p>
                  <Button variant="tertiary" onClick={() => onReset(tx.id)}>{t.tx.reset}</Button>
                </div>
              )}
              {tx.category === "transfer" && <p className="text-small text-text-muted">{t.tx.transferNote}</p>}
              {/* Spec 05: make it a member rule, so future payments from this merchant follow it. */}
              {corrections && <Button variant="secondary" full onClick={() => addRule({ kind: "category", merchant: tx.merchant, category: tx.category }, { from: original[tx.id] })}>{c.allFrom(tx.merchant)}</Button>}
              <p className="text-small text-text-muted">{t.tx.hint}</p>
            </>
          ) : (
            <>
              <p className="text-small text-text">{categoryNames[tx.category]}</p>
              {corrections && tx.category === "income" && (
                <fieldset>
                  <legend className="text-body-strong text-text">{c.income}</legend>
                  <div className="mt-t2 flex flex-wrap gap-t2">
                    <Button variant={kind === "one_off" ? "primary" : "secondary"} aria-pressed={kind === "one_off"} onClick={() => addRule({ kind: "income_one_off", merchant: tx.merchant })}>{c.oneOff}</Button>
                    <Button variant={kind === "regular" ? "primary" : "secondary"} aria-pressed={kind === "regular"} onClick={() => addRule({ kind: "income_regular", merchant: tx.merchant })}>{c.regular}</Button>
                  </div>
                  <p className="mt-t2 text-caption text-text-muted">{c.incomeNote}</p>
                </fieldset>
              )}
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

// ---- Budgets -----------------------------------------------------------------------------------------
function BudgetsTab({ data, cycle, budgets, edits, onEdit, onMerchant }: {
  data: SpendData; cycle: Period; budgets: Partial<Record<SpendCategory, number>>; edits: CategoryOverrides;
  onEdit: (c: SpendCategory) => void; onMerchant: (m: string) => void;
}) {
  const v = budgetView(data, cycle, budgets, edits);
  const rows = new Map(categoryTotals(data, cycle, edits).map((r) => [r.category, r]));
  const rowOf = (c: SpendCategory): Row => rows.get(c) ?? { category: c, name: categoryNames[c], type: categoryTypes[c], total: 0, count: 0, share: 0, previousTotal: 0, change: 0 };
  const frac = v.totalBudget ? Math.min(v.totalSpent / v.totalBudget, 1) : 0;
  return (
    <div className="mt-t4 flex flex-col gap-t3">
      <section aria-labelledby="bud-h" className="rounded-lg bg-surface p-t5">
        <h2 id="bud-h" className="text-h3 text-text">{t.budgets.heading}</h2>
        <p className="mt-t1 text-small text-text-muted">{copy.payCycle.range(formatDayMonth(cycle.start), formatDayMonth(cycle.end))}</p>
        {v.budgeted.length ? (
          <>
            <p className="tnum mt-t4 text-h2 font-display text-text">{t.budgets.summary(formatWhole(v.totalSpent), formatWhole(v.totalBudget))}</p>
            <div aria-hidden className="mt-t3 h-t2 overflow-hidden rounded-pill" style={{ background: "var(--chart-ring-track)" }}>
              <div className="h-full bg-accent" style={{ width: `${frac * 100}%` }} />
            </div>
            <p className="mt-t2 text-caption text-text-muted">{t.budgets.summaryNote(v.budgeted.length)}</p>
          </>
        ) : <p className="mt-t4 text-small text-text">{t.budgets.none}</p>}
        <p className="mt-t3 text-caption text-text-muted">{t.budgets.intro}</p>
      </section>
      {v.budgeted.length > 0 && (
        <ul className="flex flex-col gap-t3">
          {v.budgeted.map((b) => (
            <li key={b.category}>
              <CategoryRow row={rowOf(b.category)} budget={b.budget} onEditBudget={() => onEdit(b.category)}
                merchants={merchantsIn(data, cycle, b.category, edits)} onMerchant={(m) => onMerchant(m.merchant)} />
            </li>
          ))}
        </ul>
      )}
      {v.other.length > 0 && (
        <section aria-labelledby="bud-other" className="rounded-md bg-surface">
          <h2 id="bud-other" className="p-t4 pb-t2 text-h3 text-text">{t.budgets.otherCategories}</h2>
          <ul>
            {v.other.map((r) => {
              const Icon = categoryIcons[r.category];
              return (
                <li key={r.category} className="flex min-h-[64px] items-center gap-t3 border-t border-line px-t4 py-t2">
                  <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-surface2" style={{ color: catVar(r.category) }}><Icon size={24} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body-strong text-text">{r.name}</span>
                    <span className="tnum block text-caption text-text-muted">{copy.payCycle.spent(formatWhole(r.spent))}</span>
                  </span>
                  <button type="button" onClick={() => onEdit(r.category)} aria-label={`${t.budgets.editTitle(r.name)}: ${catCopy.setBudget}`}
                    className="min-h-tap shrink-0 rounded-sm px-t2 text-small text-accent hover:bg-surface2">{catCopy.setBudget}</button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function BudgetSheet({ sheet, setSheet, data, budgets, edits, onSave }: {
  sheet: SheetState; setSheet: (s: SheetState) => void; data: SpendData; budgets: Partial<Record<SpendCategory, number>>;
  edits: CategoryOverrides; onSave: (c: SpendCategory, v: number | null) => void;
}) {
  const c = sheet?.kind === "budget" ? sheet.category : null;
  const [cents, setCents] = useState<number | null>(null);
  useEffect(() => { if (c) setCents(budgets[c] !== undefined ? Math.round(budgets[c]! * 100) : null); }, [c, budgets]);
  const avg = c ? averagePerCycle(data, c, 3, edits) : null;
  return (
    <Sheet open={!!c} onClose={() => setSheet(null)} title={c ? t.budgets.editTitle(categoryNames[c]) : ""}
      footer={c ? (
        <>
          <Button full disabled={cents === null} onClick={() => onSave(c, cents! / 100)}>{t.budgets.save}</Button>
          {budgets[c] !== undefined && <Button full variant="tertiary" onClick={() => onSave(c, null)}>{t.budgets.remove}</Button>}
        </>
      ) : undefined}>
      {c && (
        <CurrencyInput key={c} label={t.budgets.amountLabel} valueCents={cents} onChangeCents={setCents}
          helper={avg ? t.budgets.amountHint(formatWhole(avg)) : t.budgets.amountHintNone}
          errorText={{ format: t.budgets.invalid, precision: t.budgets.invalid, negative: t.budgets.invalid }} />
      )}
    </Sheet>
  );
}
