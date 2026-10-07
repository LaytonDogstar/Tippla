// Today redesign (07/10/2026; reference/today-desktop-mockup.html): hero states, the first screen at 390px,
// Needs a look actions (menu and swipe), empty states, navigation and accessibility at phone and desktop widths.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const hero = (page: Page) => page.getByRole("region", { name: "This pay cycle" });
const needs = (page: Page) => page.getByRole("region", { name: "Needs a look" });

test.describe("hero states", () => {
  test("short (Jess): the figure appears in the hero, with options if money's tight next to it", async ({ page }) => {
    await page.goto("/?persona=jess&present=1&state=none");
    await expect(page.getByTestId("hero-pill")).toHaveText("Short before payday");
    await expect(page.getByTestId("hero-amount")).toContainText("About $53 short of what's due before payday on Thu 01/10");
    await expect(hero(page).getByRole("link", { name: "Options if money's tight" })).toHaveAttribute("href", "/hardship");
    // Pay advance: labelled not income, with what's paid back and when.
    await expect(hero(page).getByText("Pay advance (not income)")).toBeVisible();
    await expect(hero(page).getByText("$315 back 30/09")).toBeVisible();
    await expect(hero(page).getByRole("img", { name: "Balance covers $314 of $367 due; $53 short" })).toBeVisible();
  });

  test("on track (Marcus) and tight (Marcus with a bill that uses nearly everything)", async ({ page }) => {
    await page.goto("/?persona=marcus&present=1&state=none");
    await expect(page.getByTestId("hero-pill")).toHaveText("On track");
    await expect(page.getByTestId("hero-amount")).toContainText("a day safe to spend until payday on Wed 07/10");
    await page.goto("/?persona=marcus&present=1&state=tight");
    await expect(page.getByTestId("hero-pill")).toHaveText("Tight");
    await expect(page.getByTestId("hero-amount")).toContainText("left after bills, with nothing spare before payday");
    await page.goto("/?persona=marcus&present=1&state=none");
  });
});

test("phones: the hero and the first row of quick actions are visible without scrolling (390px)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?persona=jess&present=1&state=none");
  const tabTop = await page.getByRole("navigation", { name: "Main" }).evaluate((e) => e.getBoundingClientRect().top);
  const firstTile = page.getByRole("navigation", { name: "Quick actions" }).getByRole("link", { name: "Bills due" });
  const box = await firstTile.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(tabTop);
  await expect(page.getByRole("navigation", { name: "Quick actions" }).getByRole("link", { name: "Hardship help" })).toHaveAttribute("href", "/hardship");
});

test("no sideways page scroll at 320px (only the quick actions row scrolls)", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const p of ["jess", "marcus", "priya"]) {
    await page.goto(`/?persona=${p}&present=1&state=none`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), p).toBeLessThanOrEqual(0);
  }
});

test("Needs a look: the ⋯ menu marks an item done, with Undo", async ({ page }) => {
  await page.goto("/?persona=jess&present=1&state=none");
  await expect(needs(page).getByRole("listitem")).toHaveCount(3);
  await needs(page).getByRole("button", { name: /More actions: Possible double charge/ }).click();
  const sheet = page.getByRole("dialog", { name: /Possible double charge/ });
  await sheet.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("Marked as done")).toBeVisible();
  await expect(needs(page).getByText(/Possible double charge/)).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(needs(page).getByText(/Possible double charge/)).toBeVisible();
});

test("Needs a look: swipe left on a phone reveals Snooze and Done", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto("/?persona=jess&present=1&state=none");
  const row = needs(page).getByRole("listitem").filter({ hasText: "You can pause your $9.99 Tippla payment" });
  const b = (await row.boundingBox())!;
  const y = b.y + b.height / 2;
  // Pointer events from a touch: a clear sideways drag of 160px.
  await row.locator("div").nth(1).dispatchEvent("pointerdown", { pointerType: "touch", clientX: b.x + b.width - 20, clientY: y, isPrimary: true });
  for (let i = 1; i <= 8; i++) await row.locator("div").nth(1).dispatchEvent("pointermove", { pointerType: "touch", clientX: b.x + b.width - 20 - i * 20, clientY: y, isPrimary: true });
  await row.locator("div").nth(1).dispatchEvent("pointerup", { pointerType: "touch", isPrimary: true });
  await row.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("Marked as done")).toBeVisible();
  await ctx.close();
});

test.describe("empty states", () => {
  test("no alerts: Marcus marks his one item done and Needs a look says so", async ({ page }) => {
    await page.goto("/?persona=marcus&present=1&state=none");
    await needs(page).getByRole("button", { name: /More actions:/ }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Done" }).click();
    await expect(needs(page).getByText(/Nothing needs a look right now/)).toBeVisible();
  });

  test("no upcoming bills: the hero says nothing is due and Coming up lists only money in", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?persona=jess&present=1&state=no_bills");
    await expect(hero(page).getByText("Nothing due before payday")).toBeVisible();
    const coming = page.getByRole("region", { name: "Coming up" });
    await expect(coming.getByText("Payday")).toBeVisible();
    await expect(coming.getByText("Telstra")).toHaveCount(0);
    await page.goto("/?persona=jess&present=1&state=none");
  });

  test("new member with no SmartScore yet (Priya)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?persona=priya&present=1&state=none");
    await expect(page.getByRole("region", { name: "SmartScore" }).getByText("Not enough history yet")).toBeVisible();
  });
});

test("navigation: tab bar on phones (Ask in the centre, Hardship support under More), sidebar on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?persona=jess&present=1&state=none");
  const tabs = page.getByRole("navigation", { name: "Main" });
  await expect(tabs.getByRole("link", { name: "Ask Tippla" })).toHaveAttribute("href", "/assistant");
  await tabs.getByRole("button", { name: /More/ }).click();
  await page.getByRole("dialog", { name: "More" }).getByRole("link", { name: "Hardship support" }).click();
  await expect(page.getByRole("heading", { name: "Hardship support" })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/spending?persona=jess&present=1");
  const side = page.getByRole("navigation", { name: "Main" });
  for (const s of ["Today", "Money", "Score & plan", "Borrowing", "Help & hardship"]) await expect(side.getByRole("link", { name: new RegExp(`^${s}`) })).toBeVisible();
  await expect(side.getByRole("link", { name: "Calendar" })).toBeVisible();
});

for (const width of [390, 1440]) {
  test(`axe: Today has no serious or critical issues at ${width}px (light and dark)`, async ({ browser }) => {
    for (const colorScheme of ["light", "dark"] as const) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme });
      const page = await ctx.newPage();
      await page.goto("/?persona=jess&present=1&state=none");
      await expect(page.getByTestId("hero-pill")).toBeVisible();
      const r = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`), colorScheme).toEqual([]);
      await ctx.close();
    }
  });
}
