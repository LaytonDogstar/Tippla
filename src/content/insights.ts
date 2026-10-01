// Insight and recommendation templates (docs/02 pattern: what's happening → what it would change → a choice).
// Numbers always come from selectors; these functions only word them.
export const insightCopy = {
  payAdvance: (amount: string, provider: string, since: string, fee: string) => ({
    context: "Current borrowing",
    title: "Skip the next pay advance if you can",
    summary: `You've taken a ${amount} ${provider} advance every fortnight since ${since}. Each costs ${fee} and comes out the day before payday.`,
    happening: `You've taken a ${amount} ${provider} advance every fortnight since ${since}. Each costs ${fee} and comes out the day before payday.`,
    wouldChange: "Fewer pay advances is one of the ways to lift Current borrowing.",
    ifYouWant: "See what's due before payday, or explore support if money's tight.",
    rationale: "Fewer pay advances is one of the ways to lift Current borrowing.",
  }),
  gambling: (pct: string, factor: string | null) => ({
    context: "Gambling & alcohol spending",
    title: "How gambling affects your SmartScore",
    summary: "Lenders look at gambling transactions when they review bank statements.",
    happening:
      `Lenders look at gambling transactions when they review bank statements. Over the last 90 days, gambling deposits averaged ${pct} of your income.` +
      (factor ? ` Your Gambling & alcohol spending factor is ${factor}.` : ""),
    wouldChange: "Keeping gambling lower over the next 90 days is one of the ways to lift this factor.",
    ifYouWant:
      "Tools some people find useful: a gambling block on your bank card, BetStop (the national self-exclusion register), and free, confidential support through Gambling Help Online.",
  }),
  borrowing: (loans: number, total: string) => ({
    context: "Current borrowing",
    title: "Your open loans",
    summary: `You have ${loans} loans open, about ${total} left in total (estimated from your transactions).`,
    happening: `You have ${loans} loans open, about ${total} left in total (estimated from your transactions).`,
    wouldChange: "Fewer open loans — paying one off, or not taking a new one — lifts Current borrowing.",
  }),
};
