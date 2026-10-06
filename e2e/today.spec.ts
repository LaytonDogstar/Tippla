// Phase 1 (loop): Today's status line, "Needs a look" feed with done / snooze / dismiss, section badges,
// score explanations, and the offers guardrail.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const axe = (page: Page) =>
  new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
async function expectNoAxe(page: Page) {
  const r = await axe(page);
  const s = r.violations.map((v) => `${page.url()} ${v.id}: ${v.nodes[0]?.target.join(" ")} — ${v.help}`);
  expect(s, s.join("\n")).toEqual([]);
}
const feedCards = (page: Page) => page.getByRole("region", { name: "Needs a look" }).getByRole("article");
const dock = (page: Page) => page.getByRole("navigation", { name: "Main" }).first();

test("Jess: status line, three ranked cards, section badges", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  await expect(page.getByText("Checked 32 new transactions this morning · 8 things to look at")).toBeVisible();
  await expect(feedCards(page)).toHaveCount(3);
  await expect(feedCards(page).nth(0)).toContainText("About $53 short before payday");
  await expect(feedCards(page).nth(1)).toContainText("Beforepay $315 on Wed 30/09 is more than your forecast balance");
  await expect(feedCards(page).nth(2)).toContainText(/Shopping is \$\d+ above your usual/);
  await expect(feedCards(page).nth(0).getByRole("link", { name: "Options if money's tight" })).toHaveAttribute("href", "/hardship");
  await expect(dock(page).getByRole("link", { name: "Money 4 things to look at" })).toBeVisible();
  await expect(dock(page).getByRole("link", { name: "Borrowing 1 thing to look at" })).toBeVisible();
  // Spec 03: short before payday, so "pause your Tippla payment" sits under Help.
  await expect(dock(page).getByRole("link", { name: "Help 1 thing to look at" })).toBeVisible();
  await expectNoAxe(page);
});

test("Done, with Undo; Dismiss sticks after a reload; badges follow", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  await page.getByRole("button", { name: /^Done: About \$53 short/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Marked as done" })).toBeVisible();
  await expect(feedCards(page).nth(0)).toContainText("Beforepay $315");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(feedCards(page).nth(0)).toContainText("About $53 short before payday");

  await page.getByRole("button", { name: "5 more things · Show all" }).click();
  await expect(feedCards(page)).toHaveCount(8);
  await page.getByRole("button", { name: /^Dismiss: Possible double charge/ }).click();
  await expect(feedCards(page)).toHaveCount(7);
  await page.reload();
  await expect(page.getByText("7 things to look at")).toBeVisible();
  await expect(dock(page).getByRole("link", { name: "Money 3 things to look at" })).toBeVisible();
});

test("Snooze until tomorrow hides the card", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  await page.getByRole("button", { name: /^Snooze: Beforepay/ }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("button", { name: "Until payday (Thu 01/10)" })).toBeVisible();
  await sheet.getByRole("button", { name: "Until tomorrow" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Snoozed until Sat 26/09" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Needs a look" })).not.toContainText("Beforepay $315 on Wed 30/09");
});

test("score explanation on Today and /score", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  await expect(page.getByText("Down 17 since 11/09: new pay advance −9, gambling deposits −6, money left over −2")).toBeVisible();
  await page.goto("/score?persona=jess&present=1");
  const box = page.getByRole("region", { name: "What changed" });
  await expect(box).toContainText("Current borrowing 3.4 → 2.9");
  await expect(box).toContainText("New Beforepay pay advance (24/09)");
  await expect(box).toContainText("Estimate");
});

test("offers never appear on Today, even with lender matching on (Marcus)", async ({ page }) => {
  await page.goto("/?persona=marcus&present=1");
  await expect(page.getByRole("main")).not.toContainText(/offer|Harbour Lending/i);
  await expect(feedCards(page)).toHaveCount(1);
  await expect(feedCards(page).nth(0)).toContainText("Your SmartScore went up 11 points");
  await page.goto("/notifications?persona=marcus&present=1");
  await expect(page.getByRole("main")).not.toContainText(/offer|lender/i);
});

test("Priya: a repayment within 3 days; empty state copy when everything's dealt with", async ({ page }) => {
  await page.goto("/?persona=priya&present=1");
  await expect(feedCards(page)).toHaveCount(1);
  await expect(feedCards(page).nth(0)).toContainText("Afterpay $28 comes out Mon 28/09");
  await page.getByRole("button", { name: /^Done: Afterpay/ }).click();
  await expect(page.getByText("Nothing needs a look right now. We'll let you know if something comes up.")).toBeVisible();
});

for (const persona of ["jess", "marcus", "priya"]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`axe: Today and Score, ${persona}, ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const url of ["/", "/score"]) {
        await page.goto(`${url}?persona=${persona}&present=1`);
        await expectNoAxe(page);
      }
    });
  }
}
