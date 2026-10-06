// Spec 07: plans, the Healthy moment and What's next, savings goals, buffer growth, and the gated prototypes.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const axe = (page: Page) =>
  new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
async function expectNoAxe(page: Page) {
  const r = await axe(page);
  const s = r.violations.map((v) => `${page.url()} ${v.id}: ${v.nodes[0]?.target.join(" ")} — ${v.help}`);
  expect(s, s.join("\n")).toEqual([]);
}
const withAccount = (context: BrowserContext, persona: string, a: object) =>
  context.addCookies([{ name: "tippla-account", value: encodeURIComponent(JSON.stringify({ [persona]: a })), url: "http://localhost:3200" }]);

test("acceptance: Jess (goal: stop relying on pay advances) sees Get off pay advances at step 1; switch any time", async ({ page, context }) => {
  await withAccount(context, "jess", { focusGoal: { type: "off_advances", startedAt: "2026-09-25" } });
  await page.goto("/?persona=jess&present=1");
  await expect(page.getByRole("link", { name: /Your plan Get off pay advances · Step 1 of 3: A pay cycle with pay advances of \$150 or less/ })).toBeVisible();
  await page.goto("/savings?persona=jess&present=1");
  const plan = page.getByRole("region", { name: "Get off pay advances" });
  await expect(plan).toContainText("Suggested for you");
  await expect(plan.locator("[aria-current=step]")).toContainText("A pay cycle with pay advances of $150 or less");
  await expect(plan).toContainText("This pay cycle: $0 of pay advances so far, against $150.");
  await expectNoAxe(page);
  await plan.getByRole("button", { name: "Switch plan" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Cut bills and subscriptions/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Started: Cut bills and subscriptions" })).toBeVisible();
  const cut = page.getByRole("region", { name: "Cut bills and subscriptions" });
  await cut.getByRole("button", { name: "Mark as done" }).click();
  await expect(cut.locator("[aria-current=step]")).toContainText("Cancel or keep each one");
});

test("acceptance: 5 improving cycles reach Healthy: the moment, then What's next", async ({ page }) => {
  await page.goto("/?persona=jess&present=1&state=improved");
  const card = page.getByRole("region", { name: "You've reached Healthy" });
  await expect(card).toContainText("You went from 472 to 604 in 5 pay cycles.");
  await expectNoAxe(page);
  await card.getByRole("link", { name: "What's next" }).click();
  await expect(page.getByRole("heading", { name: "What's next" })).toBeVisible();
  await expect(page.getByText("Options for the Healthy stage", { exact: false })).toBeVisible();
  await expectNoAxe(page);
  await page.getByRole("link", { name: /Track your credit file/ }).click();
  await expect(page.getByRole("note")).toContainText("Prototype. This isn't connected to a credit bureau");
  await page.goto("/?persona=jess&present=1");
  await expect(page.getByRole("region", { name: "You've reached Healthy" })).toHaveCount(0); // shown once
});

test("savings goals at Healthy (Marcus): name, amount, date; amount per pay cycle", async ({ page }) => {
  await page.goto("/progress?persona=marcus&present=1&state=none");
  const s = page.getByRole("region", { name: "Savings goals" });
  await s.getByRole("button", { name: "Add a savings goal" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("What it's for").fill("Christmas");
  await sheet.getByLabel("Amount ($)").fill("300");
  await sheet.getByLabel("By").fill("2026-12-15");
  await sheet.getByRole("button", { name: "Save goal" }).click();
  await expect(s).toContainText("Christmas: $300 by 15/12");
  await expect(s).toContainText("About $50 each pay cycle");
  await expect(s.getByRole("button", { name: "Add a savings goal" })).toHaveCount(0); // one at Healthy
  await expectNoAxe(page);
  await page.goto("/progress?persona=jess&present=1");
  await expect(page.getByRole("region", { name: "Savings goals" })).toContainText("Savings goals open up at Healthy");
});

test("payday surplus: 'Move $50 to your buffer?' protects it in safe to spend", async ({ page }) => {
  await page.goto("/?persona=marcus&present=1&state=payday");
  const recap = page.getByRole("region", { name: "Your last pay cycle" });
  await expect(recap).toContainText("Move $50 to your buffer?");
  await recap.getByRole("button", { name: "How to move it" }).click();
  await expect(page.getByRole("dialog", { name: "Moving money to savings" })).toBeVisible();
  await page.keyboard.press("Escape");
  await recap.getByRole("button", { name: "Protect $50 in safe to spend" }).click();
  await expect(page.getByRole("status").filter({ hasText: /\$50/ })).toBeVisible();
});

test("cheaper-credit check prototype: Marcus sees his own costs; Jess isn't eligible", async ({ page }) => {
  await page.goto("/progress/cheaper-credit?persona=marcus&present=1");
  await expect(page.getByRole("note")).toContainText("Prototype. General information only");
  await expect(page.getByText(/MoneyMe Lite: \$\d+ a repayment|Latitude: \$\d+ a repayment/).first()).toBeVisible();
  await page.goto("/progress/cheaper-credit?persona=jess&present=1");
  await expect(page.getByText("This check is for members in the Healthy or Thriving stage", { exact: false })).toBeVisible();
});
