// The public marketing site (14/10/2026): "/" for visitors, the six pages, log in and out, one price everywhere,
// no partner named, accessibility in both themes and no sideways scroll on a phone.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PAGES = ["/", "/smartscore", "/pricing", "/security", "/support", "/faq", "/login"];
const axe = async (page: Page) => {
  const r = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  return r.violations.map((v) => `${page.url()} ${v.id}: ${v.nodes[0]?.target.join(" ")}`);
};

test("a visitor gets the marketing home at /, with the price, the steps and free help", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Find out why, and what would change the answer" })).toBeVisible();
  await expect(page.getByTestId("hero-price")).toHaveText("$4.99 a month. Cancel any time.");
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await expect(page.getByText("ACCC-accredited Consumer Data Right data recipient").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "1800 007 007" }).first()).toHaveAttribute("href", "tel:1800007007");
  // Real screens with example data, in both themes.
  for (const id of ["today", "score", "plan", "cycles"]) {
    const ok = await page.evaluate(async (src) => (await fetch(src)).ok, `/site/preview-${id}-light.jpg`);
    expect(ok, id).toBe(true);
  }
  await expect(page.getByRole("link", { name: "Get started" }).first()).toHaveAttribute("href", "/onboarding");
});

test("every page loads; no partner is named; the price matches the app", async ({ page }) => {
  for (const p of PAGES) {
    const res = await page.goto(p);
    expect(res!.status(), p).toBe(200);
    await expect(page.locator("body"), p).not.toContainText(/Friendly Finance/i);
    await expect(page.locator("body"), p).not.toContainText(/pre-approved|guaranteed approval|act now|limited time/i);
  }
  await page.goto("/pricing");
  await expect(page.getByTestId("price-card")).toContainText("$4.99a month");
  // The app charges the same: Account › Subscription.
  await page.goto("/account/subscription?persona=jess&present=1");
  await expect(page.getByText("$4.99 a month")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Change to/ })).toHaveCount(0);
});

test("members: picking a persona or logging in shows Today at /; signing out shows the site again", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Log in" }).click(); // no preview password locally: straight in
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("hero-pill")).toBeVisible(); // Today's pay-cycle hero
  await page.goto("/api/gate?signout=1");
  await expect(page.getByRole("heading", { level: 1, name: "Find out why, and what would change the answer" })).toBeVisible();
  await page.goto("/?persona=marcus&present=1");
  await expect(page.getByTestId("hero-pill")).toBeVisible();
});

test("phone: menu opens and closes, links work, no sideways scroll on any page", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  for (const p of PAGES) {
    await page.goto(p);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), p).toBeLessThanOrEqual(0);
  }
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu" });
  await menu.click();
  await expect(menu.or(page.getByRole("button", { name: "Close menu" }))).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#site-menu")).toHaveCount(0);
  await page.getByRole("button", { name: "Menu" }).click();
  await page.locator("#site-menu").getByRole("link", { name: "Pricing" }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await ctx.close();
});

for (const width of [390, 1280]) {
  test(`axe: every site page, light and dark, ${width}px`, async ({ browser }) => {
    test.setTimeout(120_000);
    const problems: string[] = [];
    for (const colorScheme of ["light", "dark"] as const) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme });
      const page = await ctx.newPage();
      for (const p of PAGES) { await page.goto(p); problems.push(...(await axe(page))); }
      await ctx.close();
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
}
