// Spec 03: Tippla charges the day after payday, never into a shortfall, and offers its own pause openly.
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

test("Jess: next charge moves to Fri 02/10 after her payday, with the reason and the proration", async ({ page }) => {
  await page.goto("/account?persona=jess&present=1&state=none");
  await expect(page.getByText("Standard plan · Next charge Fri 02/10 (the day after your payday)")).toBeVisible();
  await page.goto("/account/subscription?persona=jess&present=1");
  await expect(page.getByText("Next charge $11.32 on Fri 02/10 (the day after your payday)")).toBeVisible();
  await expect(page.getByText("We've moved your Tippla payment to after your pay lands on Thu 01/10.")).toBeVisible();
  await expect(page.getByText("Because the date moved, this charge includes $1.33 for 28/09 – 01/10 (4 days × $9.99 ÷ 30 days).")).toBeVisible();
  // Short before payday: the pause is offered openly, not behind Cancel.
  await expect(page.getByText("If money's tight, you can pause for a month or change plan.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause for a month" })).toBeVisible();
  await expectNoAxe(page);
});

test("choosing a fixed date that lands before a shortfall is moved to after pay; per pay cycle charges $4.61", async ({ page }) => {
  await page.goto("/account/subscription?persona=jess&present=1&state=none");
  await page.getByText("A fixed date each month").click();
  await expect(page.getByRole("status").filter({ hasText: "Payment settings saved" })).toBeVisible();
  await expect(page.getByLabel("Day of the month")).toHaveValue("28");
  await expect(page.getByText("We've moved your payment from Mon 28/09 to Fri 02/10, after your pay lands, so it doesn't take your balance below $0.")).toBeVisible();
  await page.getByText("The day after payday (recommended)").click();
  await page.getByText("Each pay cycle ($4.61 a fortnight)").click();
  await expect(page.getByText("Next charge $4.61 on Fri 02/10 (the day after your payday)")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Each pay cycle ($4.61 a fortnight)")).toBeChecked();
});

test("pause for a month straight from the page; billing resumes after a payday", async ({ page }) => {
  await page.goto("/account/subscription?persona=jess&present=1&state=none");
  await page.getByRole("button", { name: "Pause for a month" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText(/Your Fri 02\/10 charge is skipped and billing resumes on Fri 30\/10/)).toBeVisible();
  await sheet.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("Paused. Billing resumes on Fri 30/10.")).toBeVisible();
});

test("the feed offers the pause under Help when Jess is short; it never appears as an offer", async ({ page }) => {
  await page.goto("/?persona=jess&present=1&state=none");
  await expect(page.getByRole("navigation", { name: "Main" }).first().getByRole("link", { name: "Help 1 thing to look at" })).toBeVisible();
  await page.getByRole("button", { name: /^See all \(\d+\)$/ }).click();
  const card = page.getByRole("region", { name: "Needs a look" }).getByRole("article").filter({ hasText: "You can pause your $9.99 Tippla payment" });
  await expect(card).toContainText("It's due Fri 02/10.");
  await card.getByRole("link", { name: "See pause and plan options" }).click();
  await expect(page).toHaveURL(/\/account\/subscription/);
});

test("Marcus: opening Hardship support this pay cycle surfaces the pause; a failed payment is retried after pay", async ({ page }) => {
  await page.goto("/account/subscription?persona=marcus&present=1&state=none");
  await expect(page.getByText("If money's tight", { exact: false })).toHaveCount(0);
  await page.goto("/hardship?persona=marcus&present=1");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(500);
  await page.goto("/account/subscription?persona=marcus&present=1&state=billing_failed");
  await expect(page.getByText("If money's tight", { exact: false })).toBeVisible();
  await expect(page.getByText(/Your \$14\.99 payment on Fri 28\/08 didn't go through\. We'll try again on Thu 08\/10, after your pay lands\. There's no fee from Tippla\./)).toBeVisible();
});

test("axe: subscription page, dark", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/account/subscription?persona=jess&present=1&state=none");
  await page.getByText("A fixed date each month").click();
  await expectNoAxe(page);
});
