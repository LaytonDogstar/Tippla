// Phase 4 acceptance, for Spending v5 (09/10/2026): journey 2 (dashboard → spending → category → merchant →
// recategorise), and recategorising moves the rows, budgets, summary and the dashboard. Axe on every Phase 4 screen.
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

const where = (page: Page) => page.getByRole("region", { name: "Where it went" });
const row = (page: Page, name: RegExp) => where(page).getByRole("button", { name }).first();

test("journey 2: dashboard → spending → category → merchant → recategorise (Jess)", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  await expect(page.getByRole("region", { name: "This pay cycle" }).getByText("$1,832")).toBeVisible();
  await page.getByRole("navigation").getByRole("link", { name: /^Money/ }).first().click();
  await expect(page).toHaveURL(/\/spending/);
  // Spending v5: one column; the summary is the same component and numbers as Today's.
  await expect(page.getByRole("region", { name: "This pay cycle" }).getByText("$1,832")).toBeVisible();

  // A budget first, from the category's own panel (the same amount logic as Budget ideas).
  const food = row(page, /^Food & dining/);
  await expect(food).toContainText("$112");
  await food.click();
  await where(page).getByRole("button", { name: "Set a budget of $150" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save budget" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Budget saved" })).toBeVisible();

  // Category → merchant → its transactions → the transaction sheet → recategorise.
  await where(page).getByRole("button", { name: /^McDonald's/ }).click();
  await where(page).getByRole("button", { name: /^Fri 25\/09/ }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "McDonald's" })).toBeVisible();
  await expectNoAxe(page);
  await sheet.getByRole("combobox", { name: "Category" }).selectOption({ label: "Groceries" });
  await expect(page.getByRole("status").filter({ hasText: "Moved to Groceries. Totals updated" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(row(page, /^Food & dining/)).toContainText("$105");
  await expect(row(page, /^Groceries/)).toContainText("$90");

  // "Wrong category?" opens the merchant sheet: mark another as a transfer, and spent drops everywhere.
  await row(page, /^Food & dining/).click();
  await row(page, /^Food & dining/).click();
  await where(page).getByRole("button", { name: "Wrong category?" }).click();
  await page.getByRole("dialog").getByRole("combobox", { name: /on 23\/09\/2026/ }).selectOption({ label: "Transfers between your accounts" });
  await page.keyboard.press("Escape");
  await expect(row(page, /^Food & dining/)).toContainText("$76");
  await expect(page.getByRole("region", { name: "This pay cycle" }).getByText("$1,804")).toBeVisible();

  await page.goto("/spending/budgets?persona=jess&present=1");
  await expect(page.getByText("$76 of $150")).toBeVisible();

  await page.goto("/?persona=jess&present=1");
  await expect(page.getByRole("region", { name: "This pay cycle" }).getByText("$1,804")).toBeVisible();
  await expect(page.getByRole("region", { name: "Spending" }).getByText("$1,804")).toBeVisible();
});

test("Spending v5: one column in order, sections with chips, no tabs, no hero, no carousel", async ({ page }) => {
  await page.goto("/spending?persona=jess&present=1");
  const main = page.locator("main");
  for (const name of ["Spending views", "Your spending"]) await expect(main.getByRole("group", { name })).toHaveCount(0);
  await expect(main.getByRole("button", { name: "See what's due" })).toHaveCount(0);
  await expect(main.getByText(/^Most went on/)).toHaveCount(0);
  const order = ["This cycle so far", "Plan ahead", "Longer term", "Activity"];
  const tops: number[] = [];
  for (const h of order) tops.push((await main.getByRole("heading", { name: h, level: 2 }).boundingBox())!.y);
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
  const chips = page.getByRole("navigation", { name: "Sections" });
  await chips.getByRole("link", { name: "Activity" }).click();
  await expect(chips.getByRole("link", { name: "Activity" })).toHaveAttribute("aria-current", "location");
  // The shortfall: one line, linking to Coming up on Today.
  await expect(main.getByRole("link", { name: /\$53 short before payday/ })).toHaveAttribute("href", "/#coming-up");
  // Summary: day 9 of 14, everyday spending against the same day last cycle, usual (3 cycles), pending.
  const sum = page.getByRole("region", { name: "This pay cycle" });
  await expect(sum).toContainText("spent by day 9 of 14");
  await expect(sum).toContainText("$39 less on everyday spending than at this point last cycle");
  await expect(sum).toContainText("Your full cycle is usually about $2,601 · plus $212 pending");
});

test("Where it went: fixed and repayments lines; Essentials and Lifestyle by amount; the B2 panel", async ({ page }) => {
  await page.goto("/spending?persona=jess&present=1");
  const w = where(page);
  await expect(w.getByRole("button", { name: /^Fixed costs/ })).toContainText("$820");
  await expect(w.getByRole("button", { name: /^Repayments/ })).toContainText("$335");
  await expect(w.getByText(/^Other/)).toHaveCount(0);
  await w.getByRole("button", { name: /^Transport/ }).click();
  await expect(w).toContainText("Spent so far$115");
  await expect(w).toContainText("$3 over your usual cycle");
  await expect(w).toContainText("Up $115 on this point last cycle. Mostly Opal Top Up ($68).");
  await w.getByRole("button", { name: /^Gambling/ }).click(); // one panel at a time
  await expect(w.getByRole("button", { name: /^Transport/ })).toHaveAttribute("aria-expanded", "false");
  await expect(w).toContainText("About usual for this point");
  await expect(w).toContainText("Mostly TAB ($110).");
  await w.getByRole("button", { name: /^Food & dining/ }).click();
  await expect(w.getByRole("button", { name: "Set a budget of $150" })).toBeVisible();
  await expect(w.getByRole("button", { name: "See all 6" })).toBeVisible();
  await w.getByRole("button", { name: "See all 6" }).click();
  const activity = page.getByRole("region", { name: "Activity" });
  await expect(activity.getByRole("button", { name: /^Remove Food & dining filter$/ })).toBeVisible();
  await expect(activity.getByRole("radio", { name: "All" })).not.toBeChecked();
  await expectNoAxe(page);
});

test("search by merchant or amount, with a plain empty state; the double charge strip", async ({ page }) => {
  await page.goto("/spending?persona=jess&present=1");
  const activity = page.getByRole("region", { name: "Activity" });
  await expect(activity.getByText("Amazon AU may have charged you twice ($10.73)")).toBeVisible();
  await page.getByRole("button", { name: "Fix", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "Search merchant or amount" })).toBeFocused();
  await page.getByRole("searchbox", { name: "Search merchant or amount" }).fill("4.49");
  await expect(page.getByRole("button", { name: /^Apple iCloud −\$4\.49 , money out/ })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search merchant or amount" }).fill("zzzz");
  await expect(page.getByText('No transactions match "zzzz".')).toBeVisible();
  await expect(page).toHaveURL(/q=zzzz/);
});

test("gambling insight from How lenders see your spending: neutral sheet, support replaces content with Back", async ({ page }) => {
  await page.goto("/spending?persona=jess&present=1");
  const lenders = page.getByRole("region", { name: "How lenders see your spending" });
  await expect(lenders).toContainText("3 lenders");
  await expect(lenders).toContainText("1 this cycle");
  await lenders.getByRole("button", { name: /^2 deposits/ }).click();
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
  await expect(page.getByRole("combobox", { name: "Period" })).toHaveValue("month:2026-05");
  await expect(page.getByRole("region", { name: "May 2026" })).toContainText("spent");
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
  // Tippla's $9.99 membership charge (Fri 02/10) is in the forecast (09/10/2026), as on Today's Coming up.
  await expect(main.getByText("Lowest point $1,051 on Tue 13/10 — you're covered until payday Thu 15/10.")).toBeVisible();
  await expect(main.getByText("$1,236 in bills before payday · 9 bills")).toBeVisible();
  await expect(main.getByText("Lowest $1,051 · Tue 13/10")).toBeVisible();
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
