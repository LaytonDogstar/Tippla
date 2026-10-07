// Component-level strings (en-AU). Scanned by tests/content.banned.test.ts.
// Empty-state titles and actions come from Astra's spec; bodies keep the pack's approved copy (docs/02).

export const ui = {
  close: (title: string) => `Close ${title}`,
  closeShort: "Close",
  back: "Back",
  loading: "Loading…",
  stillLoading: "Still loading your data",
  cancel: "Cancel",
  retry: "Try again",
  undo: "Undo",
  sheetHandleExpand: "Expand sheet",
  sheetHandleCollapse: "Collapse sheet",
  removeFilter: (name: string) => `Remove ${name} filter`,
  noCategoryFilter: "No category filter",
  readOnly: "Read only",
  saving: "Saving…",
  saveFailed: "Could not save this setting. Try again.",
  previous: "Previous",
  next: "Next",
  pageOf: (n: number, total: number) => `${n} of ${total}`,
  estimated: "estimated",
  predicted: "predicted",
};

export const scoreRing = {
  meterText: (score: number, stage: string, toGo: number | null, next: string | null) =>
    toGo !== null && next ? `SmartScore ${score}. ${stage}. ${toGo} points to ${next}.` : `SmartScore ${score}. ${stage}.`,
  loading: "Updating your SmartScore",
  nullState: "Not enough history yet",
  override: "Your SmartScore isn't available",
  seeDetails: "See details",
  toNext: (toGo: number, next: string) => `${toGo} points to ${next}`,
  toNextShort: (next: string) => `to ${next}`,
  endpoints: (from: number, to: number) => `${from} → ${to}`,
};

export const stageScale = {
  label: "SmartScore stages",
  current: "Your current stage",
  about: (stage: string) => `About ${stage}`,
};

export const factorTile = {
  strongest: "Strongest factor",
  nullValue: "—",
  outOf: (v: string) => `${v} / 10`,
};

export const payCycleHero = {
  label: "Pay cycle",
  covered: "Covered",
  short: "Short",
  billsCovered: "Bills covered",
  left: "Left",
  forecast: (balance: string, due: string) => `Balance ${balance} − ${due} due`,
  forecastButton: "See the pay-cycle forecast",
  seeWhatsDue: "See what's due",
  moneyTight: "Options if money's tight",
  unavailable: "Pay-cycle estimate unavailable",
  leftHeadline: (amt: string) => `About ${amt} left after bills`,
};

export const insight = {
  pagerLabel: "Insights",
  seeHow: "See how",
  loading: "Finding your next useful step",
  empty: "No insights to show right now.",
  hidden: "Insight hidden",
  hideFailed: "Couldn't hide this insight. Try again.",
  whatsHappening: "What's happening",
  whatItWouldChange: "What it would change",
  ifYouWant: "If you want them",
  notRelevant: "Not relevant to me",
  notNow: "Not now",
};

export const category = {
  transactions: (n: number) => (n === 1 ? "1 transaction" : `${n} transactions`),
  viewTransactions: "View transactions",
  lifestyle: "Lifestyle",
  seeInsight: "See insight",
  setBudget: "Set a budget",
  editBudget: "Edit budget",
  budgetOf: (spent: string, budget: string) => `${spent} of ${budget}`,
  budgetLeft: (amt: string) => `${amt} left`,
  budgetReached: "Budget reached",
  budgetOver: (amt: string) => `${amt} over budget`,
  budgetZero: "Your budget for this category is $0.",
  missingTotal: "Total not available",
};

export const donut = {
  legendLabel: "Categories in the chart",
  other: (n: number) => `Other (${n} more)`,
  otherSr: (n: number, amt: string) => `Other: ${n} more categories, ${amt}. Opens all categories`,
  heading: "Spending by category",
  centreLabel: "Spent",
  shareOf: (pct: string) => `${pct} of spending`,
  loading: "Loading spending",
  empty: "No spending this period",
  summary: (total: string, top: string) => `Total ${total}. Largest: ${top}.`,
};

export const transaction = {
  pending: "Pending",
  edited: "Category edited",
  pendingEdited: "Pending · Category edited",
  /** Spending feed (UX round 2, 1.8): the same charge twice, flagged in Needs a look. */
  possibleDouble: "Possible double charge",
  seeInNeeds: "See it in Needs a look",
  moneyOut: "money out",
  moneyIn: "money in",
};

export const calendar = {
  pay: "Pay",
  expectedPayday: "Expected payday",
  nextPayday: (day: string) => `Next payday ${day}`,
  confirmedClosing: "Confirmed closing balance",
  forecastBalance: "Balance forecast",
  forecast: "forecast",
  belowZero: "below $0",
  balanceUnavailable: "Balance not available",
  seeIncluded: "See what is included",
  more: (n: number) => `+${n}`,
  dayLabel: (date: string, parts: string[]) => [date, ...parts].join(". "),
  spendCount: (n: number) => (n === 1 ? "1 payment" : `${n} payments`),
  billPredicted: (merchant: string, amt: string) => `${merchant} ${amt} predicted`,
  incomeExpected: (payer: string) => `${payer} expected`,
  today: "today",
  inRange: "in selected range",
  predicted: "predicted",
};

export const loan = {
  balance: "Balance remaining · estimated",
  balanceExact: "Balance remaining",
  nextRepayment: "Next repayment · estimated",
  amountBorrowed: "Amount borrowed",
  frequency: "Repayment frequency",
  remainingTerm: "Remaining term",
  repaid90: "Repaid in the last 90 days",
  estimateNote: "Estimates use connected bank activity. Check your lender for exact figures.",
  viewRepayments: "View repayments",
  missing: "Balance not available",
  balanceShort: "Balance",
  notAvailable: "Not available",
  frequencyShort: "Frequency",
  seeDetails: "See loan details",
  everyDays: (n: number) => (n === 14 ? "Every fortnight" : n === 7 ? "Every week" : n >= 28 && n <= 31 ? "Every month" : `Every ${n} days`),
};

export const offer = {
  amount: "Amount",
  term: "Term",
  weeks: (n: number) => `${n} weeks`,
  comparisonRate: "Comparison rate",
  pa: (pct: string) => `${pct} p.a.`,
  fees: "Fees",
  establishmentIncluded: (amt: string) => `${amt} establishment fee (included in repayments)`,
  perFortnight: "Repayment per fortnight",
  totalCost: "Total cost · interest + fees",
  totalRepaid: "Total repaid · includes amount borrowed",
  whyMatched: "Why you matched",
  notApproval: "Matching is not approval. The lender makes its own assessment.",
  viewDetails: "View details",
  notInterested: "Not interested",
  unavailable: "Offer details unavailable",
  unavailableBody: "We can't show these terms right now. Nothing has been sent to the lender.",
  sample: "Sample",
  sampleLabel: "(sample)",
};

export const recommendation = {
  eyebrow: "Next thing to do",
  seeHow: "See how",
  save: "Save for later",
  saved: "Saved for later",
  notRelevant: "Not relevant to me",
  hidden: "Recommendation hidden",
  sampleEstimate: "Sample estimate",
};

export const buttons = { loading: "Loading…" };

export const nav = {
  label: "Main",
  // Today redesign (07/10/2026): five sections; mobile tabs Today, Money, Ask, Score, More.
  sections: { today: "Today", money: "Money", score: "Score & plan", borrowing: "Borrowing", help: "Help & hardship" },
  tabs: { today: "Today", money: "Money", ask: "Ask", score: "Score", more: "More" },
  askLabel: "Ask Tippla",
  moreTitle: "More",
  accountEntry: (name: string) => `${name} · Account`,
  home: "Today",
  score: "Score",
  spending: "Money",
  loans: "Borrowing",
  support: "Help",
  badge: (n: number) => (n === 1 ? "1 thing to look at" : `${n} things to look at`),
  badgeTail: (n: number) => (n === 1 ? "thing to look at" : "things to look at"),
  hardship: "Hardship support",
  groups: {
    score: "Score",
    spending: "Money",
    loans: "Borrowing",
    support: "Help",
    account: "Account",
  },
  items: {
    smartscore: "SmartScore",
    lift: "Your plan",
    spending: "Spending",
    calendar: "Calendar",
    subscriptions: "Subscriptions",
    loans: "Loans & credit",
    offers: "Offers",
    hardship: "Hardship support",
    help: "Help",
    account: "Account",
    notifications: "Notifications",
  },
};

export type EmptyVariant = "noBankData" | "noOffers" | "noTransactions" | "noSubscriptions" | "noRecommendations" | "noSearchResults";
export const emptyStates: Record<EmptyVariant, { title: string; body: string | ((q: string) => string); action: string }> = {
  noBankData: { title: "No bank data yet", body: "Connect your bank to see your SmartScore. It takes about two minutes and you can disconnect any time.", action: "Connect bank" },
  noOffers: { title: "No offers to show right now", body: "Tippla checks for you every time your data refreshes. You don't need to do anything.", action: "View your SmartScore" },
  noTransactions: { title: "No transactions in this range", body: "Nothing in this period. Try a longer range.", action: "Change date range" },
  noSubscriptions: { title: "No subscriptions found", body: "We haven't found any regular subscriptions.", action: "Review transactions" },
  noRecommendations: { title: "No recommendations right now", body: "Nothing to suggest this pay cycle.", action: "View score factors" },
  noSearchResults: { title: "No search results", body: (q: string) => `No transactions match "${q}".`, action: "Clear search and filters" },
};
