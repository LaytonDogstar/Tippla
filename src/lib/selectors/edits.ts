// Customer edits that change numbers: recategorised transactions (shared with the server through a cookie,
// so Home and Calendar reflect them too) and per-pay-cycle budgets (localStorage, per docs/04 P3).
import type { CategoryId, PersonaId } from "@/lib/api/types";
import type { CategoryOverrides } from "./transactions";
import type { SpendCategory } from "./spending";

export const EDITS_COOKIE = "tippla-edits";
export const BUDGETS_KEY = "tippla-budgets";

/** Categories a customer can move a transaction to. Income stays out: paid-in is wages and Centrelink only. */
export const EDITABLE_CATEGORIES: CategoryId[] = [
  "housing", "groceries", "food", "transport", "bills", "subscriptions", "entertainment", "alcohol", "gambling",
  "health", "shopping", "loan_repayment", "bnpl", "wage_advance", "cash", "fees", "transfer",
];

export type EditsCookie = Partial<Record<PersonaId, CategoryOverrides>>;
export type Budgets = Partial<Record<SpendCategory, number>>;

const isCategory = (v: unknown): v is CategoryId => typeof v === "string" && (EDITABLE_CATEGORIES as string[]).includes(v);

/** Parse the edits cookie defensively: anything malformed is ignored, never thrown. */
export function parseEdits(raw: string | undefined, persona: PersonaId): CategoryOverrides {
  if (!raw) return {};
  try {
    const all = JSON.parse(decodeURIComponent(raw)) as EditsCookie;
    const mine = all?.[persona];
    if (!mine || typeof mine !== "object") return {};
    return Object.fromEntries(Object.entries(mine).filter(([k, v]) => typeof k === "string" && isCategory(v)));
  } catch {
    return {};
  }
}

export function serialiseEdits(raw: string | undefined, persona: PersonaId, edits: CategoryOverrides): string {
  let all: EditsCookie = {};
  try { all = raw ? (JSON.parse(decodeURIComponent(raw)) as EditsCookie) : {}; } catch { all = {}; }
  all[persona] = edits;
  return encodeURIComponent(JSON.stringify(all));
}

export function parseBudgets(raw: string | null): Budgets {
  if (!raw) return {};
  try {
    const b = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(b).filter(([, v]) => typeof v === "number" && v >= 0 && Number.isFinite(v))) as Budgets;
  } catch {
    return {};
  }
}
