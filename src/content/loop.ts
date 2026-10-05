// Pay-cycle loop copy (en-AU): safe to spend, payday check-in, end-of-cycle recap, score projection,
// value tally. Supportive, plain. Streaks only ever celebrate; nothing is said about a streak ending.

export const safeCopy = {
  label: "Safe to spend today",
  perDay: (amt: string) => `${amt} a day`,
  untilPayday: (n: number, payday: string) => (n === 1 ? `Until payday tomorrow (${payday})` : `For the ${n} days until payday (${payday})`),
  none: "Nothing spare before payday",
  noneBody: "Your bills before payday take everything in the account. Spending on essentials only would help.",
  how: "How we worked this out",
  sheetTitle: "Safe to spend today",
  steps: {
    balance: "In your account now",
    bills: (n: number) => (n === 1 ? "1 bill before payday" : `${n} bills before payday`),
    income: "Expected income before payday",
    forecast: (date: string) => `Forecast balance on ${date}`,
    buffer: "Kept aside as a buffer",
    goal: "Towards your goal this pay cycle",
    days: (n: number) => (n === 1 ? "÷ 1 day" : `÷ ${n} days`),
    result: "Safe to spend each day",
  },
  note: "Bills are predicted from past payments. Everyday spending (food, transport) is what this daily figure is for.",
  bufferNote: (amt: string) => `We keep ${amt} aside so an unexpected cost doesn't tip you under.`,
  hardship: "Options if money's tight",
  goalOnHold: "Your goal waits this pay cycle: bills and everyday spending come first.",
  goalIncluded: (amt: string) => `Includes ${amt} towards your goal`,
} as const;

export const checkInCopy = {
  title: "Payday check-in",
  landed: (amt: string, payer: string) => `${amt} from ${payer} landed this morning`,
  heading: "This pay cycle",
  range: (a: string, b: string) => `${a} – ${b}`,
  bills: (n: number, amt: string) => (n === 1 ? `1 bill before next payday: ${amt}` : `${n} bills before next payday: ${amt}`),
  repayments: (amt: string) => `Including ${amt} of loan and buy now pay later repayments`,
  advance: (provider: string, amt: string, date: string) => `${provider} ${amt} due back ${date}`,
  noAdvance: "No pay advance to repay this pay cycle.",
  safe: (amt: string) => `Safe to spend: about ${amt} a day`,
  seeBills: "See this pay cycle's bills",
} as const;

export const recapCopy = {
  title: "Your last pay cycle",
  range: (a: string, b: string) => `${a} – ${b}`,
  noAdvance: "You got through without a new pay advance.",
  streak: (n: number) => (n <= 1 ? "" : `That's ${n} pay cycles in a row.`),
  advances: (n: number, amt: string) => (n === 1 ? `You took 1 pay advance (${amt}).` : `You took ${n} pay advances (${amt} in total).`),
  score: (from: number, to: number) => (to === from ? `SmartScore steady at ${to}.` : `SmartScore ${from} → ${to}.`),
  noScore: "No SmartScore update this pay cycle.",
  fees: (n: number, amt: string) => (n === 1 ? `1 bank fee (${amt}).` : `${n} bank fees (${amt}).`),
  noFees: "No bank fees.",
  feesAvoided: (amt: string) => `${amt} in fees avoided.`,
  spent: (spent: string, paidIn: string) => `${spent} spent, ${paidIn} paid in.`,
  changes: "Biggest changes from the cycle before",
  change: (cat: string, amt: string, up: boolean) => `${cat} ${up ? "up" : "down"} ${amt}`,
  seeSpending: "See last pay cycle's spending",
} as const;

export const projectionCopy = {
  heading: "If you act on your next step",
  line: (action: string, score: number, date: string) => `${action}: about ${score} by ${date}`,
  note: "An estimate from how much this factor usually moves your score. Your real result depends on everything else too.",
  estimate: "Estimate",
  actions: {
    "pay-advance": "Skip the next pay advance",
    "money-left": "Keep more left after bills",
    gambling: "Keep gambling lower",
    "failed-payments": "Keep enough in for direct debits",
    subscriptions: "Trim a subscription",
    cash: "Pay by card instead of cash",
    payoff: "Pay off a loan",
  } as Record<string, string>,
} as const;

export const tallyCopy = {
  label: "Tippla has helped you save",
  amount: (amt: string) => amt,
  since: "From things you've done in the app",
  none: "Nothing counted yet. Savings show here once we can see them in your bank data.",
  pendingHeading: "Waiting to confirm",
  confirmedHeading: "Confirmed",
  sheetTitle: "What we've counted",
  items: {
    subscription: (m: string, n: number) => (n === 1 ? `${m} cancelled: 1 charge not taken` : `${m} cancelled: ${n} charges not taken`),
    subscriptionPending: (m: string, date: string) => `${m} cancellation: we'll confirm after ${date}`,
    advance: (date: string) => `No pay advance in the pay cycle from ${date}: fee not paid`,
    advancePending: (date: string) => `Skipping the next advance: we'll confirm after payday ${date}`,
    dishonour: (merchant: string, date: string) => `${merchant} went through on ${date} with no failed-payment fee`,
  },
  rule: "We only count savings we can see in your bank data after something you did in the app.",
  cancelled: "I've cancelled it",
  cancelledToast: (m: string) => `Thanks. We'll check ${m} doesn't charge again`,
  cancelledNote: (date: string) => `Marked as cancelled. We'll confirm after ${date}.`,
  tryThis: "I'll try this",
  tryThisToast: "Noted. We'll show you how it goes at payday",
  tryingNote: "You're trying this. We'll show you how it went at payday.",
} as const;
