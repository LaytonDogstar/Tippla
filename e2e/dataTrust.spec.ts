// Spec 05: corrections (bill, subscription, the corrections list), connection health (consent expiring,
// stale data, reconnect back to where you were) and the forecast-miss prompt.
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

test("acceptance: Jess marks Telstra as already paid; the shortfall and safe to spend update", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  await expect(page.getByRole("button", { name: /About \$53 short before payday/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "See what's due" }).first().click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "Not right? Telstra" }).click();
  await expect(sheet.getByRole("heading", { name: "Telstra: what's changed?" })).toBeVisible();
  await expectNoAxe(page);
  await sheet.getByRole("button", { name: "Already paid" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Got it. Your forecast is updated" })).toBeVisible();
  await expect(sheet.getByText("Telstra")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /About \$1 short before payday/ }).first()).toBeVisible();

  // Listed under Account › Your corrections, and removable.
  await page.goto("/account/corrections?persona=jess&present=1");
  await expect(page.getByText("Telstra due 26/09: already paid")).toBeVisible();
  await expectNoAxe(page);
  await page.getByRole("button", { name: "Remove: Telstra due 26/09: already paid" }).click();
  await expect(page.getByText("Nothing yet.", { exact: false })).toBeVisible();
  await page.goto("/?persona=jess&present=1");
  await expect(page.getByRole("button", { name: /About \$53 short before payday/ }).first()).toBeVisible();
});

test("subscription: This has ended takes it out; the rule is listed", async ({ page }) => {
  await page.goto("/subscriptions?persona=jess&present=1");
  // UX round 2, 6.5: "Not right?" is in the ⋯ menu.
  await page.getByRole("button", { name: "More options for Stan" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Not right? Stan" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "This has ended" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Got it. Your forecast is updated" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Stan" })).toHaveCount(0);
  await page.goto("/account/corrections?persona=jess&present=1");
  await expect(page.getByText("Stan: subscription has ended")).toBeVisible();
});

test("acceptance: consent ending in 10 days: feed card, status line, reminder schedule; renew returns you", async ({ page }) => {
  await page.goto("/?persona=jess&present=1&state=consent_expiring");
  await expect(page.getByRole("link", { name: "Your bank connection ends Mon 05/10 · Renew it to keep your forecast up to date" })).toBeVisible();
  await page.getByRole("button", { name: /See all/ }).click().catch(() => {});
  await expect(page.getByText("Your bank connection ends in 10 days").first()).toBeVisible();
  await page.goto("/account/bank?persona=jess&present=1");
  await expect(page.getByText("Ending soon", { exact: false })).toBeVisible();
  await expect(page.getByText("We'll remind you on Fri 02/10 and Mon 05/10.")).toBeVisible();
  await expectNoAxe(page);
  await page.getByRole("link", { name: "Renew access" }).click();
  await expect(page.getByRole("heading", { name: "Reconnect your bank" })).toBeVisible();
  await expectNoAxe(page);
  await page.getByRole("button", { name: "Continue to TaleFin" }).click();
  await page.getByRole("button", { name: "Log in and share" }).click();
  await page.waitForURL("**/account/bank");
  await expect(page.getByText("Connected", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Access ends Sat 25/09/2027", { exact: false }).or(page.getByText(/Access ends .*25\/09/))).toBeVisible();
});

test("stale data: safe to spend pauses, every page says which day it's from, reconnect goes back", async ({ page }) => {
  await page.goto("/?persona=jess&present=1&state=stale");
  await expect(page.getByText("Reconnect to see today's figure")).toBeVisible();
  await page.goto("/spending?persona=jess&present=1");
  await expect(page.getByText("Based on data from Fri 25/09")).toBeVisible();
  await expectNoAxe(page);
  await page.getByRole("link", { name: "Reconnect" }).first().click();
  await page.getByRole("button", { name: "Continue to TaleFin" }).click();
  await page.getByRole("button", { name: "Log in and share" }).click();
  await page.waitForURL("**/spending");
  await expect(page.getByText("Based on data from Fri 25/09")).toHaveCount(0);
});

test("forecast miss: ask once what happened", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  const card = page.getByRole("region", { name: "We got this one wrong. Was there something unusual?" });
  await expect(card).toContainText("For Thu 24/09 we expected about $70 in your account. It ended the day at $428.");
  await card.getByRole("button", { name: "Nothing unusual" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Thanks. That helps us get your forecast right" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "We got this one wrong. Was there something unusual?" })).toHaveCount(0);
});
