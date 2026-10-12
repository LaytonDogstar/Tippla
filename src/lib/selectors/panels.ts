// The data behind the cross-page panels (journeys brief A2, 12/10/2026): gambling, one lender, money's tight and
// the hardship letter. Pages that open a panel send this; JourneyPanels renders whichever `?panel=` asks for.
// Every figure comes from the shared selectors (figures, moneyPlan, payCycle), so the panel and the page agree.
import type { PersonaData } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import { addDays, daysBetween, type ISODate } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { hardshipPrefill } from "@/lib/hardship/prefill";
import type { LetterPrefill } from "@/components/domain/HardshipLetter";
import { loanBalance, repayments, shortBeforePayday, type LoanBalance } from "./figures";
import { smallerWins, type Frequency, type LenderKind, type Win } from "./moneyPlan";
import { payCycleSummary } from "./payCycle";
import { currentCycle, cycleBefore } from "./periods";
import { applyOverrides, posted, type CategoryOverrides } from "./transactions";

export interface GamblingPanelData {
  cycle: { start: ISODate; end: ISODate };
  total: number;
  lastCycle: number;
  /** Last pay cycle up to the same point (as many days in as this one is). */
  lastSamePoint: number;
  /** total − lastSamePoint: the same comparison as Today's Spending card ("since this point last cycle"). */
  change: number;
  transactions: { id: string; date: ISODate; merchant: string; amount: number }[];
}

export function gamblingPanel(d: PersonaData, overrides?: CategoryOverrides): GamblingPanelData {
  const tx = posted(applyOverrides(d.transactions, overrides)).filter((t) => t.category === "gambling" && t.amount < 0);
  const now = currentCycle(d), last = cycleBefore(d, 1);
  const inC = (c: { start: string; end: string }) => tx.filter((t) => t.date >= c.start && t.date <= c.end);
  const list = inC(now).sort((a, b) => b.date.localeCompare(a.date));
  const total = sumMoney(list.map((t) => -t.amount)), lastCycle = sumMoney(inC(last).map((t) => -t.amount));
  // Compared like Today's Spending card: with the same point in the last pay cycle (same number of days in).
  const samePoint = sumMoney(inC({ start: last.start, end: addDays(last.start, Math.max(0, daysBetween(now.start, d.asOf))) }).map((t) => -t.amount));
  return {
    cycle: { start: now.start, end: now.end }, total, lastCycle, lastSamePoint: samePoint, change: sumMoney([total, -samePoint]),
    transactions: list.map((t) => ({ id: t.id, date: t.date, merchant: t.merchant, amount: -t.amount })),
  };
}

export interface LenderView {
  provider: string; kind: LenderKind; frequency: Frequency;
  amount: number; perCycle: number;
  nextDue: { date: ISODate; amount: number } | null;
  repaid90: number;
  balance: LoanBalance;
}

export function lenderViews(d: PersonaData, overrides?: CategoryOverrides): LenderView[] {
  const tx = posted(applyOverrides(d.transactions, overrides));
  const from = addDays(d.asOf, -89);
  return repayments(d, overrides).lenders.map((l) => {
    const next = d.derived.upcoming_bills.find((b) => b.merchant === l.provider && b.date > d.asOf);
    return {
      provider: l.provider, kind: l.kind, frequency: l.frequency, amount: l.amount, perCycle: l.perCycle,
      nextDue: next ? { date: next.date, amount: next.expected_amount } : null,
      repaid90: sumMoney(tx.filter((t) => t.merchant === l.provider && t.amount < 0 && t.date >= from && t.date <= d.asOf).map((t) => -t.amount)),
      balance: loanBalance(d, l.provider),
    };
  });
}

export interface TightPanelData {
  payday: ISODate;
  billsOnly: number;
  withUsual: { balance: number; date: ISODate } | null;
  /** What's due before payday: lender repayments can be raised with the lender; other bills can often move. */
  due: { merchant: string; amount: number; date: ISODate; lender: boolean }[];
  wins: Win[];
  /** "Set a buffer" only when Today shows the safe-to-spend figure it would protect. */
  bufferVisible: boolean;
  /** For the energy comparison link (Victoria has its own site). */
  state: string;
  /** Calendar range for "what's due before payday": tomorrow to the day before payday (null when payday is tomorrow). */
  beforePayday: { from: ISODate; to: ISODate } | null;
}

const LENDER_CATEGORIES = ["loan_repayment", "bnpl", "wage_advance"];

export function tightPanel(d: PersonaData, overrides?: CategoryOverrides, opts: { safeToSpendVisible?: boolean } = {}): TightPanelData {
  const pc = payCycleSummary(d, overrides);
  const s = shortBeforePayday(d, overrides);
  return {
    payday: s.payday, billsOnly: s.billsOnly, withUsual: s.withEveryday,
    due: pc.dueBeforePayday.map((b) => ({ merchant: b.merchant, amount: b.expected_amount, date: b.date, lender: LENDER_CATEGORIES.includes(b.category) })),
    wins: smallerWins(d),
    bufferVisible: !!opts.safeToSpendVisible,
    state: d.profile.state,
    beforePayday: addDays(d.asOf, 1) <= addDays(s.payday, -1) ? { from: addDays(d.asOf, 1), to: addDays(s.payday, -1) } : null,
  };
}

export interface PanelData {
  asOf: ISODate;
  gambling: GamblingPanelData | null;
  lenders: LenderView[];
  tight: TightPanelData;
  letter: { prefill: LetterPrefill[]; name: string } | null;
  /** Hardship mode (flag, off until signed off): the switch shows in the money's-tight panel. */
  hardshipMode: boolean;
}

/** Everything a page needs to open any of the panels. Gambling is never sent when the member has hidden it. */
export function panelData(d: PersonaData, a: AccountState, overrides?: CategoryOverrides, opts: { letter?: boolean; safeToSpendVisible?: boolean; hardshipMode?: boolean } = {}): PanelData {
  return {
    asOf: d.asOf,
    gambling: a.hideGambling ? null : gamblingPanel(d, overrides),
    lenders: lenderViews(d, overrides),
    tight: tightPanel(d, overrides, opts),
    letter: opts.letter === false ? null : { prefill: hardshipPrefill(d), name: d.profile.full_name },
    hardshipMode: !!opts.hardshipMode,
  };
}
