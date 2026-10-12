// Progress and goals copy (en-AU). Celebrates what's going well; a pay cycle that didn't go to plan is just
// the past, never a failure. No comparisons with other people.

export const progressCopy = {
  title: "Pay cycles",
  sub: "How each pay cycle went, one after another",
  homeLink: "Pay cycles",
  homeNoGoal: "See how things are going, and set a goal if you want one",
  homeGoal: (amt: string, date: string, pct: number) => `Goal: ${amt} left by ${date} · ${pct}% there`,
  homeGoalPending: (amt: string, date: string) => `Goal: ${amt} left by ${date}`,

  goal: {
    heading: "Your goal",
    none: "Pick an amount to have left the day before payday. We'll build it into your safe-to-spend figure, a bit each pay cycle.",
    /** When Today isn't showing a safe-to-spend figure (short or tight), don't promise one. */
    noneNoSafe: "Pick an amount to have left the day before payday. We'll work out how much to aim for each pay cycle, and show here how each one went.",
    set: "Set a goal",
    target: (amt: string, date: string) => `${amt} left the day before payday, by ${date}`,
    thisCycle: (amt: string, date: string) => `This pay cycle, aim to have ${amt} left on ${date}.`,
    onHold: "Your bills take everything this pay cycle, so your goal waits until there's room. That's fine.",
    latest: (amt: string, date: string) => `On ${date} you had ${amt} left.`,
    latestBelow: (date: string) => `On ${date} your balance was below $0. Each pay cycle is a fresh start.`,
    noneYet: (date: string) => `We'll show how it's going after payday on ${date}.`,
    reached: (amt: string) => `You had ${amt} or more left. Goal reached.`,
    ended: (date: string) => `Your goal date (${date}) has passed. Set a new one whenever you like.`,
    progress: (pct: number) => `${pct}% of the way`,
    edit: "Change goal",
    remove: "Remove goal",
    removed: "Goal removed",
    saved: "Goal saved",
    sheetTitle: "Set a goal",
    amountLegend: "How much to have left the day before payday",
    custom: "Another amount",
    customLabel: "Amount ($)",
    byLabel: "By",
    byHint: (date: string) => `Pick a date from ${date}.`,
    perCycle: (amt: string, n: number) => (n === 1 ? `About ${amt} in one pay cycle.` : `That builds up by about ${amt} each pay cycle, over ${n} pay cycles.`),
    save: "Save goal",
    invalidAmount: (min: string, max: string) => `Enter an amount between ${min} and ${max}`,
    invalidDate: (date: string) => `Pick a date on or after ${date}`,
  },

  cycles: {
    heading: "Money left the day before payday",
    intro: "Your balance the day before each payday. This pay cycle is a forecast.",
    current: (a: string, b: string) => `${a} – ${b} · this pay cycle`,
    /** Worded like the completed rows: "Below $0 (…)" or "… left", marked as a forecast. */
    forecast: (amt: string, below: boolean) => (below ? `Below $0 (about ${amt}, forecast)` : `About ${amt} left (forecast)`),
    forecastNote: (perDay: string, bills: string) => `With your usual everyday spending (about ${perDay} a day). Counting bills only: ${bills}.`,
    seeCalendar: "See it on the calendar",
    row: (a: string, b: string) => `${a} – ${b}`,
    left: (amt: string) => `${amt} left`,
    below: "Below $0",
    advance: (n: number) => (n === 1 ? "1 pay advance" : `${n} pay advances`),
    fee: (n: number) => (n === 1 ? "1 bank fee" : `${n} bank fees`),
    none: "We'll show this after your first full pay cycle.",
  },

  streaks: {
    heading: "Going well",
    no_advance: (n: number) => `${n} pay cycles in a row without a new pay advance`,
    no_failed_payment: (n: number) => `${n} pay cycles in a row with no failed payments`,
    money_left: (n: number) => `${n} pay cycles in a row with money left before payday`,
    none: "When something goes well, like spending less than at this point last cycle, it shows up here.",
    soFar: "So far this pay cycle",
    everyday_less: (amt: string) => `${amt} less on everyday spending than at this point last cycle`,
    gambling_less: (amt: string) => `${amt} less on gambling than at this point last cycle`,
    inARow: "Pay cycles in a row",
  },

  timeline: {
    heading: "What you did",
    cancelled_subscription: (m: string) => `You marked ${m} as cancelled`,
    skip_advance: "You chose to skip the next pay advance",
    acted_on_bill: (m: string) => `You acted on the ${m} payment`,
  },

  scoreLink: "See your SmartScore over time",

  tally: { heading: "Tippla has helped you save", see: "What we've counted" },
} as const;

export const summaryCopy = {
  title: "Your weekly summary",
  range: (a: string, b: string) => `${a} – ${b}`,
  intro: "What's been happening with your money this week, in one place.",
  safe: "Safe to spend today",
  goal: "Your goal",
  saved: "Tippla has helped you save",
  updates: "This week",
  nothing: "A quiet week: nothing new to report.",
  link: "Your weekly summary",
} as const;
