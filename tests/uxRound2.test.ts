// UX round 2 (07/10/2026): the data and content fixes that are rules, not styling.
import { describe, expect, it } from "vitest";
import { duplicateCharge } from "@/lib/feed/rules/duplicateCharge";
import { budgetable, budgetView, currentCycle, FIXED_COMMITMENTS } from "@/lib/selectors";
import { onboarding } from "@/content/onboarding";
import { todayCopy } from "@/content/today";
import { assistantCopy } from "@/content/assistant";
import { factorCopy } from "@/content/en-AU";
import { load } from "./helpers";

describe("1.4 dev tools off by default on a production build", () => {
  it("on in development, off in production unless TIPPLA_DEV_TOOLS=1", async () => {
    const { devToolsByDefault } = await import("@/lib/persona");
    const env = process.env as Record<string, string | undefined>;
    const before = { node: env.NODE_ENV, dev: env.TIPPLA_DEV_TOOLS };
    try {
      env.NODE_ENV = "development"; delete env.TIPPLA_DEV_TOOLS;
      expect(devToolsByDefault()).toBe(true);
      env.NODE_ENV = "production";
      expect(devToolsByDefault()).toBe(false);
      env.TIPPLA_DEV_TOOLS = "1";
      expect(devToolsByDefault()).toBe(true);
    } finally {
      env.NODE_ENV = before.node;
      if (before.dev === undefined) delete env.TIPPLA_DEV_TOOLS; else env.TIPPLA_DEV_TOOLS = before.dev;
    }
  });

  it("no factor copy carries an internal 'Sample logic' note", () => {
    for (const f of Object.values(factorCopy)) expect(`${f.explains} ${f.lifts}`).not.toMatch(/sample logic/i);
  });
});

describe("1.7 copy", () => {
  it("sentence case, and placeholders short enough not to be cut off", () => {
    expect(onboarding.reveal.loansOpen(3)).toBe("You have 3 loans open.");
    expect(todayCopy.askPlaceholder.length).toBeLessThanOrEqual(24);
    expect(assistantCopy.placeholder.length).toBeLessThanOrEqual(24);
  });

  it("no budget is offered for fixed commitments", async () => {
    for (const c of FIXED_COMMITMENTS) expect(budgetable(c)).toBe(false);
    expect(budgetable("food")).toBe(true);
    const d = await load("jess");
    const v = budgetView(d, currentCycle(d), {});
    expect(v.other.some((r) => r.category === "housing" || r.category === "loan_repayment")).toBe(false);
  });
});

describe("1.8 possible double charge", () => {
  it("Jess: the two Amazon AU $10.73 charges on 24/09 are flagged, and only those", async () => {
    const d = await load("jess");
    const items = duplicateCharge({ d, edits: {} });
    const ids = items.flatMap((i) => i.transactionIds ?? []);
    const txs = d.transactions.filter((x) => ids.includes(x.id));
    expect(txs).toHaveLength(2);
    expect(txs.every((x) => x.merchant === "Amazon AU" && x.amount === -10.73 && x.date === "2026-09-24")).toBe(true);
  });
});

describe("2.2 shouldShowLenderOffers: one rule for the Offers nav item, link and offers", () => {
  it("off during a debt-reduction plan (Jess) or while finding things hard; on otherwise (Marcus)", async () => {
    const { shouldShowLenderOffers, offerPause } = await import("@/lib/selectors");
    const [jess, marcus] = await Promise.all([load("jess"), load("marcus")]);
    expect(shouldShowLenderOffers(jess, {})).toBe(false); // suggested plan: off pay advances
    expect(shouldShowLenderOffers(marcus, {})).toBe(true);
    expect(shouldShowLenderOffers(marcus, { hardshipSelfSelected: true })).toBe(false);
    expect(offerPause(marcus, { hardshipSelfSelected: true })).toBe("hardship");
  });
});

describe("2.1 hardship copy", () => {
  it("the credit-report line lives in one string", async () => {
    const { hardshipPage } = await import("@/content/account");
    expect(hardshipPage.creditReportNote).toBe("Your lender may still record a hardship arrangement on your credit report. It's still usually better than missing payments.");
  });
});
