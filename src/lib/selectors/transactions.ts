import type { CategoryId, Transaction } from "@/lib/api/types";
import { inRange } from "@/lib/format/dates";
import type { Period, SpendData } from "./periods";

/** Recategorisation overrides, keyed by transaction id (mock: localStorage; real: Tippla DB). */
export type CategoryOverrides = Record<string, CategoryId>;

export function applyOverrides(tx: Transaction[], overrides: CategoryOverrides = {}): Transaction[] {
  if (!Object.keys(overrides).length) return tx;
  return tx.map((t) => (overrides[t.id] ? { ...t, category: overrides[t.id]! } : t));
}

/** Pending transactions show in the feed but never count in totals. */
export const posted = (tx: Transaction[]) => tx.filter((t) => t.status === "posted");
export const pending = (tx: Transaction[]) => tx.filter((t) => t.status === "pending");
/**
 * Transfers between the customer's own accounts. In a real multi-account response these dwarf real
 * spending (one sample had $48,703 of 90-day debits against $13,981 income), so they are excluded from
 * every spent and paid-in figure.
 */
export const isTransfer = (t: Transaction) => t.category === "transfer";
export const isDebit = (t: Transaction) => t.amount < 0 && !isTransfer(t);
export const isCredit = (t: Transaction) => t.amount > 0 && !isTransfer(t);
/** Income = wages and Centrelink, styled identically. Pay advances are credits but not income. */
export const isIncome = (t: Transaction) => t.amount > 0 && t.category === "income";

export const inPeriod = (tx: Transaction[], p: Period) => tx.filter((t) => inRange(t.date, p.start, p.end));

/** Posted debits in a period: the basis of every "spent" figure. */
export const debitsIn = (d: SpendData, p: Period, overrides?: CategoryOverrides) =>
  inPeriod(posted(applyOverrides(d.transactions, overrides)), p).filter(isDebit);

/** Search by merchant, description or amount ("52" finds $52.00; "$18.99" finds $18.99). */
export function searchTransactions(tx: Transaction[], q: string): Transaction[] {
  const s = q.trim().toLowerCase();
  if (!s) return tx;
  const num = s.replace(/[$,\s]/g, "");
  const isAmount = /^\d+(\.\d{0,2})?$/.test(num);
  return tx.filter((t) =>
    t.merchant.toLowerCase().includes(s) || t.description.toLowerCase().includes(s) ||
    (isAmount && Math.abs(t.amount).toFixed(2).startsWith(num)));
}
