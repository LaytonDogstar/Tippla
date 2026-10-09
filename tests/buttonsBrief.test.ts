// Buttons brief (09/10/2026): the change-category drawer's merchant rule (create, remove, undo, undo after
// toggling), Budget ideas (the Set pill follows an edited amount, the card hides when empty) and the panel's
// "Set a budget of $X" matching the card.
import { describe, expect, it } from "vitest";
import type { MemberRule } from "@/lib/account/corrections";
import { merchantRule, move, overlayFor, rulesAfter, toggleRule, undoMove, withRuleOverlay, type RecatStore } from "@/lib/account/recategorise";
import { budgetIdeas, currentCycle, parseBudgetAmount, spendingView } from "@/lib/selectors";
import { spending } from "@/content/spending";
import { formatWhole } from "@/lib/format";
import { load } from "./helpers";

const AT = "2026-10-09T00:00:00.000Z";
const tx = { id: "t1", merchant: "McDonald's", category: "food" as const };
const income: MemberRule = { id: "income_regular:Acme", kind: "income_regular", merchant: "Acme", createdAt: AT };
const empty: RecatStore = { edits: {}, rules: [income] };

describe("change-category drawer: merchant rule", () => {
  it("picking a category saves it and creates the merchant rule (ticked by default)", () => {
    const { store, move: m } = move(empty, tx, "groceries", { at: AT });
    expect(m.rule).toBe(true);
    expect(merchantRule(store.rules, "McDonald's")?.category).toBe("groceries");
    // The rule moves this payment too, so it carries no edit of its own; other rules are kept.
    expect(store.edits).toEqual({});
    expect(store.rules).toContainEqual(income);
    expect(overlayFor(m)).toBe("groceries");
  });

  it("unticking removes the rule and keeps the change on this payment only", () => {
    const a = move(empty, tx, "groceries", { at: AT });
    const b = toggleRule(a.store, a.move, false, AT);
    expect(merchantRule(b.store.rules, "McDonald's")).toBeUndefined();
    expect(b.store.edits).toEqual({ t1: "groceries" });
    expect(overlayFor(b.move)).toBeNull();
    // Ticking again adds it back.
    const c = toggleRule(b.store, b.move, true, AT);
    expect(merchantRule(c.store.rules, "McDonald's")?.category).toBe("groceries");
    expect(c.store.edits).toEqual({});
  });

  it("Undo reverts the change and the rule it created", () => {
    const a = move(empty, tx, "groceries", { at: AT });
    expect(undoMove(a.store, a.move)).toEqual(empty);
    expect(overlayFor(a.move, true)).toBeNull();
  });

  it("Undo after toggling (off, then on again) still returns to the before state", () => {
    const a = move(empty, tx, "groceries", { at: AT });
    const off = toggleRule(a.store, a.move, false, AT);
    expect(undoMove(off.store, off.move)).toEqual(empty);
    const on = toggleRule(off.store, off.move, true, AT);
    expect(undoMove(on.store, on.move)).toEqual(empty);
  });

  it("with a rule already in place, Undo (and unticking) put the earlier rule back", () => {
    const earlier: MemberRule = { id: "category:McDonald's", kind: "category", merchant: "McDonald's", category: "transport", createdAt: AT };
    const before: RecatStore = { edits: { t1: "health" }, rules: [earlier, income] };
    const a = move(before, { ...tx, category: "transport" }, "groceries", { at: AT });
    expect(merchantRule(a.store.rules, "McDonald's")?.category).toBe("groceries");
    expect(merchantRule(toggleRule(a.store, a.move, false, AT).store.rules, "McDonald's")).toEqual(earlier);
    const undone = undoMove(a.store, a.move);
    expect(undone.edits).toEqual({ t1: "health" });
    expect(merchantRule(undone.rules, "McDonald's")).toEqual(earlier);
    expect(overlayFor(a.move, true)).toBe("transport");
  });

  it("without merchant rules (corrections off), a change is this payment only", () => {
    const { store, move: m } = move(empty, tx, "groceries", { rule: false });
    expect(store).toEqual({ edits: { t1: "groceries" }, rules: [income] });
    expect(undoMove(store, m)).toEqual(empty);
  });

  it("the rule is written against the latest saved rules, keeping ones saved meanwhile", () => {
    const a = move(empty, tx, "groceries", { at: AT });
    const later: MemberRule = { id: "not_bill:Gym", kind: "not_bill", merchant: "Gym", createdAt: AT };
    const rules = rulesAfter([income, later], a.move, false, AT);
    expect(rules).toContainEqual(later);
    expect(merchantRule(rules, "McDonald's")?.category).toBe("groceries");
    expect(rulesAfter(rules, a.move, true)).toEqual([income, later]);
  });

  it("the page shows a new rule straight away: debits from the merchant move, money in doesn't", () => {
    const list = [
      { id: "a", merchant: "McDonald's", category: "food" as const, amount: -12 },
      { id: "b", merchant: "McDonald's", category: "income" as const, amount: 30 },
      { id: "c", merchant: "Coles", category: "groceries" as const, amount: -50 },
    ];
    expect(withRuleOverlay(list, { "McDonald's": "groceries" }).map((x) => x.category)).toEqual(["groceries", "income", "groceries"]);
  });
});

describe("Budget ideas", () => {
  const t = spending.v5.budgets;

  it("the Set pill follows an edited amount", async () => {
    const d = await load("jess");
    const [first] = budgetIdeas(d, {}, {});
    expect(first).toBeDefined();
    expect(t.setPill(formatWhole(first!.suggested))).toBe(`Set ${formatWhole(first!.suggested)}`);
    const edited = budgetIdeas(d, {}, {}, { amounts: { [first!.category]: 75 } }).find((x) => x.category === first!.category)!;
    expect(edited.suggested).toBe(75);
    expect(t.setPill(formatWhole(edited.suggested))).toBe("Set $75");
  });

  it("typed amounts: whole dollars only", () => {
    expect(parseBudgetAmount("$1,200")).toBe(1200);
    expect(parseBudgetAmount(" 60 ")).toBe(60);
    expect(parseBudgetAmount("0")).toBeNull();
    expect(parseBudgetAmount("12.50")).toBeNull();
    expect(parseBudgetAmount("")).toBeNull();
  });

  it("a row stays (as 'Budget set') just after Set, then leaves", async () => {
    const d = await load("jess");
    const [first] = budgetIdeas(d, {}, {});
    const budgets = { [first!.category]: 80 };
    expect(budgetIdeas(d, budgets, {}).some((x) => x.category === first!.category)).toBe(false);
    const kept = budgetIdeas(d, budgets, {}, { justSet: [first!.category] }).find((x) => x.category === first!.category)!;
    expect(kept).toMatchObject({ justSet: true, suggested: 80 });
  });

  it("the card hides when there's nothing to suggest", async () => {
    const d = await load("jess");
    const all = budgetIdeas(d, {}, {});
    expect(all.length).toBeGreaterThan(0);
    expect(budgetIdeas(d, {}, {}, { dismissed: all.map((x) => x.category) })).toEqual([]);
  });

  it("the panel's 'Set a budget of $X' matches the card, before and after an edit", async () => {
    for (const persona of ["jess", "marcus"] as const) {
      const d = await load(persona);
      const ideas = budgetIdeas(d, {}, {});
      const amounts = Object.fromEntries(ideas.map((x, i) => [x.category, 40 + i * 10]));
      for (const opts of [{}, { ideaAmounts: amounts }]) {
        const card = budgetIdeas(d, {}, {}, { amounts: "ideaAmounts" in opts ? amounts : {} });
        const rows = spendingView(d, currentCycle(d), {}, { budgets: {}, ...opts }).groups.flatMap((g) => g.rows);
        for (const idea of card) {
          const row = rows.find((r) => r.category === idea.category);
          if (row) expect(row.budget, `${persona} ${idea.category}`).toEqual({ amount: idea.suggested, from: "suggestion" });
        }
      }
    }
  });
});
