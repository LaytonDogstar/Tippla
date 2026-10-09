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
  // Buttons brief: no buttons before a change; the hint stays.
  await expect(sheet.getByRole("button", { name: /Do this for every/ })).toHaveCount(0);
  await expect(sheet.getByText("Wrong category? Change it here and every total updates.")).toBeVisible();
  await sheet.getByRole("combobox", { name: "Category" }).selectOption({ label: "Groceries" });
  // Saved straight away, with every McDonald's payment moved too (ticked by default)...
  const all = sheet.getByRole("checkbox", { name: "Also move all McDonald's payments to Groceries, including future ones" });
  await expect(all).toBeChecked();
  await expect(sheet.getByRole("status")).toContainText("Moved to Groceries, including future McDonald's payments");
  await expect(row(page, /^Food & dining/)).toContainText("$51");
  // ...untick for this payment only: the rule goes, the strip says so, and the totals follow without a reload.
  await all.uncheck({ force: true });
  await expect(sheet.getByRole("status")).toHaveText(/^Moved to Groceries\s*Undo/);
  await expect(row(page, /^Food & dining/)).toContainText("$105");
  // Undo returns to the before state; then make the change again, this payment only.
  await sheet.getByRole("button", { name: /^Undo/ }).click();
  await expect(sheet.getByRole("combobox", { name: "Category" })).toHaveValue("food");
  await expect(row(page, /^Food & dining/)).toContainText("$112");
  await sheet.getByRole("combobox", { name: "Category" }).selectOption({ label: "Groceries" });
  await sheet.getByRole("checkbox").uncheck({ force: true });
  await expect(sheet.getByRole("status")).toHaveText(/^Moved to Groceries\s*Undo/);
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

test("calendar: month first, as the mockup (Jess, September 2026)", async ({ page }) => {
  await page.goto("/calendar?persona=jess&present=1");
  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: "September 2026" })).toBeVisible();
  // No old toggles or chart.
  await expect(page.getByRole("radio", { name: "Fortnight" })).toHaveCount(0);
  await expect(page.getByText("Show as")).toHaveCount(0);
  // The banner: amount and date, bills to come, excludes everyday spending (with the month's average), a way forward.
  const banner = main.getByRole("region", { name: "You're forecast to be $53 short on Wed 30/09" });
  await expect(banner).toContainText("That's after $367 of bills still to come, but before everyday spending. You've averaged about $70 a day on that this month.");
  await expect(banner.getByRole("link", { name: "Options if money's tight" })).toHaveAttribute("href", "/hardship");
  // Four stats about now.
  const stats = main.getByRole("region", { name: "Your money now" });
  await expect(stats).toContainText("Balance today$314Fri 25/09");
  await expect(stats).toContainText("Lowest forecast−$53Wed 30/09 · day before payday");
  await expect(stats).toContainText("Bills still to come$367Telstra, Beforepay");
  await expect(stats).toContainText("Days below $010of 25 so far this month");
  // Monday-first weeks; 31/08 is a muted, non-interactive cell.
  const cal = main.getByRole("group", { name: /^September 2026/ });
  await expect(cal.getByRole("button")).toHaveCount(30);
  await expect(cal.getByRole("button").first()).toHaveAccessibleName(/^Tue 01\/09/);
  // Today is selected by default: pending listed separately, never in Money out.
  const panel = main.getByRole("region", { name: "Fri 25/09 · Today" });
  await expect(panel).toContainText("$212.40 pending, not yet in balance");
  await expect(panel).toContainText("Money out−$114");
  await expect(panel).toContainText("JB Hi-FiShopping · Pending");
});

test("calendar: selecting days: click, drag, Shift-click, Select range, quick ranges", async ({ page }) => {
  await page.goto("/calendar?persona=jess&present=1");
  const cal = page.getByRole("group", { name: /^September 2026/ });
  const dayBtn = (d: string) => cal.getByRole("button", { name: new RegExp(`^\\w{3} ${d}/09,`) });
  const title = page.locator("#sel-h");
  // Click.
  await dayBtn("10").click();
  await expect(title).toHaveText("Thu 10/09");
  await expect(dayBtn("10")).toHaveAttribute("aria-pressed", "true");
  // Drag (mouse).
  const box = async (d: string) => (await dayBtn(d).boundingBox())!;
  const a = await box("14"), b = await box("16");
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(title).toHaveText("Mon 14/09 – Wed 16/09");
  // Shift-click extends from the anchor.
  await dayBtn("18").click({ modifiers: ["Shift"] });
  await expect(title).toHaveText("Mon 14/09 – Fri 18/09");
  // Select range: tap a start, then an end; the button says what to do.
  await page.getByRole("button", { name: "Select range" }).click();
  await expect(page.getByRole("button", { name: "Tap a start date" })).toBeVisible();
  await dayBtn("24").click();
  await expect(page.getByRole("button", { name: "Now tap an end date" })).toBeVisible();
  await dayBtn("30").click();
  const range = page.getByRole("region", { name: "Thu 24/09 – Wed 30/09" });
  await expect(range).toContainText("7 days · Includes forecast from Sat 26/09 · $212.40 pending, not yet in balance");
  await expect(range).toContainText("Opening balance$149");
  await expect(range).toContainText("Forecast closing−$53");
  await expect(range).toContainText("Lowest point−$53Wed 30/09");
  await expect(range.getByText("Nothing predicted. Everyday spending isn't forecast.").first()).toBeVisible();
  // Keyboard: Enter selects.
  await dayBtn("03").focus();
  await page.keyboard.press("Enter");
  await expect(title).toHaveText("Thu 03/09");
  // Quick ranges from the detected paydays.
  await page.getByRole("button", { name: "Last pay cycle" }).click();
  await expect(title).toHaveText("Thu 03/09 – Wed 16/09");
  await expect(page.getByRole("button", { name: "Last pay cycle" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "This pay cycle" }).click();
  await expect(title).toHaveText("Thu 17/09 – Wed 30/09");
  await page.getByRole("button", { name: "Whole month" }).click();
  await expect(title).toHaveText("Tue 01/09 – Wed 30/09");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(title).toHaveText("Fri 25/09 · Today");
});

test("calendar: months, links in, and where the forecast ends", async ({ page }) => {
  await page.goto("/calendar?persona=jess&present=1&day=2026-09-30");
  await expect(page.locator("#sel-h")).toHaveText("Wed 30/09");
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();
  await expect(page).toHaveURL(/month=2026-10/);
  // Another month opens on the whole month; Tippla's charge is a predicted item.
  await expect(page.locator("#sel-h")).toHaveText("Thu 01/10 – Wed 14/10");
  await expect(page.getByRole("button", { name: /^Fri 02\/10, forecast balance .*Tippla/ })).toBeVisible();
  await expect(page.getByText("From Thu 15/10 there's no forecast yet.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next month" })).toBeDisabled();
  // An older fortnight link lands on the right month.
  await page.goto("/calendar?persona=jess&present=1&offset=1");
  await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();
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

const SCREENS = ["/spending", "/spending?tab=categories", "/spending?tab=budgets", "/spending/compare", "/spending/compare?tab=cohort", "/calendar", "/calendar?month=2026-10", "/subscriptions"];
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

test("Budget ideas: edit the amount inline, Set confirms with Undo, the panel keeps matching (Jess)", async ({ page }) => {
  await page.goto("/spending?persona=jess&present=1");
  const card = page.getByRole("region", { name: "Budget ideas" });
  await expect(card).toContainText("Based on your last three pay cycles. Tap an amount to change it.");
  await expect(card.getByRole("link", { name: "All budgets" })).toHaveAttribute("href", "/spending/budgets");
  // The amount is a button that opens an inline editor; the Set pill and the panel follow the typed amount.
  await card.getByRole("button", { name: "Change the Food & dining amount, now $150" }).click();
  const input = card.getByRole("textbox", { name: "Food & dining budget a cycle, in dollars" });
  await input.fill("120");
  await expect(card.getByRole("button", { name: /^Set \$120 budget for Food/ })).toBeVisible();
  await input.press("Enter");
  await row(page, /^Food & dining/).click();
  await expect(where(page).getByRole("button", { name: "Set a budget of $120" })).toBeVisible();
  // Set saves straight away and confirms in the row, with Undo.
  await card.getByRole("button", { name: /^Set \$120 budget for Food/ }).click();
  await expect(card.getByRole("status")).toContainText("Budget set: $120 a cycle");
  await expect(where(page).getByRole("button", { name: "Budget: $120" })).toBeVisible();
  await card.getByRole("button", { name: /^Undo/ }).click();
  await expect(card.getByRole("button", { name: /^Set \$120 budget for Food/ })).toBeVisible();
  await expect(where(page).getByRole("button", { name: "Set a budget of $120" })).toBeVisible();
  // ✕ is Not now (for this session); with every idea gone, the card and its section go too.
  for (const name of ["Food & dining", "Shopping", "Cash withdrawals"]) await card.getByRole("button", { name: `Not now for ${name}` }).click();
  await expect(page.getByRole("region", { name: "Budget ideas" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: /sections/i }).getByRole("link", { name: "Plan ahead" })).toHaveCount(0);
});
