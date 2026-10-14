// The public marketing site (14/10/2026): "/" for visitors, the six pages, log in and out, one price everywhere,
// no partner named, accessibility in both themes and no sideways scroll on a phone.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PAGES = ["/", "/smartscore", "/pricing", "/security", "/support", "/faq", "/login"];
const WIDTHS = [375, 768, 1024, 1440];
const axe = async (page: Page) => {
  const r = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  return r.violations.map((v) => `${page.url()} ${v.id}: ${v.nodes[0]?.target.join(" ")}`);
};

test("a visitor gets the marketing home at /: hero, example cards, steps, price, FAQ and free help", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Find out why. Then change the answer." })).toBeVisible();
  await expect(page.getByTestId("hero-ticks")).toContainText("$4.99 a month");
  // Feature visuals are markup with example figures that match the app (tests/siteExamples.test.ts).
  await expect(page.getByRole("img", { name: "SmartScore gauge at 472 out of 1,000" })).toBeVisible();
  await expect(page.getByText("−$53", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Where the pay went/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Money left the day before payday, oldest to newest: \$83, \$12, minus \$241/ })).toBeVisible();
  await expect(page.locator("img[src^='/site/preview-']")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Set up in about five minutes" })).toBeVisible();
  await expect(page.getByTestId("home-price-card")).toContainText("$4.99a month");
  // FAQ: native details, the first one open.
  await expect(page.locator("details").first()).toHaveAttribute("open", "");
  await page.getByText("How do I cancel?").click();
  await expect(page.getByText("One tap in the app. No phone calls, no retention offers.")).toBeVisible();
  await expect(page.getByRole("link", { name: /1800 007 007/ }).first()).toHaveAttribute("href", "tel:1800007007");
  // Every "See my SmartScore" goes to onboarding; "See how it works" goes to the steps.
  const starts = page.getByRole("link", { name: "See my SmartScore" });
  expect(await starts.count()).toBeGreaterThanOrEqual(4);
  for (const href of await starts.evaluateAll((els) => els.map((e) => e.getAttribute("href")))) expect(href).toBe("/onboarding");
  await expect(page.getByRole("link", { name: "See how it works" })).toHaveAttribute("href", "/#how");
  await expect(page.locator("#how")).toHaveCount(1);
});

test("every homepage link resolves", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = [...new Set(await page.locator("a[href^='/']").evaluateAll((els) => els.map((e) => e.getAttribute("href")!.split("#")[0] || "/")))];
  for (const h of hrefs) expect((await request.get(h, { maxRedirects: 0 })).status(), h).toBeLessThan(400);
  await page.goto("/security#tippla-privacy");
  await expect(page.locator("#tippla-privacy")).toBeVisible();
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
  await expect(page.getByRole("heading", { level: 1, name: "Find out why. Then change the answer." })).toBeVisible();
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

test("homepage: no sideways scroll at 375, 768, 1024 and 1440; callouts only above 900px", async ({ browser }) => {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), String(width)).toBeLessThanOrEqual(0);
    await expect(page.getByText("Found in your subscriptions")).toBeVisible({ visible: width > 900 });
    await ctx.close();
  }
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
