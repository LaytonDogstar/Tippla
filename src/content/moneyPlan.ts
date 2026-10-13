// Your money plan (12/10/2026; reference: tippla-money-plan-mockup.dc.html). Plain, non-judgemental, "options, not
// rules". COMPLIANCE REVIEW before launch: the gambling card, the repayments card ("Adding more credit right now…"),
// and both helpline numbers (National Debt Helpline 1800 007 007, Gambling Help Online 1800 858 858). Don't change
// that copy without telling the product owner.
import type { SpendGroup, Frequency, LenderKind } from "@/lib/selectors/moneyPlan";

export const moneyPlan = {
  title: "Your money plan",
  sub: (from: string, to: string) => `Built from your last full pay cycle, ${from} – ${to}. These are options, not rules.`,
  subNoCycle: "Built from your bank data so far. These are options, not rules.",
  askPlaceholder: "Ask about your money plan",
  sections: { progress: { title: "Pay cycles" }, wins: { title: "Smaller wins" } },

  // ---- Where your money went (pay cycle card, 13/10/2026; reference: tippla-pay-cycle-option3.html). Supportive, never
  // alarming: no red or warning colours anywhere in this card.
  went: {
    eyebrow: "Last pay cycle",
    over: (amt: string) => `You spent ${amt} more than you were paid`,
    under: (amt: string) => `You had ${amt} left over`,
    even: "You spent about what you were paid",
    stats: { paid: "Paid", spent: "Spent", difference: "Difference" },
    waffleTitle: "Where your pay went",
    waffleKey: "Each square ≈ 1% of your pay",
    ranOut: "Your pay ran out here",
    waffleLabel: (parts: string, total: string) => `Where your pay went: ${parts}. ${total} of pay in total.`,
    groupTitles: { essentials: "Essentials", debt: "Debt & gambling" },
    groups: {
      rent: "Rent",
      everyday: "Everyday spending",
      gambling: "Gambling",
      loans: "Loans & buy now, pay later",
      advance: "Pay-advance repayments",
      bills: "Bills, subscriptions & fees",
    } satisfies Record<SpendGroup, string>,
    advanceOne: (provider: string) => `${provider} repayment`,
    everydaySub: "Food, groceries, transport",
    lenders: (n: number) => (n === 1 ? "1 lender" : `${n} lenders`),
    feeSub: (fee: string) => `Includes a ${fee} fee`,
    ofPay: (pct: string) => `${pct} of pay`,
    /** "about half" only between 45% and 55%; otherwise the percentage. */
    heavy: (share: string, total: string) => `Debt, pay advances and gambling took ${share} your pay, ${total} in total.`,
    shareWords: (pct: number) => (pct >= 0.45 && pct <= 0.55 ? "about half" : null),
    shareOf: (pct: string) => `${pct} of`,
    coveredBy: (gap: string, amt: string, provider: string, date: string) => `The ${gap} gap was covered by a ${amt} ${provider} advance on ${date}.`,
    none: "There isn't a full pay cycle in your bank data yet. Once there is, you'll see where your pay went here.",
  },

  // ---- Shared card bits
  more: "More options",
  remind: "Remind me next pay cycle",
  notRelevant: "Not relevant to me",
  switchPlan: "Switch plan",
  snoozed: (title: string) => `${title}: hidden until your next pay cycle.`,
  dismissed: (title: string) => `${title}: hidden.`,
  undo: "Show it again",

  // ---- Get off pay advances (and the member's other plans)
  plan: {
    eyebrow: "Start here · Your goal",
    eyebrowSuggested: "Start here · Suggested for you",
    run: (amt: string, provider: string, since: string, fee: string | null, repay: string | null) =>
      `You’ve taken a ${amt} ${provider} advance every pay cycle since ${since}.${fee && repay ? ` Each one costs ${fee} and takes ${repay} out of your next pay.` : ""}`,
    runOnce: (amt: string, provider: string, date: string) => `You took a ${amt} ${provider} advance on ${date}.`,
    stepStatus: (n: number, total: number, status: "done" | "current" | "upcoming") => `Step ${n} of ${total}${status === "current" ? " · in progress" : status === "done" ? " · done" : ""}`,
    thisCycle: (from: string, to: string) => `This pay cycle (${from}–${to})`,
    taken: (amt: string, dates: string) => `${amt} taken on ${dates}`,
    over: "so this step carries over to the next pay cycle.",
    noneYet: (limit: string) => (limit === "$0" ? "no advance so far. Keep it that way to payday to finish this step." : `nothing so far. Stay at ${limit} or under to payday to finish this step.`),
    underSoFar: (limit: string) => `within ${limit} so far. Stay there to payday to finish this step.`,
    takeTitle: "What it would take",
    take: (short: string, low: string, high: string, cards: boolean) =>
      `Last pay cycle you ran about ${short} short before payday. To skip or halve the next advance, you’d need to free up ${low === high ? high : `${low}–${high}`}.${cards ? " The cards below show where most of that money goes." : ""}`,
    planNext: "Plan the next pay cycle",
    seeCalendar: "See it on the calendar",
    completed: "Plan complete. Pick another whenever you like.",
  },
  planSheet: {
    title: "Plan the next pay cycle",
    sub: (from: string, to: string) => `${from} – ${to}`,
    goal: (step: string) => `Your goal this pay cycle: ${step.charAt(0).toLowerCase()}${step.slice(1)}.`,
    repayments: (amt: string) => `About ${amt} of repayments come out each pay cycle. They're already counted in your safe to spend.`,
    short: (amt: string) => `Last pay cycle you ran about ${amt} short before payday.`,
    ideasTitle: "Some options",
    ideas: [
      { id: "buffer", text: "Set a small buffer in safe to spend, so the days before payday have some room.", link: "Set a buffer", href: "/progress#buffer" },
      { id: "wins", text: "Tick off one or two of the smaller wins below before payday.", link: "See smaller wins", href: "#s-wins" },
      { id: "calendar", text: "Look at what's due in the next pay cycle, day by day.", link: "Open the calendar", href: null },
    ],
    note: "These are options, not rules. Use any, all or none.",
  },

  // ---- Your repayments
  repay: {
    eyebrow: "Biggest cost after rent",
    eyebrowPlain: "Repayments",
    title: (amt: string) => `Your repayments: about ${amt} a pay cycle`,
    shareWords: (pct: number) => (pct >= 0.45 && pct <= 0.55 ? "half" : pct >= 0.3 && pct < 0.36 ? "about a third" : pct >= 0.24 && pct < 0.27 ? "about a quarter" : null),
    body: (n: number, share: string | null) =>
      `That’s ${n === 1 ? "one lender" : `${n} lenders`}${share ? ` and ${share} of your pay` : ""}, before rent or food. Adding more credit right now is likely to make the gap bigger, not smaller.`,
    bodyNoGap: (n: number, share: string | null) => `That’s ${n === 1 ? "one lender" : `${n} lenders`}${share ? `, about ${share} of your pay` : ""}.`,
    kinds: { loan: "Loan", bnpl: "Buy now, pay later", advance: "Pay advance" } satisfies Record<LenderKind, string>,
    freq: { weekly: "weekly", fortnightly: "fortnightly", monthly: "monthly", irregular: "irregular" } satisfies Record<Frequency, string>,
    advanceFee: (fee: string) => `${fee} fee each time`,
    monthlyAs: (amt: string) => `${amt} a month`,
    weeklyAs: (amt: string) => `${amt} a week`,
    total: "Total per pay cycle",
    cantSee: "Balances are estimates from your bank data, where we have one. We can’t see interest rates. Each lender can give you an exact payout figure.",
    balance: (amt: string) => `Estimated balance ${amt}`,
    balanceShared: (amt: string, others: string) => `About ${amt} left with ${others} (estimated together)`,
    balanceNone: "Balance not available",
    window: "a pay cycle, all repayments including pay advances",
    helpTitle: "Free help with debts",
    helpBody: "A financial counsellor can work out which debts to deal with first, and can talk to your lenders for you about lower or paused repayments. It’s free and confidential.",
    call: (name: string, phone: string) => `Call the ${name} · ${phone}`,
    hardship: "Ask a lender for hardship help",
  },

  // ---- Gambling
  gambling: {
    eyebrow: "Gambling",
    title: (amt: string) => `${amt} on betting last pay cycle`,
    body: (share: string, operators: string, now: string) => `That’s ${share} of your pay, across ${operators}. So far this pay cycle it’s ${now}. If you want to spend less on it, these can help.`,
    options: [
      { id: "block", title: "Block gambling payments on your card", body: "Most Australian banks let you switch this on in their app." },
      { id: "betstop", title: "Self-exclude with BetStop", body: "The free national register. One sign-up covers every licensed online bookmaker." },
      { id: "gho", title: "Talk to someone, any time", body: "Gambling Help Online · 1800 858 858 · free, 24/7." },
    ],
    cta: "See support options",
    hide: "Hide this card",
  },

  // ---- Your progress
  progress: {
    sub: (asOf: string) => `Last pay cycle in full, and this one so far (to ${asOf}). Changes compare with the same point last cycle.`,
    caption: "Last pay cycle and this pay cycle so far",
    rows: { lowest: "Lowest balance", gambling: "Gambling", advances: "Pay advances", loans: "Loans & BNPL" },
    forecast: "forecast with usual spending",
    noChange: "Same as this point last cycle",
    noChangeLowest: "no change",
    soFar: "so far",
    down: (amt: string) => `↓ ${amt}`,
    up: (amt: string) => `↑ ${amt}`,
    sincePoint: "since this point last cycle",
    seeAll: "See every pay cycle",
  },

  // ---- Smaller wins
  wins: {
    sub: (total: string, done: number, of: number) => (done > 0 ? `${done} of ${of} done · worth about ${total} a pay cycle together` : `Worth about ${total} a pay cycle together`),
    subVaries: (done: number, of: number) => (done > 0 ? `${done} of ${of} done` : `${of === 1 ? "1 idea" : `${of} ideas`} to look at`),
    show: "Show",
    hide: "Hide",
    upTo: (amt: string) => `up to ${amt}`,
    about: (amt: string) => `about ${amt}`,
    varies: "varies",
    items: {
      subscriptions: {
        title: "Drop a streaming service or two",
        detail: (names: string, amt: string) => `${names} cost ${amt} a pay cycle together.`,
        link: "Review subscriptions",
      },
      failed_debits: {
        title: "Avoid failed direct debits",
        detail: (n: number, date: string, fees: string) => `${n === 1 ? "1 payment" : `${n} payments`} bounced in the last 90 days, most recently on ${date}: ${fees} in fees.`,
        link: "See what’s due and when",
      },
      phone: {
        title: "Check your phone plan",
        detail: (merchant: string, amt: string) => `${merchant} is about ${amt} a month. Newer plans often give the same data for less.`,
        link: "Ways to pay less",
      },
      energy: {
        title: "Compare energy plans",
        detail: (merchant: string, amt: string, vic: boolean) =>
          `${merchant} is about ${amt} a month. Compare on ${vic ? "Victorian Energy Compare" : "Energy Made Easy"}, the government’s comparison site.`,
        link: (vic: boolean) => (vic ? "Compare on Victorian Energy Compare" : "Compare on Energy Made Easy"),
      },
    },
    opensIn: "(opens in a new tab)",
    none: "Nothing small to tick off right now.",
  },

  // ---- SmartScore link and footer
  score: {
    title: "This plan also helps your SmartScore",
    body: "Fewer pay advances, fewer open loans and less gambling all feed into it. See which factors are moving.",
    link: "Go to SmartScore",
  },
  noCards: "Nothing big stands out right now. The smaller wins below are still worth a look.",
  footer: "General information only. It doesn’t take your full situation into account. We don’t recommend providers or get paid for referrals.",
};
