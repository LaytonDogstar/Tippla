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

// Category rows (the donut's legend also has category buttons since UX round 2, 5.2).
const row = (page: Page, name: RegExp) => page.getByRole("region", { name: "Categories" }).getByRole("button", { name, expanded: undefined }).first();

test("journey 2: dashboard → spending → category → merchant sheet → recategorise (Jess)", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  // Today redesign: spent this pay cycle sits in the hero.
  await expect(page.getByRole("region", { name: "This pay cycle" }).getByText("$1,832")).toBeVisible();
  await page.getByRole("navigation").getByRole("link", { name: /^Money/ }).first().click();
  await expect(page).toHaveURL(/\/spending/);
  await expect(page.getByRole("region", { name: "Spending by category" }).getByText(/^\$1,832 spent/)).toBeVisible();

  // A budget first, so we can watch it move.
  await page.getByText("Budgets", { exact: true }).click();
  await page.getByRole("button", { name: /^Groceries budget: Set a budget/ }).click();
  await page.getByRole("dialog").getByLabel("Budget per pay cycle").fill("100");
  await page.getByRole("dialog").getByRole("button", { name: "Save budget" }).click();
  await expect(page.getByText("$82 of $100")).toBeVisible();
  await page.getByText("Categories", { exact: true }).first().click();

  // Category → merchants → merchant sheet (Categories tab; Overview opens a category's transactions in place).
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
  await page.getByText("Overview", { exact: true }).click();
  await expect(page.getByRole("region", { name: "Spending by category" }).getByText(/^\$1,832 spent/)).toBeVisible();

  // Mark another as a transfer between own accounts: spent drops on the hero, the category list and Home.
  await page.getByText("Categories", { exact: true }).first().click();
  await page.getByRole("region", { name: "Categories" }).getByRole("button", { name: /^McDonald's/ }).first().click();
  await page.getByRole("dialog").getByRole("combobox", { name: /on 23\/09\/2026/ }).selectOption({ label: "Transfers between your accounts" });
  await page.keyboard.press("Escape");
  await expect(row(page, /^Food & dining/)).toContainText("$77");
  await page.getByText("Overview", { exact: true }).click();
  await expect(page.getByText("$1,804 spent").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Spending by category" }).getByText(/^\$1,804 spent/)).toBeVisible();

  await page.getByText("Budgets", { exact: true }).click();
  await expect(page.getByText("$90 of $100")).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: /^Today/ }).first().click();
  await expect(page.getByRole("region", { name: "This pay cycle" }).getByText("$1,804")).toBeVisible();

  // Undo is one tap away: back on Spending, the edit is still there after a reload (cookie).
  await page.goto("/spending?persona=jess&present=1");
  await expect(page.getByText("$1,804 spent").first()).toBeVisible();
});

test("by category: a row opens its transactions in place and never filters the Transactions card", async ({ page }) => {
  await page.goto("/spending?persona=jess&present=1");
  const card = page.getByRole("region", { name: "Spending by category" });
  const feed = page.getByRole("region", { name: "Transactions" });
  await expect(feed.getByText("26 transactions")).toBeVisible();
  await card.getByRole("button", { name: /^Food & dining/ }).click();
  await expect(card.getByRole("button", { name: /^Food & dining/ })).toHaveAttribute("aria-expanded", "true");
  await expect(card.getByRole("button", { name: /^See all 6 Food & dining transactions/ })).toBeVisible();
  await expect(feed.getByText("26 transactions")).toBeVisible(); // untouched
  await expect(feed.getByRole("radio", { name: "All" })).toBeChecked();
  // One row open at a time.
  await card.getByRole("button", { name: /^Rent & housing/ }).click();
  await expect(card.getByRole("button", { name: /^Food & dining/ })).toHaveAttribute("aria-expanded", "false");
  // See all filters the card, which says so: a chip, and no direction pill selected.
  await card.getByRole("button", { name: /^Food & dining/ }).click();
  await card.getByRole("button", { name: /^See all 6 Food & dining transactions/ }).click();
  await expect(feed.getByText("6 transactions · Food & dining")).toBeVisible();
  await expect(feed.getByRole("radio", { name: "All" })).not.toBeChecked();
  await feed.getByRole("button", { name: /^Remove Food & dining filter$/ }).click();
  await expect(feed.getByText("26 transactions")).toBeVisible();
  await expect(feed.getByRole("radio", { name: "All" })).toBeChecked();
});

test("by category: ranked by amount, top five then Show more inline; lenders flag gambling and loans", async ({ page }) => {
  await page.goto("/spending?persona=jess&present=1");
  const card = page.getByRole("region", { name: "Spending by category" });
  const rows = card.getByRole("button", { expanded: false }).filter({ hasText: "$" });
  await expect(rows).toHaveCount(5);
  const amounts = await rows.evaluateAll((els) => els.map((e) => Number((e.textContent!.match(/\$([\d,]+)/)?.[1] ?? "0").replace(/,/g, ""))));
  expect([...amounts].sort((a, b) => b - a)).toEqual(amounts);
  await expect(card.getByText(/^Other/)).toHaveCount(0);
  await card.getByRole("button", { name: /^Show \d+ more/ }).click();
  await expect(card.getByRole("button", { name: /^Show fewer/ })).toBeVisible();
  await expect(card.getByRole("link", { name: /^Lenders look at this\W+Loan repayments/ })).toHaveAttribute("href", "/score/current-borrowing");
  await card.getByRole("button", { name: /^Lenders look at this\W+Gambling/ }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "How gambling affects your SmartScore" })).toBeVisible();
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

test("calendar: Home's next bill opens its day; range totals in the calendar view; month switch", async ({ page }) => {
  await page.goto("/calendar?persona=jess&present=1&day=2026-09-30");
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Wed 30/09/2026" })).toBeVisible();
  await expect(sheet.getByText("$262 − $315 = −$53")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator("label").filter({ hasText: /^Calendar$/ }).click();
  await page.getByRole("button", { name: "Select a range" }).click();
  await page.getByRole("gridcell").getByRole("button", { name: /^Thu 17\/09\/2026/ }).click();
  await page.getByRole("gridcell").getByRole("button", { name: /^Wed 30\/09\/2026/ }).click();
  await expect(page.locator("#range-h")).toHaveText("Thu 17/09 – Wed 30/09");
  await expect(page.getByText("$1,832").first()).toBeVisible();
  await page.getByText("Month", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "September 2026" })).toBeVisible();
});

test("calendar: the answer comes first, the timeline is the default, nothing repeats", async ({ page }) => {
  await page.goto("/calendar?persona=jess&present=1");
  const main = page.locator("main");
  // The first thing after the controls is the headline.
  await expect(main.getByText("You'll be about $53 short on Wed 30/09, the day before payday.")).toBeVisible();
  await expect(main.getByText("$367 in bills before payday · 2 bills")).toBeVisible();
  await expect(main.getByRole("link", { name: "Options if money's tight" })).toHaveAttribute("href", "/hardship");
  // Timeline by default, with a running balance; the grid is one tap away.
  const tl = page.getByRole("list", { name: /^Money in and out/ });
  await expect(tl).toBeVisible();
  await expect(page.getByRole("grid")).toHaveCount(0);
  await expect(tl.getByRole("button", { name: /^Wed 30\/09\/2026/ })).toContainText("Below $0");
  await expect(page.getByText("Bills coming up")).toHaveCount(0);
  // Tapping a row opens the day drawer, and only the drawer.
  await tl.getByRole("button", { name: /^Wed 30\/09\/2026/ }).click();
  await expect(page.getByRole("dialog").getByText("$262 − $315 = −$53")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "View day" })).toHaveCount(0);

  // Next fortnight: covered, with the lowest point labelled on the chart and in the list.
  await page.goto("/calendar?persona=jess&present=1&offset=1");
  await expect(main.getByText("Lowest point $1,061 on Tue 13/10 — you're covered until payday Thu 15/10.")).toBeVisible();
  await expect(main.getByText("$1,226 in bills before payday · 8 bills")).toBeVisible();
  await expect(main.getByText("Lowest $1,061 · Tue 13/10")).toBeVisible();
  await expect(main.getByText("Below $0")).toHaveCount(0); // no legend item for what isn't there
});

test("calendar: month view explains where the forecast ends; the view switch answers on any part of the button", async ({ page }) => {
  await page.goto("/calendar?persona=jess&present=1");
  // The very edge of the control, outside the visible pill: still picks Month.
  const track = page.getByRole("group", { name: "Calendar view" }).locator("div").first();
  const box = (await track.boundingBox())!;
  await page.mouse.click(box.x + box.width - 3, box.y + box.height / 2);
  await expect(page.getByRole("radio", { name: "Month" })).toBeChecked();
  await expect(page.getByRole("heading", { name: "September 2026" })).toBeVisible();
  await page.goto("/calendar?persona=jess&present=1&view=month&month=2026-10");
  await expect(page.getByText("From Thu 15/10: forecast not available yet.", { exact: false })).toBeVisible();
  await page.locator("label").filter({ hasText: /^Calendar$/ }).click();
  await expect(page.getByText("From Thu 15/10 there's no forecast yet, so those days are blank.")).toBeVisible();
});

test("subscriptions: still using? Yes keeps it with an optional reminder; how to cancel from the menu", async ({ page }) => {
  await page.goto("/subscriptions?persona=jess&present=1");
  const rail = page.getByRole("complementary");
  await expect(rail.getByText("$31")).toBeVisible(); // a pay cycle; includes Binge (new 08/09)
  await expect(rail.getByText("$810 a year")).toBeVisible();
  const netflix = page.getByRole("article", { name: "Netflix" });
  await netflix.getByRole("button", { name: "Yes: Still using Netflix?" }).click();
  await expect(netflix.getByText("Kept", { exact: true })).toBeVisible();
  await netflix.getByRole("button", { name: "Remind me before next charge" }).click();
  await expect(page.getByRole("status").filter({ hasText: "We'll remind you about Netflix on Thu 01/10" })).toBeVisible();
  await page.getByRole("button", { name: "More options for Netflix" }).click();
  await page.getByRole("dialog", { name: "Netflix" }).getByRole("button", { name: "How to cancel" }).click();
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
