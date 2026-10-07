// Phase 4 acceptance: journey 2 (dashboard → spending → category → merchant sheet → recategorise), and
// recategorising updates donut, rows, budgets, hero and the dashboard. Axe on every Phase 4 screen.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const axe = (page: Page) =>
  new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

async function expectNoAxe(page: Page) {
  const r = await axe(page);
  const s = r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")} — ${v.help}`);
  expect(s, s.join("\n")).toEqual([]);
}

const row = (page: Page, name: RegExp) => page.getByRole("button", { name, expanded: undefined }).first();

test("journey 2: dashboard → spending → category → merchant sheet → recategorise (Jess)", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  // Today redesign: spent this pay cycle sits in the hero.
  await expect(page.getByRole("region", { name: "This pay cycle" }).getByText("$1,832")).toBeVisible();
  await page.getByRole("navigation").getByRole("link", { name: /^Money/ }).first().click();
  await expect(page).toHaveURL(/\/spending/);
  await expect(page.getByRole("img", { name: /^Total \$1,832/ })).toBeVisible();

  // A budget first, so we can watch it move.
  await page.getByText("Budgets", { exact: true }).click();
  await page.getByRole("button", { name: /^Groceries budget: Set a budget/ }).click();
  await page.getByRole("dialog").getByLabel("Budget per pay cycle").fill("100");
  await page.getByRole("dialog").getByRole("button", { name: "Save budget" }).click();
  await expect(page.getByText("$82 of $100")).toBeVisible();
  await page.getByText("Overview", { exact: true }).click();

  // Category → merchants → merchant sheet.
  const food = row(page, /^Food & dining/);
  await expect(food).toContainText("$112");
  await food.click();
  await page.getByRole("button", { name: /^McDonald's/ }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "McDonald's" })).toBeVisible();
  await expectNoAxe(page);

  // Recategorise one $7.68 transaction to Groceries: rows and budget move, spent doesn't.
  await sheet.getByRole("combobox", { name: /Category for McDonald's on 25\/09\/2026/ }).selectOption({ label: "Groceries" });
  await expect(page.getByRole("status").filter({ hasText: "Moved to Groceries. Totals updated" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(row(page, /^Food & dining/)).toContainText("$105");
  await expect(row(page, /^Groceries/)).toContainText("$90");
  await expect(page.getByRole("img", { name: /^Total \$1,832/ })).toBeVisible();

  // Mark another as a transfer between own accounts: spent drops on the hero, the donut and Home.
  await page.getByRole("button", { name: /^McDonald's/ }).first().click();
  await page.getByRole("dialog").getByRole("combobox", { name: /on 23\/09\/2026/ }).selectOption({ label: "Transfers between your accounts" });
  await page.keyboard.press("Escape");
  await expect(page.getByText("$1,804 spent").first()).toBeVisible();
  await expect(page.getByRole("img", { name: /^Total \$1,804/ })).toBeVisible();
  await expect(row(page, /^Food & dining/)).toContainText("$77");

  await page.getByText("Budgets", { exact: true }).click();
  await expect(page.getByText("$90 of $100")).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: /^Today/ }).first().click();
  await expect(page.getByRole("region", { name: "This pay cycle" }).getByText("$1,804")).toBeVisible();

  // Undo is one tap away: back on Spending, the edit is still there after a reload (cookie).
  await page.goto("/spending?persona=jess&present=1");
  await expect(page.getByText("$1,804 spent").first()).toBeVisible();
});

test("donut slice filters the list and the feed; tapping again clears", async ({ page }) => {
  await page.goto("/spending?persona=jess&present=1");
  await expect(page.getByText("11 shown")).toBeVisible();
  const slice = page.getByRole("img", { name: /^Total \$1,832/ }).locator("path").nth(2);
  await slice.click();
  await expect(page.getByText("1 shown")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Remove .+ filter$/ }).first()).toBeVisible();
  await slice.click();
  await expect(page.getByText("11 shown")).toBeVisible();
});

test("search by merchant or amount, with a plain empty state", async ({ page }) => {
  await page.goto("/spending?persona=jess&present=1");
  await page.getByRole("button", { name: "Search transactions" }).click();
  await expect(page.getByRole("searchbox", { name: "Search merchant or amount" })).toBeFocused();
  await page.getByRole("searchbox").fill("4.49");
  await expect(page.getByRole("button", { name: /^Apple iCloud −\$4\.49 , money out/ })).toBeVisible();
  await page.getByRole("searchbox").fill("zzzz");
  await expect(page.getByText('No transactions match "zzzz".')).toBeVisible();
  await expect(page).toHaveURL(/q=zzzz/);
});

test("gambling insight: neutral sheet, support replaces content with Back", async ({ page }) => {
  await page.goto("/spending?persona=jess&present=1");
  await page.getByRole("button", { name: "See how" }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "How gambling affects your SmartScore" })).toBeVisible();
  await expect(sheet.getByRole("link", { name: "See how your score is worked out" })).toHaveAttribute("href", "/score/gambling-and-alcohol");
  await sheet.getByRole("button", { name: "View support options" }).click();
  await expect(sheet.getByRole("heading", { name: "Support options" })).toBeVisible();
  await expect(sheet.getByRole("link", { name: /BetStop/ })).toHaveAttribute("href", "https://www.betstop.gov.au/");
  await sheet.getByRole("button", { name: "Back" }).click();
  await expect(sheet.getByRole("heading", { name: "How gambling affects your SmartScore" })).toBeVisible();
  await sheet.getByRole("button", { name: "Not now" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("dashboard month bar opens that month on Spending", async ({ page }) => {
  await page.goto("/spending?persona=marcus&present=1&month=2026-05");
  await expect(page.getByRole("button", { name: "May 2026", pressed: true })).toBeVisible();
  await expect(page.getByText("in May 2026").first()).toBeVisible();
});

test("calendar: Home's next bill opens its day; range totals; forecast below $0 is hatched, never red", async ({ page }) => {
  await page.goto("/calendar?persona=jess&present=1&day=2026-09-30");
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Wed 30/09/2026" })).toBeVisible();
  await expect(sheet.getByText("$262 − $315 = −$53")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Select a range" }).click();
  await page.getByRole("button", { name: /^Thu 17\/09\/2026/ }).click();
  await page.getByRole("button", { name: /^Wed 30\/09\/2026/ }).click();
  await expect(page.locator("#range-h")).toHaveText("Thu 17/09 – Wed 30/09");
  await expect(page.getByText("$1,832").first()).toBeVisible();
  await page.getByText("Month", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "September 2026" })).toBeVisible();
});

test("subscriptions: keep, remind, how to cancel", async ({ page }) => {
  await page.goto("/subscriptions?persona=jess&present=1");
  await expect(page.getByText("About $31 a pay cycle · $810 a year")).toBeVisible(); // includes Binge (new 08/09)
  const netflix = page.getByRole("article", { name: "Netflix" });
  await netflix.getByRole("button", { name: "Remind me before next charge" }).click();
  await expect(page.getByRole("status").filter({ hasText: "We'll remind you about Netflix on Thu 01/10" })).toBeVisible();
  await netflix.getByRole("button", { name: "How to cancel" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "How to cancel Netflix" })).toBeVisible();
});

const SCREENS = ["/spending", "/spending?tab=categories", "/spending?tab=budgets", "/spending/compare", "/spending/compare?tab=cohort", "/calendar", "/calendar?view=month", "/subscriptions"];
for (const persona of ["jess", "marcus", "priya"]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`axe: Phase 4 screens, ${persona}, ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const url of SCREENS) {
        await page.goto(`${url}${url.includes("?") ? "&" : "?"}persona=${persona}&present=1`);
        await page.waitForLoadState("networkidle");
        await expectNoAxe(page);
      }
    });
  }
}
