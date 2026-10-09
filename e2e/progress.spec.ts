// Phase 3 (loop): progress and goals. Positive streaks, money left before each payday, a buffer goal that
// flows into safe to spend (or waits when there's no room), and the weekly summary page.
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
const region = (page: Page, name: string | RegExp) => page.getByRole("region", { name });

test("Marcus: streaks, money left before each payday, score timeline; reached from Today", async ({ page }) => {
  await page.goto("/?persona=marcus&present=1");
  await page.getByRole("region", { name: "Your progress" }).getByRole("link", { name: /^Details/ }).click();
  await expect(page).toHaveURL(/\/progress/);
  await expect(region(page, "Going well")).toContainText("12 pay cycles in a row without a new pay advance");
  const cycles = region(page, "Money left the day before payday");
  await expect(cycles.getByRole("listitem")).toHaveCount(6);
  await expect(cycles.getByRole("listitem").first()).toContainText("$917 left");
  await expect(region(page, "Your SmartScore and what you did")).toContainText("SmartScore 612");
  await expect(page.getByRole("main")).not.toContainText(/offer|lender|gambl/i);
  await expectNoAxe(page);
});

test("Jess on payday: set a goal; safe to spend allows for it; change and remove with Undo", async ({ page }) => {
  await page.goto("/progress?persona=jess&present=1&state=payday");
  await expect(region(page, "Going well")).toContainText("When something goes well two pay cycles in a row");
  await expect(region(page, "Money left the day before payday")).toContainText("Below $0 (−$680)");
  await page.getByRole("button", { name: "Set a goal" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByLabel("$200")).toBeChecked();
  await expect(sheet.getByLabel("Wed 09/12")).toBeChecked();
  await expect(sheet.getByText("That builds up by about $40 each pay cycle, over 5 pay cycles.")).toBeVisible();
  await expectNoAxe(page);
  await sheet.getByRole("button", { name: "Save goal" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Goal saved" })).toBeVisible();
  const goal = region(page, "Your goal");
  await expect(goal).toContainText("$200 left the day before payday, by Wed 09/12");
  await expect(goal).toContainText("This pay cycle, aim to have $40 left on Wed 14/10.");
  await expect(goal).toContainText("We'll show how it's going after payday on Thu 15/10.");

  await page.goto("/?persona=jess&present=1");
  const checkIn = region(page, "Payday check-in");
  await expect(checkIn).toContainText("Safe to spend: about $25 a day");
  await expect(checkIn).toContainText("Includes $40 towards your goal");
  await expect(page.getByRole("region", { name: "Your progress" }).getByRole("link", { name: /^Details/ })).toHaveAttribute("href", "/progress");
  await checkIn.getByRole("button", { name: "How we worked this out" }).click();
  await expect(page.getByRole("dialog").getByText("Towards your goal this pay cycle")).toBeVisible();
  await page.keyboard.press("Escape");

  // Change it: a custom amount is validated.
  await page.goto("/progress?persona=jess&present=1");
  await page.getByRole("button", { name: "Change goal" }).click();
  await page.getByRole("dialog").getByText("Another amount").click();
  await page.getByRole("dialog").getByLabel("Amount ($)").fill("5");
  await page.getByRole("dialog").getByRole("button", { name: "Save goal" }).click();
  await expect(page.getByRole("dialog").getByText("Enter an amount between $20 and $5,000")).toBeVisible();
  await page.getByRole("dialog").getByLabel("Amount ($)").fill("300");
  await page.getByRole("dialog").getByRole("button", { name: "Save goal" }).click();
  await expect(region(page, "Your goal")).toContainText("$300 left the day before payday");

  await page.getByRole("button", { name: "Remove goal" }).click();
  await expect(page.getByRole("button", { name: "Set a goal" })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(region(page, "Your goal")).toContainText("$300 left the day before payday");
});

test("Jess on 25/09 with a goal: it waits, and safe to spend is unchanged", async ({ page }) => {
  await page.goto("/progress?persona=jess&present=1");
  await page.getByRole("button", { name: "Set a goal" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save goal" }).click();
  await expect(region(page, "Your goal")).toContainText("Your bills take everything this pay cycle, so your goal waits until there's room.");
  await page.goto("/?persona=jess&present=1");
  // Today redesign: safe to spend is in the hero; Jess is short, and the working is one tap away.
  await expect(region(page, "This pay cycle")).toContainText("Short before payday");
  await region(page, "This pay cycle").getByRole("button", { name: "How we worked this out" }).click();
  await expect(page.getByRole("dialog").getByText("Your goal waits this pay cycle: bills and everyday spending come first.")).toBeVisible();
});

test("weekly summary: from the inbox, this week's events plus safe to spend and savings", async ({ page }) => {
  await page.goto("/notifications?persona=jess&present=1");
  await page.getByRole("link", { name: "Your weekly summary" }).click();
  await expect(page).toHaveURL(/\/notifications\/summary/);
  const main = page.getByRole("main");
  await expect(main.getByText("Sat 19/09 – Fri 25/09", { exact: false })).toBeVisible();
  await expect(main.getByText("Heads up: about $53 short before payday")).toBeVisible();
  await expect(main.getByText("Your SmartScore is 472")).toBeVisible();
  await expect(main).not.toContainText(/offer|lender|gambl/i);
  await expectNoAxe(page);
});

for (const persona of ["jess", "marcus", "priya"]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`axe: progress and summary, ${persona}, ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const url of ["/progress", "/notifications/summary"]) {
        await page.goto(`${url}?persona=${persona}&present=1`);
        await expectNoAxe(page);
      }
    });
  }
}
