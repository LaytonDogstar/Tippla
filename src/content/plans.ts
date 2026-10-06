// Spec 07 copy: plans, streak milestones, buffer growth, savings goals, the Healthy moment and "What's next",
// and the gated prototypes. Positive only: no guilt, no "failed", no streak-ended copy.
import type { PlanType } from "@/lib/account/state";

export const planCopy = {
  heading: "Your plan",
  titles: {
    off_advances: "Get off pay advances",
    reach_payday: "Reach payday without running short",
    cut_bills: "Cut bills and subscriptions",
    pay_on_time: "Pay on time",
    gambling_less: "Spend less on gambling",
  } satisfies Record<PlanType, string>,
  /** On Home, the score page and the recap the gambling plan is never named (sensitive). */
  privateTitle: "Your personal plan",
  factor: {
    off_advances: "Current borrowing", reach_payday: "Money left over", cut_bills: "Spending mix", pay_on_time: "Payments on time", gambling_less: "Gambling & alcohol spending",
  } satisfies Record<PlanType, string>,
  steps: {
    advance: (amt: string) => (amt === "$0" ? "A pay cycle with no new pay advance" : `A pay cycle with pay advances of ${amt} or less`),
    buffer: "Set a buffer in safe to spend",
    underSts: "Keep everyday spending under safe to spend on 10 of 14 days",
    endPositive: "Finish a pay cycle with money left",
    reviewSubs: "Look over every subscription",
    decideSubs: "Cancel or keep each one",
    checkBills: "Check 2 bills for a cheaper plan",
    reminders: "Keep bill alerts on",
    noDishonour: "A pay cycle with no failed payments",
    twoClean: "Another pay cycle with no failed payments",
    limit: "Set a limit for each pay cycle",
    block: "Turn on your bank's gambling block",
    underLimit: "Stay under your limit for a pay cycle",
  },
  stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
  thisCycle: "This pay cycle",
  soFarAdvance: (amt: string, target: string) => (target === "$0" ? `${amt} of pay advances so far. The goal is none.` : `${amt} of pay advances so far, against ${target}.`),
  onTrack: "On track so far.",
  manual: "Mark as done",
  manualDone: "Done",
  done: (date: string) => `Done ${date}`,
  completed: "Plan complete. Pick another whenever you like.",
  carriesOver: "If this pay cycle doesn't go to plan, this step simply carries over.",
  switch: "Switch plan",
  switchTitle: "Choose a plan",
  switchIntro: "Switch any time. Nothing is lost.",
  start: "Start this plan",
  suggested: "Suggested for you",
  linked: (factor: string) => `Linked to ${factor}`,
  started: (title: string) => `Started: ${title}`,
  limitLabel: "Limit each pay cycle ($)",
  setLimit: "Set limit",
  blockLink: "See gambling support options",
  home: (title: string, step: string, label: string) => `${title} · ${step}: ${label}`,
  homeDone: (title: string) => `${title} · complete`,
  recap: (title: string, step: string) => `Your plan: ${title}, ${step.toLowerCase()}.`,
  optIn: "Only you see this plan.",
};

export const milestoneCopy = {
  no_advance: (n: number) => `${n} pay cycles in a row without a new pay advance.`,
  no_failed_payment: (n: number) => `${n} pay cycles in a row with every payment going through.`,
  money_left: (n: number) => `${n} pay cycles in a row finishing with money left.`,
  title: "A milestone",
};

export const bufferCopy = {
  next: (amt: string) => `Next step: a ${amt} buffer`,
  cycleOfBills: (amt: string) => `one pay cycle of bills (${amt})`,
  surplusTitle: (amt: string) => `Move ${amt} to your buffer?`,
  surplusBody: "You finished the pay cycle with money left. Tippla doesn't move money: set it aside in your banking app, and we'll protect it in safe to spend.",
  setTo: (amt: string) => `Protect ${amt} in safe to spend`,
  how: "How to move it",
  howTitle: "Moving money to savings",
  howSteps: ["Open your banking app.", "Choose Transfer, then your savings account (or open one: most banks let you do it in the app).", "Enter the amount and confirm."],
  set: (amt: string) => `Buffer set to ${amt}`,
};

export const savingsCopy = {
  heading: "Savings goals",
  intro: "Name it, set an amount and a date. We'll show what to put aside each pay cycle.",
  add: "Add a savings goal",
  addTitle: "New savings goal",
  name: "What it's for",
  target: "Amount ($)",
  by: "By",
  account: "Savings account",
  noAccount: "Connect a savings account to track it automatically",
  save: "Save goal",
  remove: (name: string) => `Remove ${name}`,
  line: (name: string, target: string, by: string) => `${name}: ${target} by ${by}`,
  saved: (saved: string, pct: number) => `${saved} saved (${pct}%)`,
  notTracked: "Not linked to an account yet",
  perCycle: (amt: string) => `About ${amt} each pay cycle`,
  reached: "Reached",
  checkIn: (name: string, amt: string) => `${name}: put aside about ${amt} this pay cycle`,
  invalid: "Enter a name, an amount between $10 and $50,000 and a date after today",
  locked: "Savings goals open up at Healthy. Your buffer comes first.",
  max: (n: number) => `Up to ${n} at once.`,
  created: "Savings goal saved",
};

export const moment = {
  title: (stage: string) => `You've reached ${stage}`,
  journey: (from: number, to: number, cycles: number) => `You went from ${from} to ${to} in ${cycles} pay cycles.`,
  fees: (amt: string) => `Along the way you avoided ${amt} in fees.`,
  next: "What's next",
  later: "Later",
};

export const whatsNextCopy = {
  title: "What's next",
  intro: (stage: string) => `Options for the ${stage} stage. Pick what suits you, or none.`,
  options: {
    emergency: { title: "Grow your buffer into an emergency fund", body: "Aim for one pay cycle of bills, then more." },
    goals: { title: "Save for something specific", body: "Name a goal, set a date, and we'll show the steps." },
    multi: { title: "Run more than one goal", body: "Up to three savings goals at once." },
    review: { title: "An annual review", body: "A look back over the year: what changed and what to keep doing." },
    creditFile: { title: "Track your credit file", body: "See your credit score from a credit bureau, alongside your SmartScore." },
    refinance: { title: "Check for cheaper credit", body: "General information about whether a lower-cost loan could replace one you have." },
    plans: { title: "Pick a plan", body: "A few steps over the next pay cycles." },
  } as Record<string, { title: string; body: string }>,
  prototype: "Prototype",
  soon: "Coming later",
};

export const creditFileCopy = {
  title: "Credit file tracking",
  prototypeBanner: "Prototype. This isn't connected to a credit bureau and shows no real credit file.",
  body: "In future you could see your credit score from a credit bureau here, next to your SmartScore, and get told when something changes on your file.",
  how: ["You'd choose to connect, with a separate consent.", "Checking your own file doesn't affect your credit score.", "You could turn it off any time."],
  notYet: "Not available yet",
};

export const refinanceCopy = {
  title: "Check for cheaper credit",
  prototypeBanner: "Prototype. General information only, with no lenders or offers.",
  notEligible: "This check is for members in the Healthy or Thriving stage, with nothing short before payday and no use of hardship tools in the last 3 pay cycles.",
  intro: "What your current credit costs, so you can compare it with what lenders advertise. General information, not a recommendation.",
  row: (provider: string, repay: string) => `${provider}: ${repay} a repayment`,
  tip: "When comparing, look at the comparison rate and total cost, not just the repayment.",
  notYet: "Comparison isn't available yet",
};
