// Spending this pay cycle (Spending v5 and Today, 09/10/2026). One selector behind both pages: the summary (spent
// by day n of 14, the everyday comparison with the same day of the last cycle, the usual cycle, pending, paid in,
// pay advances), the fixed and repayments lines, every everyday category in Essentials and Lifestyle, and each
// category's panel (spent so far against usual, a status line and a detail line chosen by rule, merchants, and a
// budget amount from the same logic as Budget ideas). Pure; every rule below is unit tested.
import type { Transaction } from "@/lib/api/types";
import { categoryNames, categoryTypes } from "@/content/en-AU";
import { addDays, daysBetween, type ISODate } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { budgetSuggestions, suggestedBudget } from "./budgets";
import type { Budgets } from "./edits";
import { lastCycles, type Period, type SpendData } from "./periods";
import { categoryTotals, paidInFor, spendingFeed, totalSpent, type SpendCategory } from "./spending";
import { applyOverrides, inPeriod, type CategoryOverrides } from "./transactions";
import { changeTone, type ChangeTone } from "./today";

// ---- Settings (decisions to revisit: each is one constant) ------------------------------------------------

/** Fixed costs: one line, not everyday spending (09/10/2026: rent only). */
export const FIXED_COSTS: readonly SpendCategory[] = ["housing"];
/** Repayments: a second line (loans, buy now pay later, pay advance repayments). */
export const REPAYMENTS: readonly SpendCategory[] = ["loan_repayment", "bnpl", "wage_advance"];
/** "Usual" everywhere: the average of the last 3 complete pay cycles (fewer when that's all there is). */
export const USUAL_CYCLES = 3;
/** The row's "vs last" column: the same day of the last cycle, or usual by now. */
export const ROW_BASELINE: "same_point" | "usual_pace" = "same_point";
/** "Over" in the panel: ahead of usual by now by more than 20% and $20 (or past the usual full cycle). */
export const PACE_THRESHOLD = { pct: 0.2, min: 20 } as const;
/** Categories with no "Set a budget" prompt in their panel (empty: every category gets the same prompt). */
export const NO_BUDGET_PROMPT: readonly SpendCategory[] = [];
/** Categories where "Mostly {merchant}" never names the merchant (empty for now). */
export const HIDE_MERCHANT_NAME: readonly SpendCategory[] = [];
/** "Mostly {merchant}" when the top merchant is at least this share of the category. */
export const MOSTLY_SHARE = 0.5;

// ---- Usual -----------------------------------------------------------------------------------------------

/** The complete pay cycles "usual" is based on: up to USUAL_CYCLES before this one, never part-cycles. */
export function usualCycles(d: SpendData): Period[] {
  return lastCycles(d, USUAL_CYCLES + 1).slice(0, USUAL_CYCLES).filter((c) => !c.limitedByHistory && c.basedOnDays > 0);
}

/** Usual spend per cycle (all categories, or one), and how many cycles it's based on. null with no history. */
export function usualSpend(d: SpendData, overrides: CategoryOverrides = {}, category?: SpendCategory): { amount: number; cycles: number } | null {
  const cycles = usualCycles(d);
  if (!cycles.length) return null;
  const totals = cycles.map((c) => (category
    ? sumMoney(categoryTotals(d, c, overrides).filter((r) => r.category === category).map((r) => r.total))
    : totalSpent(d, c, overrides)));
  return { amount: Math.round((totals.reduce((a, b) => a + b, 0) / cycles.length) * 100) / 100, cycles: cycles.length };
}

// ---- Panel rules (B2) -------------------------------------------------------------------------------------

export type PanelStatus = { kind: "over_cycle"; amount: number } | { kind: "ahead"; amount: number } | { kind: "about" };

/** Usual by day n: the usual full cycle, pro rata (no better pace model in the app yet). */
export const usualByDay = (usual: number, day: number, of: number) => Math.round(((usual * day) / of) * 100) / 100;

/** Over the usual full cycle → "$X over your usual cycle"; ahead of pace past the threshold → "$X more than usual by
 * now"; otherwise "About usual for this point". The "Spent so far" tile is "over" in the first two cases. */
export function panelStatus(spent: number, usual: number, byNow: number): PanelStatus {
  if (spent > usual) return { kind: "over_cycle", amount: sumMoney([spent, -usual]) };
  const ahead = sumMoney([spent, -byNow]);
  if (ahead > Math.max(byNow * PACE_THRESHOLD.pct, PACE_THRESHOLD.min)) return { kind: "ahead", amount: ahead };
  return { kind: "about" };
}

export interface MerchantGroup { merchant: string; pending: boolean; count: number; total: number; tx: { id: string; date: ISODate; amount: number }[] }

/** A category's merchants: posted and pending kept apart (pending listed last), biggest first. */
export function merchantGroups(tx: Transaction[]): MerchantGroup[] {
  const m = new Map<string, MerchantGroup>();
  for (const t of tx.filter((x) => x.amount < 0)) {
    const pending = t.status === "pending";
    const key = `${t.merchant}|${pending ? "p" : ""}`;
    const g = m.get(key) ?? { merchant: t.merchant, pending, count: 0, total: 0, tx: [] };
    g.count += 1;
    g.total = sumMoney([g.total, -t.amount]);
    g.tx.push({ id: t.id, date: t.date, amount: -t.amount });
    m.set(key, g);
  }
  return [...m.values()].sort((a, b) => Number(a.pending) - Number(b.pending) || b.total - a.total);
}

export interface PanelDetail { change: number | null; mostly: { merchant: string; total: number } | null }

/** The detail line: the change since this point last cycle when it passes the colour threshold, and the main
 * merchant when there's more than one and it's at least half the category. Nothing when neither applies. */
export function panelDetail(category: SpendCategory, total: number, change: number | null, previous: number | null, merchants: MerchantGroup[]): PanelDetail {
  const shown = change !== null && previous !== null && changeTone(change, previous) !== "neutral" ? change : null;
  const posted = merchants.filter((m) => !m.pending);
  const top = posted[0];
  const mostly = posted.length > 1 && top && total > 0 && top.total / total >= MOSTLY_SHARE && !HIDE_MERCHANT_NAME.includes(category)
    ? { merchant: top.merchant, total: top.total } : null;
  return { change: shown, mostly };
}

/** The panel's budget amount: Budget ideas' own suggestion when there is one (so the two never disagree); otherwise
 * the usual full cycle rounded to $10. Null for NO_BUDGET_PROMPT categories or with no usual amount. */
export function budgetAmount(category: SpendCategory, suggestions: { category: SpendCategory; suggested: number }[], usual: number | null): { amount: number; from: "suggestion" | "usual" } | null {
  if (NO_BUDGET_PROMPT.includes(category)) return null;
  const s = suggestions.find((x) => x.category === category);
  if (s) return { amount: s.suggested, from: "suggestion" };
  if (usual === null || usual <= 0) return null;
  return { amount: Math.max(10, Math.round(usual / 10) * 10), from: "usual" };
}

// ---- The view --------------------------------------------------------------------------------------------

export interface CategoryLine {
  category: SpendCategory; name: string; total: number;
  /** Same day of the last cycle (or the previous equal period); null with no comparable history. */
  previous: number | null;
  /** The row's "vs last" figure (ROW_BASELINE), and its colour. */
  change: number | null; tone: ChangeTone;
  usual: number | null; usualByNow: number | null;
  status: PanelStatus | null; over: boolean;
  detail: PanelDetail;
  merchants: MerchantGroup[]; txCount: number;
  budget: { amount: number; from: "suggestion" | "usual" } | null;
}
export interface Line { categories: { category: SpendCategory; name: string; total: number; merchants: string[] }[]; total: number; change: number | null }
export interface SpendingView {
  /** "cycle": this pay cycle so far (day n of 14). "period": any other period, compared with the one before. */
  kind: "cycle" | "period";
  day: number; of: number;
  total: number;
  /** Everyday spending (fixed and repayments left out) against the same point last cycle. */
  everyday: { total: number; previous: number | null; change: number | null };
  usual: { amount: number; cycles: number } | null;
  pending: number; paidIn: number; payAdvances: number;
  fixed: Line; repayments: Line;
  groups: { type: "essential" | "lifestyle"; total: number; rows: CategoryLine[] }[];
  categoryCount: number;
}

const isEveryday = (c: SpendCategory) => !FIXED_COSTS.includes(c) && !REPAYMENTS.includes(c);

export function spendingView(d: SpendData, p: Period, overrides: CategoryOverrides = {}, opts: { budgets?: Budgets; hideGambling?: boolean; ideaAmounts?: Partial<Record<SpendCategory, number>> } = {}): SpendingView {
  const cur = lastCycles(d, 1)[0]!;
  const isCycle = p.start === cur.start && p.end === cur.end;
  const end = p.end > d.asOf ? d.asOf : p.end;
  const now: Period = { ...p, end };
  const of = daysBetween(p.start, p.end) + 1;
  const day = Math.min(of, daysBetween(p.start, end) + 1);
  // Comparison: the same day of the last cycle (this cycle), or the previous period of the same length.
  const len = isCycle ? day : daysBetween(p.start, end) + 1;
  const prevStart = addDays(p.start, -of);
  const prev: Period | null = prevStart >= d.profile.data_from
    ? { id: "cycle", label: "Same point last pay cycle", start: prevStart, end: addDays(prevStart, len - 1), basedOnDays: len, limitedByHistory: false } : null;

  const rowsNow = categoryTotals(d, now, overrides);
  const prevMap = prev ? new Map(categoryTotals(d, prev, overrides).map((r) => [r.category, r.total])) : null;
  const before = (c: SpendCategory) => (prevMap ? prevMap.get(c) ?? 0 : null);
  const total = totalSpent(d, now, overrides);
  const everydayNow = sumMoney(rowsNow.filter((r) => isEveryday(r.category)).map((r) => r.total));
  const everydayPrev = prevMap ? sumMoney([...prevMap.entries()].filter(([c]) => isEveryday(c)).map(([, v]) => v)) : null;
  const usual = usualSpend(d, overrides);
  // Amounts the member has typed into Budget ideas, so the panel's "Set a budget of $X" keeps matching the card.
  const suggestions = budgetSuggestions(d, opts.budgets ?? {}, overrides).map((x) => ({ ...x, suggested: opts.ideaAmounts?.[x.category] ?? x.suggested }));
  const tx = inPeriod(applyOverrides(d.transactions, overrides), now);
  const feedFor = (c: SpendCategory) => spendingFeed(d, now, overrides, { category: c });

  const line = (cats: readonly SpendCategory[]): Line => {
    const rows = rowsNow.filter((r) => cats.includes(r.category));
    const t = sumMoney(rows.map((r) => r.total));
    const pt = prevMap ? sumMoney(cats.map((c) => prevMap.get(c) ?? 0)) : null;
    return {
      categories: rows.map((r) => ({ category: r.category, name: categoryNames[r.category], total: r.total, merchants: merchantGroups(feedFor(r.category)).filter((m) => !m.pending).map((m) => m.merchant) })),
      total: t, change: pt === null ? null : sumMoney([t, -pt]),
    };
  };

  const lineFor = (c: SpendCategory, t: number): CategoryLine => {
    const previous = before(c);
    const u = usualSpend(d, overrides, c)?.amount ?? null;
    const byNow = u !== null && isCycle ? usualByDay(u, day, of) : null;
    const status = u !== null && byNow !== null ? panelStatus(t, u, byNow) : null;
    const sameChange = previous === null ? null : sumMoney([t, -previous]);
    const [change, base] = ROW_BASELINE === "usual_pace" && byNow !== null ? [sumMoney([t, -byNow]), byNow] : [sameChange, previous];
    const merchants = merchantGroups(feedFor(c));
    return {
      category: c, name: categoryNames[c], total: t, previous,
      change, tone: change === null || base === null ? "neutral" : changeTone(change, base),
      usual: u, usualByNow: byNow, status, over: !!status && status.kind !== "about",
      detail: panelDetail(c, t, sameChange, previous, merchants),
      merchants, txCount: merchants.reduce((n, m) => n + m.count, 0),
      budget: budgetAmount(c, suggestions, u),
    };
  };

  // Every everyday category with spending (no Other on Spending), biggest first within Essentials and Lifestyle.
  const everyday = rowsNow.filter((r) => isEveryday(r.category) && r.total > 0 && !(opts.hideGambling && r.category === "gambling"));
  const groups = (["essential", "lifestyle"] as const).map((type) => {
    const rows = everyday.filter((r) => categoryTypes[r.category] === type).sort((a, b) => b.total - a.total).map((r) => lineFor(r.category, r.total));
    return { type, total: sumMoney(rows.map((r) => r.total)), rows };
  }).filter((g) => g.rows.length > 0);

  return {
    kind: isCycle ? "cycle" : "period", day, of, total,
    everyday: { total: everydayNow, previous: everydayPrev, change: everydayPrev === null ? null : sumMoney([everydayNow, -everydayPrev]) },
    usual,
    pending: sumMoney(tx.filter((t) => t.status === "pending" && t.amount < 0 && t.category !== "transfer").map((t) => -t.amount)),
    paidIn: paidInFor(d, now),
    payAdvances: sumMoney(tx.filter((t) => t.status === "posted" && t.amount > 0 && t.category === "wage_advance").map((t) => t.amount)),
    fixed: line(FIXED_COSTS), repayments: line(REPAYMENTS),
    groups,
    categoryCount: rowsNow.filter((r) => r.total > 0).length,
  };
}

// ---- How lenders see your spending ----------------------------------------------------------------------

export interface LenderFacts { lenders: number; payAdvances: number; gamblingDeposits: number | null }

/** What lenders tend to look at this period: how many lenders were repaid, pay advances taken, gambling deposits. */
export function lenderFacts(d: SpendData, p: Period, overrides: CategoryOverrides = {}, opts: { hideGambling?: boolean } = {}): LenderFacts {
  const tx = inPeriod(applyOverrides(d.transactions, overrides), { ...p, end: p.end > d.asOf ? d.asOf : p.end }).filter((t) => t.status === "posted");
  return {
    lenders: new Set(tx.filter((t) => t.amount < 0 && t.category === "loan_repayment").map((t) => t.merchant)).size,
    payAdvances: tx.filter((t) => t.amount > 0 && t.category === "wage_advance").length,
    gamblingDeposits: opts.hideGambling ? null : tx.filter((t) => t.amount < 0 && t.category === "gambling").length,
  };
}

/** Kept for callers that only need the suggestion formula. */
export { suggestedBudget };
