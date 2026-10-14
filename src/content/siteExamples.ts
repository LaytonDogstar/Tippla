// Example figures for the public homepage (14/10/2026). They are Jess's (docs/09), the demo persona, exactly as the
// app shows her, so the site never shows a screen the product couldn't. tests/siteExamples.test.ts checks each one
// against the selectors; if the fixtures change, that test says which figure to update here.
// TODO(launch): confirm with compliance that demo-persona figures are fine as labelled "Example" data.
import type { ISODate } from "@/lib/format/dates";

export const siteExamples = {
  /** Score page: score, stage, last change and what moved it, and the first recommendation. */
  score: {
    score: 472,
    max: 1000,
    change: { delta: -17, since: "2026-09-11" as ISODate },
    next: { name: "Healthy", at: 600, toGo: 128 },
    moved: [
      { name: "Current borrowing", points: -9 },
      { name: "Gambling & alcohol spending", points: -6 },
      { name: "Money left over", points: -2 },
    ],
    nextStep: "Skip the next pay advance if you can",
  },
  /** Today: the shortfall before payday (the onboarding first insight). */
  cycle: {
    from: "2026-09-17" as ISODate,
    to: "2026-09-30" as ISODate,
    payday: "2026-10-01" as ISODate,
    asOf: "2026-09-25" as ISODate,
    short: 52.69,
    balance: 314.31,
    due: 367,
    bills: [
      { merchant: "Beforepay", amount: 315 },
      { merchant: "Telstra", amount: 52 },
    ],
  },
  /** Subscriptions: the streaming insight. */
  streaming: { count: 3, monthly: 48.99 },
  /** Money plan: the last full pay cycle (squares are worked out from these totals: one per 1% of pay). */
  plan: {
    paid: 2166.66,
    groups: [
      { id: "essentials", name: "Essentials", total: 1329.94 },
      { id: "gambling", name: "Gambling", total: 385 },
      { id: "debt", name: "Debt & advances", total: 690 },
    ],
  },
  /** Pay cycles: money left the day before each payday, oldest first; the last is this cycle's forecast. */
  trend: {
    bars: [
      { end: "2026-07-08" as ISODate, value: 83.46 },
      { end: "2026-07-22" as ISODate, value: 12.4 },
      { end: "2026-08-05" as ISODate, value: -241.08 },
      { end: "2026-08-19" as ISODate, value: -49 },
      { end: "2026-09-02" as ISODate, value: -697.98 },
      { end: "2026-09-16" as ISODate, value: -636.26 },
      { end: "2026-09-30" as ISODate, value: -482.69, forecast: true },
    ],
    note: "Things changed in late July, and pay advances began in late August. Tippla shows what would turn it around.",
  },
} as const;
