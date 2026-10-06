// All customer-facing strings (en-AU). Components never contain literal copy.
// tests/content.banned.test.ts scans this folder for banned phrases and US spelling.
import type { CategoryId, FactorKey } from "@/lib/api/types";
import type { StageId } from "@/config/stages";

export const categoryNames: Record<CategoryId, string> = {
  housing: "Rent & housing",
  groceries: "Groceries",
  food: "Food & dining",
  transport: "Transport",
  bills: "Bills & utilities",
  subscriptions: "Subscriptions",
  entertainment: "Entertainment",
  alcohol: "Alcohol",
  gambling: "Gambling",
  health: "Health",
  shopping: "Shopping",
  loan_repayment: "Loan repayments",
  bnpl: "Buy now, pay later",
  wage_advance: "Pay advances",
  cash: "Cash withdrawals",
  fees: "Bank fees",
  income: "Income",
  transfer: "Transfers between your accounts",
};

/** Essentials vs lifestyle, for the All / Essentials / Lifestyle filter. */
export const categoryTypes: Record<Exclude<CategoryId, "income" | "transfer">, "essential" | "lifestyle"> = {
  housing: "essential", groceries: "essential", food: "lifestyle", transport: "essential", bills: "essential",
  subscriptions: "lifestyle", entertainment: "lifestyle", alcohol: "lifestyle", gambling: "lifestyle", health: "essential",
  shopping: "lifestyle", loan_repayment: "essential", bnpl: "essential", wage_advance: "essential", cash: "lifestyle",
  fees: "essential",
};

export const stageNames: Record<StageId, string> = {
  building: "Building",
  steadying: "Steadying",
  healthy: "Healthy",
  thriving: "Thriving",
};

export const factorCopy: Record<FactorKey, { name: string; explains: string; lifts: string }> = {
  INCOME: { name: "Income stability", explains: "How steady and regular your pay is", lifts: "Regular pay into the connected account, on a steady schedule" },
  DISPOSABLE_INCOME: { name: "Money left over", explains: "How well your pay covers your regular bills and repayments", lifts: "More of each pay left after bills" },
  LOAN_AMOUNT_AND_TYPE: { name: "Current borrowing", explains: "How many loans and credit products you have, and what kind", lifts: "Fewer open loans — paying one off, or not taking a new one" },
  MISSED_PAYMENT: { name: "Payments on time", explains: "Recent missed or failed payments (recent ones count most)", lifts: "A run of pay cycles with no failed payments" },
  RELIABLE_PAYMENT_HISTORY: { name: "Payment track record", explains: "Your longer-term record of paying on time", lifts: "Keeps improving the longer payments go through" },
  CASH_SPEND: { name: "Cash use", explains: "How much you take out as cash (lenders can't see where cash goes)", lifts: "Paying by card instead of cash where you can" },
  PRODUCTIVE_SPEND: { name: "Spending mix", explains: "The balance of essentials and other spending", lifts: "Sample logic: TaleFin to confirm what lifts this factor" },
  ADVERSE_SPEND: { name: "Gambling & alcohol spending", explains: "Spending lenders treat as higher risk", lifts: "Keeping gambling lower over the next 90 days is one of the ways to lift this factor." },
  GOVERNMENT_RELIANCE: { name: "Income sources", explains: "The mix of wages and government payments in your income", lifts: "" },
};

export const periodLabels = {
  this_cycle: "This pay cycle",
  last_cycle: "Last pay cycle",
  "3_months": "3 months",
  "12_months": "12 months",
} as const;

export const copy = {
  score: {
    reveal: (score: number, stage: string) =>
      `Your SmartScore is ${score}. That puts you in the ${stage} stage. Here's what's shaping it, and the first thing that would move it.`,
    nextStage: (stage: string, at: number, toGo: number) => `Next stage: ${stage} at ${at} — ${toGo} points to go`,
    topStage: "You're in the top stage.",
    change: (delta: number, since: string) =>
      delta === 0 ? `No change since ${since}` : `${delta > 0 ? "Up" : "Down"} ${Math.abs(delta)} since ${since}`,
    strongest: (factor: string, value: string) => `${factor} is your strongest factor at ${value}.`,
    factorNull: "Not enough history yet",
    thinFile: "We need a bit more history to work out your SmartScore — usually 90 days. We'll calculate it automatically.",
    thinFileDate: (date: string) => `We expect to have enough history around ${date}.`,
    noActivity: "We couldn't see enough activity in the account you connected.",
    noIncome: "We couldn't find your pay in this account. If you're paid into a different account, connect it too.",
    bureauOverdue: "Your credit file shows overdue payments, so we can't calculate a SmartScore right now.",
    unavailable: "Your SmartScore is still being worked out. Check back in a few minutes.",
  },
  payCycle: {
    range: (start: string, end: string) => `Pay cycle ${start} – ${end}`,
    daysToPayday: (n: number, payday: string) =>
      n === 0 ? `Payday today (${payday})` : n === 1 ? `1 day to payday (${payday})` : `${n} days to payday (${payday})`,
    spent: (amt: string) => `${amt} spent`,
    paidIn: (amt: string) => `${amt} paid in`,
    payAdvance: (amt: string, repay: string, date: string, fee: string) =>
      `Plus a ${amt} pay advance (not income): ${repay} due back ${date} (${amt} + ${fee} fee)`,
    advanceLine: (amt: string) => `Plus a ${amt} pay advance (not income)`,
    advanceRepay: (repay: string, date: string, amt: string, fee: string) => `${repay} due back ${date} (${amt} + ${fee} fee)`,
    short: (amt: string) => `About ${amt} short before payday`,
    left: (amt: string) => `About ${amt} left after bills`,
    due: (amt: string) => `${amt} due before payday`,
  },
  gambling: {
    title: "How gambling affects your SmartScore",
    body: (pct: string) =>
      `Lenders look at gambling transactions when they review bank statements. Over the last 90 days, gambling deposits averaged ${pct} of your income.`,
    factor: (value: string) => `Your Gambling & alcohol spending factor is ${value}.`,
    trend: (fromAmt: string, fromMonth: string, toAmt: string, toMonth: string) =>
      `Up from ${fromAmt} in ${fromMonth} to ${toAmt} in ${toMonth}.`,
    support:
      "Tools some people find useful: a gambling block on your bank card, BetStop (the national self-exclusion register), and free, confidential support through Gambling Help Online.",
  },
  balance: {
    overdrawn: (n: number, days: number) => `Below $0 on ${n} of the last ${days} days`,
    lowest: (amt: string) => `Lowest balance in the last 90 days: ${amt}`,
    dishonours: (n: number, latest: string) =>
      n === 1 ? `1 payment didn't go through in the last 90 days, on ${latest}` : `${n} payments didn't go through in the last 90 days, most recently on ${latest}`,
  },
  loans: {
    estimated: "estimated from your transactions",
    dti: (pct: string) => `Debt repayments are about ${pct} of income`,
    typeSACC: "Small loan",
    typeMACC: "Medium loan",
    typeAOCC: "Other credit",
    combinedBalance: (amt: string, n: number) => `About ${amt} left across ${n} small loans (estimated)`,
    repaid: (lender: string, amt: string, n: number) => `Repaid to ${lender} in the last 90 days: ${amt} (${n} ${n === 1 ? "repayment" : "repayments"})`,
  },
  banners: {
    bankExpired: (date: string) =>
      `Your bank connection has expired, so your numbers stopped updating on ${date}. Reconnect to refresh them.`,
    hardship: "Money tight right now? There are options →",
    scoreDrop: (n: number) => `Your SmartScore dropped ${n} points. See what changed →`,
    newOffer: (n: number) => (n === 1 ? "You have 1 new offer →" : `You have ${n} new offers →`),
  },
  income: {
    basedOn: (days: number) => `Based on ${days} days`,
    payPattern: (amt: string, weekday: string) => `Pay of about ${amt} every second ${weekday}`,
    expected: (payer: string, amt: string, exact: boolean, date: string) => `${payer} ${exact ? amt : `about ${amt}`} · ${date}`,
  },
  empty: {
    noBankData: "Connect your bank to see your SmartScore. It takes about two minutes and you can disconnect any time.",
    noOffers: "No offers right now. Tippla checks for you every time your data refreshes. You don't need to do anything.",
    noTransactions: "Nothing in this period. Try a longer range.",
    noSubscriptions: "We haven't found any regular subscriptions.",
    noRecommendations: "Nothing to suggest this pay cycle.",
    search: (q: string) => `No transactions match "${q}".`,
  },
  months: { partial: (to: string) => `to ${to}`, noData: "No data" },
} as const;

export const weekdayLong: Record<string, string> = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};
