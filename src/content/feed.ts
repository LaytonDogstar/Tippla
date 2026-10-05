// "Needs a look" feed, score explanations and the Home status line (en-AU). Supportive, plain, no blame.
// Lender offers never appear here (guardrail): this loop is about the customer's own money.

export const feedCopy = {
  heading: "Needs a look",
  allClear: "Nothing needs a look right now. We'll let you know if something comes up.",
  more: (n: number) => (n === 1 ? "1 more thing" : `${n} more things`),
  showAll: "Show all",
  showFewer: "Show fewer",
  done: "Done",
  snooze: "Snooze",
  dismiss: "Dismiss",
  snoozeOptions: { tomorrow: "Until tomorrow", payday: "Until payday" },
  snoozeTitle: (title: string) => `Snooze: ${title}`,
  toast: { done: "Marked as done", snoozed: (until: string) => `Snoozed until ${until}`, dismissed: "Dismissed. We won't show this again" },
  urgency: { 5: "Today", 4: "Soon", 3: "This week", 2: "When you can", 1: "For your info" } as Record<number, string>,
  hardship: "Options if money's tight",

  rules: {
    shortfall: {
      title: (amt: string) => `About ${amt} short before payday`,
      body: (bal: string, due: string, payday: string) => `Your balance is ${bal} and ${due} is due before ${payday}.`,
      action: "See what's due",
    },
    billOverBalance: {
      title: (merchant: string, amt: string, day: string) => `${merchant} ${amt} on ${day} is more than your forecast balance`,
      body: (bal: string) => `We expect about ${bal} in your account the day before. It may not go through in full.`,
      action: "See that day",
    },
    repaymentDue: {
      title: (provider: string, amt: string, day: string) => `${provider} ${amt} comes out ${day}`,
      body: (days: number) => (days <= 0 ? "That's today." : days === 1 ? "That's tomorrow." : `That's in ${days} days.`),
      bodyShort: (bal: string) => `Your forecast balance that day is ${bal}.`,
      action: "See upcoming repayments",
    },
    newSubscription: {
      title: (merchant: string, amt: string) => `New subscription: ${merchant} ${amt} a month`,
      body: (date: string, perYear: string) => `First charged ${date}. That's about ${perYear} a year. If you meant to sign up, there's nothing to do.`,
      action: "Review subscriptions",
    },
    priceRise: {
      title: (merchant: string, amt: string, was: string) => `${merchant} went up to ${amt} (was ${was})`,
      body: (perYear: string) => `That's about ${perYear} more a year.`,
      action: "Review subscriptions",
    },
    duplicate: {
      title: (merchant: string, amt: string, date: string) => `Possible double charge: ${merchant} ${amt} twice on ${date}`,
      body: "If both were you, mark this done. If not, the merchant or your bank can usually refund it.",
      action: "See the charges",
    },
    unusualSpend: {
      title: (cat: string, amt: string) => `${cat} is ${amt} above your usual`,
      body: (now: string, usual: string) => `${now} so far this pay cycle, against about ${usual} on average over the last 3.`,
      pending: (amt: string) => `That includes ${amt} still pending.`,
      action: "See spending",
    },
    scoreChange: {
      titleDown: (n: number) => `Your SmartScore went down ${n} points`,
      titleUp: (n: number) => `Your SmartScore went up ${n} points`,
      action: "See what changed",
    },
  },
} as const;

/** Why a factor moved, in plain words, from the transactions since the last refresh. */
export const attributionCopy = {
  heading: "What changed",
  since: (date: string) => `Since ${date}`,
  estimate: "Estimate",
  estimateNote: "Points are an estimate of how much each change moved your score. The total is your actual change.",
  points: (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}`,
  summary: (parts: string) => parts,
  factorMove: (name: string, from: string, to: string) => `${name} ${from} → ${to}`,
  noChange: "Your factors didn't change enough to move your score.",
  other: "Other small changes",
  reasons: {
    newAdvance: (provider: string, date: string) => `New ${provider} pay advance (${date})`,
    newAdvanceShort: "new pay advance",
    newLoan: (provider: string) => `New ${provider} loan`,
    loanPaidOff: (provider: string) => `${provider} paid off`,
    gambling: (amt: string) => `Gambling deposits ${amt} since the last update`,
    gamblingShort: "gambling deposits",
    dishonour: (n: number) => (n === 1 ? "1 payment didn't go through" : `${n} payments didn't go through`),
    dishonourShort: "failed payment",
    cash: (amt: string) => `Cash withdrawals ${amt}`,
    cashShort: "cash withdrawals",
    leftOver: (amt: string) => (amt.startsWith("−") ? `Spending was ${amt.slice(1)} more than income` : `About ${amt} left after spending`),
    leftOverShort: "money left over",
    noFailed: "No failed payments",
    noFailedShort: "on-time payments",
    income: "Your income was steadier",
    incomeShort: "steadier income",
  },
} as const;

export const statusCopy = {
  checked: (n: number, when: string) => `Checked ${n} new ${n === 1 ? "transaction" : "transactions"} ${when}`,
  when: { morning: "this morning", afternoon: "this afternoon", evening: "this evening", day: (d: string) => `on ${d}` },
  things: (n: number) => (n === 0 ? "nothing to look at" : n === 1 ? "1 thing to look at" : `${n} things to look at`),
  firstCheck: (n: number) => `Read ${n} transactions from your bank`,
} as const;
