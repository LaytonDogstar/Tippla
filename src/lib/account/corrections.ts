// Spec 05 member corrections. Two kinds:
//  - member rules: match a merchant (or payer) and override how Tippla treats it, now and for every future
//    matching transaction ("This is rent", "Not a bill", "This has ended", "This isn't a loan", income
//    "One-off" / "Regular pay");
//  - one predicted bill: "Already paid", "Different amount", "Moved to <date>" (in AccountState.billAdjust).
// Applied when the data loads (applyAccount), so the forecast, safe to spend, feed, loans, subscriptions and
// score explanations all agree straight away. Pure.
import type { CategoryId, PersonaData, Transaction, UpcomingBill } from "@/lib/api/types";
import { EDITABLE_CATEGORIES } from "@/lib/selectors/edits";

export const RULE_KINDS = ["category", "not_bill", "bill_ended", "not_subscription", "subscription_ended", "not_loan", "loan_ended", "income_one_off", "income_regular"] as const;
export type RuleKind = (typeof RULE_KINDS)[number];
export interface MemberRule { id: string; kind: RuleKind; merchant: string; category?: CategoryId; createdAt: string }
export type CorrectionEntity = "transaction" | "bill" | "subscription" | "loan" | "income";

/** Which entity each rule corrects (analytics `correction_made`). */
export const RULE_ENTITY: Record<RuleKind, CorrectionEntity> = {
  category: "transaction", not_bill: "bill", bill_ended: "bill", not_subscription: "subscription", subscription_ended: "subscription",
  not_loan: "loan", loan_ended: "loan", income_one_off: "income", income_regular: "income",
};

/** What selectors need to know beyond the rewritten transactions and bills. */
export interface AppliedRules { endedSubscriptions: string[]; endedLoans: string[]; oneOffIncome: string[]; regularIncome: string[] }

const MAX_RULES = 60;
export function parseRules(v: unknown): MemberRule[] {
  if (!Array.isArray(v)) return [];
  return v.filter((r): r is MemberRule => !!r && typeof r === "object"
    && typeof r.id === "string" && (RULE_KINDS as readonly string[]).includes(r.kind) && typeof r.merchant === "string" && r.merchant.length > 0 && r.merchant.length <= 80
    && typeof r.createdAt === "string" && (r.kind !== "category" || (EDITABLE_CATEGORIES as string[]).includes(r.category as string)))
    .map((r) => ({ id: r.id, kind: r.kind, merchant: r.merchant, createdAt: r.createdAt, ...(r.kind === "category" ? { category: r.category } : {}) }))
    .slice(-MAX_RULES);
}

/** Add a rule, replacing any earlier rule of the same family for that merchant (the latest answer wins). */
export function withRule(rules: MemberRule[] = [], r: Omit<MemberRule, "id">): MemberRule[] {
  const family = (k: RuleKind) => (k.startsWith("income") ? "income" : k.includes("loan") ? "loan" : k.includes("subscription") ? "sub" : k.includes("bill") ? "bill" : k);
  const kept = rules.filter((x) => !(x.merchant === r.merchant && family(x.kind) === family(r.kind)));
  return [...kept, { ...r, id: `${r.kind}:${r.merchant}` }];
}

export interface BillAdjust {
  paid: string[];
  oneOffs: { id: string; label: string; amount: number; date: string }[];
  /** Bill id → the amount the member says it will be. */
  amounts?: Record<string, number>;
  /** Bill id → the date the member says it moved to. */
  moved?: Record<string, string>;
}

const billKey = (b: { merchant: string; date: string }) => `${b.merchant}:${b.date}`;

export function applyRules(d: PersonaData, rules: MemberRule[] = [], adj?: BillAdjust): PersonaData {
  const by = (kinds: RuleKind[]) => new Set(rules.filter((r) => kinds.includes(r.kind)).map((r) => r.merchant));
  const cat = new Map(rules.filter((r) => r.kind === "category").map((r) => [r.merchant, r.category!]));
  const notLoan = by(["not_loan"]);
  const dropBills = by(["not_bill", "bill_ended", "subscription_ended", "loan_ended"]);
  const recat = <T extends { merchant: string; category: CategoryId }>(x: T, debit: boolean): T => {
    // Category rules move spending only: money in stays income.
    if (debit && cat.has(x.merchant) && x.category !== "income") return { ...x, category: cat.get(x.merchant)! };
    if (notLoan.has(x.merchant) && x.category === "loan_repayment") return { ...x, category: "bills" as CategoryId };
    return x;
  };
  const transactions: Transaction[] = rules.length ? d.transactions.map((t) => recat(t, t.amount < 0)) : d.transactions;
  const paid = new Set(adj?.paid ?? []);
  const today = d.asOf;
  const oneOffs: UpcomingBill[] = (adj?.oneOffs ?? []).filter((o) => o.date > today).map((o) => ({
    date: o.date, merchant: o.label, expected_amount: o.amount, category: "bills", confidence: "confirmed", cadence_days: 0,
  }));
  const bills = d.derived.upcoming_bills
    .filter((b) => !paid.has(billKey(b)) && !dropBills.has(b.merchant))
    .map((b) => {
      const k = billKey(b);
      const amount = adj?.amounts?.[k];
      const moved = adj?.moved?.[k];
      return recat({ ...b, origin: k, ...(amount !== undefined ? { expected_amount: amount, confidence: "confirmed" as const } : {}), ...(moved ? { date: moved } : {}) }, true);
    })
    .filter((b) => b.date > today);
  return {
    ...d,
    transactions,
    derived: { ...d.derived, upcoming_bills: [...bills, ...oneOffs].sort((x, y) => x.date.localeCompare(y.date)) },
    memberRules: {
      endedSubscriptions: [...by(["not_subscription", "subscription_ended"])],
      endedLoans: [...by(["loan_ended", "not_loan"])],
      oneOffIncome: [...by(["income_one_off"])],
      regularIncome: [...by(["income_regular"])],
    },
  };
}
