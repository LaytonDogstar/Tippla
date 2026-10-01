// "What's driving it" facts for each factor (docs/05: supporting metrics as plain facts with periods).
// Wording only; every number comes from selectors.
export const drivers = {
  updated: (s: string) => s,
  loans: {
    sacc: (n: number, names: string, total: string) => `${n} small loan${n === 1 ? "" : "s"} open (${names}), about ${total} left in total, estimated`,
    nonSacc: (n: number, kind: string, names: string, total: string) => `${n} ${kind} open (${names}), about ${total} left, estimated`,
    mediumLoan: (n: number) => (n === 1 ? "medium loan" : "medium loans"),
    otherCredit: "other credit",
    payAdvance: (provider: string, since: string) => `A ${provider} pay advance every fortnight since ${since}`,
    bnpl: (names: string) => `Buy now, pay later: ${names}`,
    none: "No open loans found in the last 90 days",
  },
  gambling: {
    share: (pct: string) => `Gambling deposits averaged ${pct} of your income over the last 90 days`,
    total: (amt: string) => `${amt} in gambling deposits over the last 90 days`,
    alcohol: (amt: string) => `About ${amt} a month on alcohol over the last 90 days`,
    none: "No gambling deposits in the last 90 days",
  },
  moneyLeft: {
    short: (amt: string) => `About ${amt} short before payday this pay cycle`,
    left: (amt: string) => `About ${amt} left after bills this pay cycle`,
    dti: (pct: string) => `Debt repayments are about ${pct} of income over the last 90 days`,
    lowest: (amt: string) => `Lowest balance in the last 90 days: ${amt}`,
  },
  payments: {
    failed: (n: number, latest: string) => (n === 1 ? `1 payment didn't go through in the last 90 days, on ${latest}` : `${n} payments didn't go through in the last 90 days, most recently on ${latest}`),
    none: "No failed payments in the last 90 days",
    overdrawn: (n: number) => `Below $0 on ${n} of the last 90 days`,
  },
  track: {
    history: (days: number) => `Based on ${days} days of connected bank history`,
    failed180: (n: number) => (n === 0 ? "No failed payments in that time" : `${n} failed payment${n === 1 ? "" : "s"} in that time`),
  },
  income: {
    pattern: (amt: string, weekday: string) => `Pay of about ${amt} every second ${weekday}`,
    sources: (n: number) => `${n} regular income sources, treated the same way`,
    irregular: "Your pay amounts varied over the last 90 days",
    steady: "Your pay amounts were steady over the last 90 days",
    mix: "Your score also looks at the mix of wages and government payments in your income.",
  },
  cash: {
    atm: (amt: string, n: number) => `${amt} taken out at ATMs over the last 90 days (${n} withdrawal${n === 1 ? "" : "s"})`,
    none: "No ATM withdrawals in the last 90 days",
  },
  mix: {
    essentials: (pct: string) => `Everyday essentials were about ${pct} of your spending over the last 90 days`,
    sample: "Sample logic: TaleFin to confirm what this factor measures (Q2)",
  },
  nullFactor: "We don't have enough history to work this out yet.",
};

export const scorePage = {
  title: "SmartScore",
  howItWorks: "How your score works",
  howBody: [
    "Your SmartScore is worked out from your connected bank account. It looks at nine things lenders look at when they review bank statements, and scores each out of 10.",
    "It doesn't use your credit file, and checking it doesn't affect your credit.",
    "It refreshes each fortnight when your bank data updates.",
  ],
  incomeMix: "Your score also looks at the mix of wages and government payments in your income.",
  stagesNote: "Stages: Building 0–449 · Steadying 450–599 · Healthy 600–749 · Thriving 750–1,000.",
  trend: "Fortnightly trend",
  trendScale: "Scale 0–1,000",
  trendPoint: (date: string, score: number) => `${date}: ${score}`,
  roomToMove: "Factors with room to move",
  other: "Other factors",
  strongestNote: (name: string, v: string) => `${name} is your strongest factor at ${v}.`,
  measures: "What it measures",
  driving: "What's driving it",
  lifts: "What lifts it",
  related: "Related",
  points: (n: number) => `${n} points`,
  toStage: (s: string, at: number) => `to ${s} at ${at}`,
  toStageShort: (s: string) => `to ${s}`,
  range: (a: number, b: number) => `${a} → ${b}`,
  thinCard: "Your SmartScore will appear when there's enough history.",
};
