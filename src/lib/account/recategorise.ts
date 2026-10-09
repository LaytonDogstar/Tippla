// The change-category drawer (buttons brief, 09/10/2026), as pure steps so the rules are testable. Picking a new
// category saves straight away and, by default, also adds a merchant rule (every payment from that merchant,
// including future ones, goes to the new category). The checkbox adds or removes that rule; Undo puts back both the
// transaction's category and whatever rule the merchant had before.
import type { CategoryId } from "@/lib/api/types";
import type { CategoryOverrides } from "@/lib/selectors/transactions";
import { withRule, type MemberRule } from "./corrections";

export interface RecatStore { edits: CategoryOverrides; rules: MemberRule[] }
/** What one change did, enough to toggle the rule and to undo. */
export interface Move {
  txId: string; merchant: string; to: CategoryId;
  /** The transaction's category as loaded (with any rules already applied): an edit back to it is no edit. */
  loaded: CategoryId;
  /** The transaction's edit before (undefined = none). */
  priorEdit: CategoryId | undefined;
  /** The merchant's category rule before (undefined = none). */
  priorRule: MemberRule | undefined;
  /** Whether "Also move all … payments" is ticked. */
  rule: boolean;
}

export const merchantRule = (rules: MemberRule[] = [], merchant: string) => rules.find((r) => r.kind === "category" && r.merchant === merchant);

/** Put the merchant's category rule back as it was (none, or the earlier one). */
export function restoreRule(rules: MemberRule[] = [], merchant: string, prior: MemberRule | undefined): MemberRule[] {
  const rest = rules.filter((r) => !(r.kind === "category" && r.merchant === merchant));
  return prior ? [...rest, prior] : rest;
}

const setEdit = (edits: CategoryOverrides, id: string, c: CategoryId | undefined) => {
  const next = { ...edits };
  if (c === undefined) delete next[id];
  else next[id] = c;
  return next;
};

/**
 * The store for a move with the rule ticked or not. Ticked: the rule moves every payment from the merchant (this one
 * too, so it carries no edit of its own). Unticked: this transaction alone carries the edit, and the merchant's rule
 * is whatever it was before.
 */
function apply(store: RecatStore, m: Move, at: string): RecatStore {
  return { edits: setEdit(store.edits, m.txId, m.rule || m.to === m.loaded ? undefined : m.to), rules: rulesAfter(store.rules, m, false, at) };
}

/** Pick a new category: saved straight away, with the merchant rule unless `rule: false` (no corrections). */
export function move(store: RecatStore, tx: { id: string; merchant: string; category: CategoryId }, to: CategoryId, opts: { rule?: boolean; at?: string } = {}): { store: RecatStore; move: Move } {
  const m: Move = { txId: tx.id, merchant: tx.merchant, to, loaded: tx.category, priorEdit: store.edits[tx.id], priorRule: merchantRule(store.rules, tx.merchant), rule: opts.rule ?? true };
  return { move: m, store: apply(store, m, opts.at ?? new Date().toISOString()) };
}

/** Tick or untick "Also move all … payments": adds the rule, or puts the merchant's rule back as it was. */
export function toggleRule(store: RecatStore, m: Move, on: boolean, at = new Date().toISOString()): { store: RecatStore; move: Move } {
  const next = { ...m, rule: on };
  return { move: next, store: apply(store, next, at) };
}

/** Undo: the transaction's category and the merchant's rule go back to how they were before the change. */
export function undoMove(store: RecatStore, m: Move): RecatStore {
  return { edits: setEdit(store.edits, m.txId, m.priorEdit), rules: rulesAfter(store.rules, m, true) };
}

/** The category the merchant's payments show, by rule, after the step (null = no rule: as loaded). */
export const overlayFor = (m: Move, undone = false): CategoryId | null => (!undone && m.rule ? m.to : m.priorRule?.category ?? null);

/**
 * Category rules are applied when the data loads (server side). Until the refreshed data arrives, the page shows a
 * rule's effect itself: debits from the merchant (not income) take the rule's category, as applyRules does.
 */
export function withRuleOverlay<T extends { merchant: string; category: CategoryId; amount: number }>(transactions: T[], overlay: Record<string, CategoryId>): T[] {
  if (!Object.keys(overlay).length) return transactions;
  return transactions.map((x) => (x.amount < 0 && x.category !== "income" && overlay[x.merchant] ? { ...x, category: overlay[x.merchant]! } : x));
}

/** The rules after a step, from the latest saved rules (other rules saved meanwhile are kept). */
export function rulesAfter(latest: MemberRule[], m: Move, undone = false, at = new Date().toISOString()): MemberRule[] {
  const rules = restoreRule(latest, m.merchant, m.priorRule);
  return !undone && m.rule ? withRule(rules, { kind: "category", merchant: m.merchant, category: m.to, createdAt: at }) : rules;
}
