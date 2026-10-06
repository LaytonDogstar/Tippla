// Transfers between the customer's own accounts can't be flagged conclusively by TaleFin (decided 30/09/2026),
// so Tippla infers them. It only works across accounts the customer has connected, which is why onboarding
// asks them to add every account they use.
import type { Transaction } from "@/lib/api/types";
import { daysBetween } from "@/lib/format/dates";

/** Categories that are never a transfer, whatever the amounts. */
const NEVER_TRANSFER = new Set(["income", "loan_repayment", "bnpl", "wage_advance", "fees", "gambling"]);
const TRANSFER_WORDS = /\b(TRANSFER|TFR|XFER|TRANSFERRED|INTERNET BANKING|NETBANK|OSKO|PAYID|SAVINGS)\b/i;
const MAX_DAYS_APART = 2;

export interface TransferMatch {
  debitId: string;
  creditId: string;
  amount: number;
  fromAccount: number;
  toAccount: number;
  confidence: "matched"; // same amount, opposite sign, different connected accounts, within 2 days
}

/**
 * Pairs a debit on one connected account with a credit of the same amount on another, within two days.
 * Each transaction is used at most once; the closest date wins. Pending transactions are ignored.
 */
export function findTransferPairs(tx: Transaction[]): TransferMatch[] {
  const posted = tx.filter((t) => t.status === "posted" && !NEVER_TRANSFER.has(t.category));
  const credits = posted.filter((t) => t.amount > 0);
  const used = new Set<string>();
  const out: TransferMatch[] = [];
  // Transfer-worded debits pick first, so "TRANSFER TO …" wins over a same-amount purchase that day.
  const debits = posted
    .filter((t) => t.amount < 0)
    .sort((a, b) => a.date.localeCompare(b.date) || Number(TRANSFER_WORDS.test(b.description)) - Number(TRANSFER_WORDS.test(a.description)));
  for (const d of debits) {
    const candidates = credits
      .filter((c) => !used.has(c.id) && c.account_id !== d.account_id && Math.abs(c.amount + d.amount) < 0.005)
      .map((c) => ({ c, gap: Math.abs(daysBetween(d.date, c.date)) }))
      .filter((x) => x.gap <= MAX_DAYS_APART)
      .sort((a, b) => a.gap - b.gap || Number(TRANSFER_WORDS.test(b.c.description)) - Number(TRANSFER_WORDS.test(a.c.description)));
    const best = candidates[0];
    if (!best) continue;
    used.add(best.c.id);
    out.push({ debitId: d.id, creditId: best.c.id, amount: -d.amount, fromAccount: d.account_id, toAccount: best.c.account_id, confidence: "matched" });
  }
  return out;
}

/**
 * Transfer-looking transactions with no match on a connected account — money that probably went to or
 * came from an account we can't see. Not excluded automatically: ask the customer ("Is this one of your
 * accounts?") and offer to connect it.
 */
export function possibleUnconnectedTransfers(tx: Transaction[], matched = findTransferPairs(tx)): Transaction[] {
  const ids = new Set(matched.flatMap((m) => [m.debitId, m.creditId]));
  return tx.filter((t) => t.status === "posted" && !ids.has(t.id) && t.category !== "transfer" && !NEVER_TRANSFER.has(t.category) && TRANSFER_WORDS.test(t.description));
}

/** Recategorises matched pairs as "transfer" so every total excludes them. Customer overrides still win. */
export function applyTransferDetection(tx: Transaction[]): Transaction[] {
  const ids = new Set(findTransferPairs(tx).flatMap((m) => [m.debitId, m.creditId]));
  return ids.size ? tx.map((t) => (ids.has(t.id) ? { ...t, category: "transfer" as const } : t)) : tx;
}
