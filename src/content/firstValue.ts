// Spec 04 copy: welcome, first insight ("aha"), goal picker, notification opt-in, and goal lines used later
// by the plan, check-in and recap. Plain, specific, never salesy; the gambling goal is worded neutrally.
import type { FocusGoalType } from "@/lib/account/state";

export const welcomeCopy = {
  title: "Welcome to Tippla",
  line: "We'll tell you what's coming, what needs a look, and how to get ahead, every pay cycle.",
  points: [
    "Connect your bank once. It's read-only.",
    "See one useful thing about your money straight away.",
    "Pick what would help most, and we'll keep it in view.",
  ],
  start: "Get started",
};

const DAYS: Record<string, string> = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };

export const ahaCopy = {
  eyebrow: "The first thing we found",
  shortfall: {
    title: (amt: string, payday: string) => `Heads up: you could be about ${amt} short before your ${payday} payday`,
    body: (balance: string, due: string, n: number) => `You have ${balance} and ${n === 1 ? "1 bill" : `${n} bills`} totalling ${due} due before then.`,
    show: "See what's due",
    sheetTitle: "Due before payday",
    sheetNote: "Options if money's tight are always under Hardship support.",
  },
  subscriptions: {
    title: (amt: string, n: number) => `You're paying ${amt} a year across ${n} subscriptions`,
    body: "Worth a look: are you still using all of them?",
    show: "See them",
    sheetTitle: "Your subscriptions",
    perYear: (amt: string) => `${amt} a year`,
  },
  advance_fees: {
    title: (amt: string) => `You've paid ${amt} in pay advance fees in the last 3 months`,
    body: (n: number, provider: string) => `That's ${n === 1 ? "1 advance" : `${n} advances`} from ${provider}. Each one costs a fee when it's paid back.`,
    show: "See the fees",
    sheetTitle: "Pay advance fees",
    fee: (date: string, amt: string) => `${date}: ${amt} fee`,
  },
  positive: {
    factor: {
      INCOME: "Your income is steady. That's your strongest factor.",
      DISPOSABLE_INCOME: "Your pay covers your bills well. That's your strongest factor.",
      LOAN_AMOUNT_AND_TYPE: "You keep borrowing low. That's your strongest factor.",
      MISSED_PAYMENT: "Your payments go through on time. That's your strongest factor.",
      RELIABLE_PAYMENT_HISTORY: "You have a solid record of paying on time. That's your strongest factor.",
      CASH_SPEND: "You mostly pay by card, so lenders can see where your money goes. That's your strongest factor.",
    } as Record<string, string>,
    factorBody: (name: string, value: string) => `${name}: ${value} / 10.`,
    pay: (weekday: string, amt: string) => `Your pay comes in every second ${DAYS[weekday] ?? weekday}, about ${amt}. That steady rhythm is a good start.`,
    payBody: "Your SmartScore will be ready once there's enough history. We'll keep an eye on things until then.",
    generic: "We've read your history. Here's where things stand.",
    show: "Tell me more",
    sheetTitle: "What this means",
  },
  next: "Next",
  sample: "Sample logic · Q29",
};

export const goalCopy = {
  title: "What would help most right now?",
  intro: "Pick one. You can change it any time.",
  options: {
    reach_payday: "Get to payday without running short",
    off_advances: "Stop relying on pay advances",
    lift_score: "Lift my SmartScore",
    cut_bills: "Cut my bills and subscriptions",
    build_buffer: "Build a small buffer",
    gambling_less: "Spend less on gambling",
  } satisfies Record<FocusGoalType, string>,
  liftTo: (stage: string) => `Lift my SmartScore to ${stage}`,
  build: "Build my SmartScore",
  gamblingNote: "Only you see this choice.",
  continue: "Continue",
  pickOne: "Pick one to continue",
  saved: "Goal saved",
  heading: "Your goal",
  change: "Change",
  changeTitle: "Change your goal",
  save: "Save",
  none: "Pick a goal",
  home: (label: string) => `Your goal: ${label}`,
};

export const notifyOptInCopy = {
  title: "Want a heads-up before you run short?",
  body: "We'll only send what matters: money about to run short, a bill bigger than your balance, and your payday check-in. At most one a day, never between 9pm and 8am.",
  yes: "Yes, turn on alerts",
  no: "Not now",
  blocked: "Your browser didn't allow notifications. You can turn them on later in Account › Profile.",
  later: "You can change this any time in Account › Profile.",
  done: "Go to Today",
};

/** Lines the goal adds to the payday check-in and recap (spec 04 → 02). */
export const goalLines = {
  firstPayday: "Your first payday with Tippla. Here's your pay cycle, with your goal in view.",
  checkIn: (label: string) => `Your goal: ${label}`,
  recap: {
    reach_payday: (amt: string, under: boolean) => (under ? `The day before payday you were ${amt} under.` : `You reached payday with ${amt} left.`),
    build_buffer: (amt: string, under: boolean) => (under ? `The day before payday you were ${amt} under.` : `You had ${amt} left the day before payday.`),
  },
};
