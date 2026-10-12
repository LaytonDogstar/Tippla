// Spec 11 always-on rules in the browser: offers pause after hardship support this pay cycle (rule 2), and a
// forecast shortfall always has hardship one tap away on Today (rule 3).
import { expect, test } from "@playwright/test";

test("rule 2: Marcus opens Hardship support, and Offers pause for this pay cycle", async ({ page }) => {
  await page.goto("/offers?persona=marcus&present=1&state=none");
  await expect(page.getByRole("heading", { name: "Offers are paused for now" })).toHaveCount(0);
  await page.goto("/hardship?persona=marcus&present=1");
  await expect(page.getByRole("heading", { name: "Hardship support" })).toBeVisible();
  await expect.poll(async () => (await page.context().cookies()).find((c) => c.name === "tippla-account")?.value ?? "").toContain("hardshipVisitedAt");
  await page.goto("/offers?persona=marcus&present=1");
  await expect(page.getByRole("heading", { name: "Offers are paused for now" })).toBeVisible();
  await expect(page.getByText("We don't show loan offers in a pay cycle where you've used hardship support.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Options if money's tight" })).toHaveAttribute("href", "/hardship");
});

test("rule 3: Jess is short before payday, and hardship is one tap from Today", async ({ page }) => {
  await page.goto("/?persona=jess&present=1&state=none");
  // Single-column Today: next to the shortfall in the hero, and on the payment that takes her below $0.
  await expect(page.getByRole("region", { name: "Coming up" }).getByRole("link", { name: "This takes you below $0 · See your options" })).toHaveAttribute("href", "/hardship");
  // The hero's "Options if money's tight" opens the graduated panel (journeys A2), which ends with all hardship support.
  await page.getByRole("region", { name: "This pay cycle" }).getByRole("button", { name: "Options if money's tight" }).click();
  await page.getByRole("dialog", { name: "Options if money's tight" }).getByRole("link", { name: "All hardship support" }).click();
  await expect(page.getByRole("heading", { name: "Hardship support" })).toBeVisible();
});
