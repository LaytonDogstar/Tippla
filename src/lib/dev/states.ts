// Dev-only state toggles (docs/09 "toggle via dev switcher where not persona-driven"). Carried in a cookie
// set by ?state=a,b (or ?state=none). Data states transform the persona data at load; screen states are
// read by the shell and pages. Presentation mode never shows the switcher, but states still apply.
import type { PersonaData, Transaction } from "@/lib/api/types";
import { addDays } from "@/lib/format/dates";

export const DEV_STATES = ["analysing", "lapsed", "bank_expired", "offline", "one_off", "two_accounts", "payday", "bill_due", "billing_failed", "stale", "consent_expiring"] as const;
export type DevState = (typeof DEV_STATES)[number];
export const DEV_COOKIE = "tippla-dev";

export function parseDevStates(raw: string | undefined | null): DevState[] {
  if (!raw) return [];
  return [...new Set(decodeURIComponent(raw).split(",").map((s) => s.trim()).filter((s): s is DevState => (DEV_STATES as readonly string[]).includes(s)))];
}

/** The one-off deposit docs/09 asks for: a $4,000 bond refund on 12/09. */
export const ONE_OFF = { date: "2026-09-12", amount: 4000, description: "BOND REFUND - NSW FAIR TRADING", merchant: "NSW Fair Trading" } as const;

/** Apply the data-state toggles. Pure: returns new data, never mutates the fixtures. */
export function applyDevStates(d: PersonaData, states: DevState[]): PersonaData {
  let out = d;
  if (states.includes("one_off")) out = withOneOff(out);
  if (states.includes("two_accounts")) out = withSecondAccount(out);
  // Spec 05: the bank data consent ends in 10 days (granted 12 months less 10 days ago).
  if (states.includes("consent_expiring")) out = withConsentEnding(out, 10);
  return out;
}

function withOneOff(d: PersonaData): PersonaData {
  const date = d.asOf < ONE_OFF.date ? addDays(d.asOf, -3) : ONE_OFF.date;
  const tx: Transaction = {
    id: `${d.id}_dev_oneoff`, date, description: ONE_OFF.description, merchant: ONE_OFF.merchant, amount: ONE_OFF.amount,
    category: "income", subcategory: null, is_recurring: false, status: "posted", account_id: d.bankStatement.profiles[0]?.accounts[0]?.id ?? 1, balance_after: null,
  };
  // TaleFin's 90-day income metric counts the deposit too (that's the anomaly the selector has to handle).
  const metrics = d.bankStatement.metrics.map((m) => {
    if (m.code !== "AM2072") return m;
    const v = m.value as Record<string, { sum_amount: number; count: number; monthly_mean_amount: number }>;
    const n = v["90"];
    if (!n) return m;
    return { ...m, value: { ...v, "90": { ...n, sum_amount: n.sum_amount + ONE_OFF.amount, count: n.count + 1, monthly_mean_amount: n.monthly_mean_amount + ONE_OFF.amount / 3 } } };
  });
  return { ...d, transactions: [...d.transactions, tx].sort((a, b) => a.date.localeCompare(b.date)), bankStatement: { ...d.bankStatement, metrics } };
}

/** A second connected account (savings) with a little activity, so the Spending account filter appears. */
function withSecondAccount(d: PersonaData): PersonaData {
  const profile = d.bankStatement.profiles[0];
  if (!profile || profile.accounts.length > 1) return d;
  const id = 2;
  const spend: [number, string, string, number, Transaction["category"]][] = [
    [-2, "WOOLWORTHS ONLINE", "Woolworths", -64.3, "groceries"],
    [-5, "BUNNINGS", "Bunnings", -38.9, "shopping"],
    [-9, "OPAL TOP UP", "Opal Top Up", -20, "transport"],
    [-16, "COLES", "Coles", -52.15, "groceries"],
  ];
  const txs: Transaction[] = spend.map(([off, desc, merchant, amount, category], i) => ({
    id: `${d.id}_dev_acc2_${i}`, date: addDays(d.asOf, off), description: desc, merchant, amount, category,
    subcategory: null, is_recurring: false, status: "posted", account_id: id, balance_after: null,
  }));
  return {
    ...d,
    transactions: [...d.transactions, ...txs].sort((a, b) => a.date.localeCompare(b.date)),
    bankStatement: { ...d.bankStatement, profiles: [{ ...profile, accounts: [...profile.accounts, { id, nickname: "Savings", last4: "7731", type: "Savings", balance: 412.6, available: 412.6 }] }, ...d.bankStatement.profiles.slice(1)] },
  };
}

/** Back-date the TaleFin bank-data consent so its 12-month term ends `days` after the data date. */
function withConsentEnding(d: PersonaData, days: number): PersonaData {
  const end = addDays(d.asOf, days);
  const at = `${Number(end.slice(0, 4)) - 1}${end.slice(4)}T10:00:00+10:00`;
  return { ...d, consents: d.consents.map((c) => (c.id === "talefin_bank_data" ? { ...c, granted_at: at } : c)) };
}
