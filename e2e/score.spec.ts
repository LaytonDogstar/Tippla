// Phase 3 acceptance: journey 3 (dashboard → score → factor detail → recommendation sheet), null/override
// states, and axe on the Phase 3 screens for every persona in both themes.
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

test("journey 3: dashboard → score → factor detail → recommendation sheet (Jess)", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  await expect(page.getByRole("heading", { name: "Hi Jess" })).toBeVisible();
  // Today redesign: the compact SmartScore card opens the SmartScore page.
  await page.getByRole("link", { name: /^Open SmartScore/ }).click();

  await expect(page).toHaveURL(/\/score$/);
  await expect(page.getByRole("heading", { name: "SmartScore", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: /^Current borrowing 2\.9 \/ 10/ }).click();

  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Current borrowing" })).toBeVisible();
  await expect(page).toHaveURL(/\/score\/current-borrowing$/);
  await expectNoAxe(page);

  await sheet.getByRole("button", { name: /Skip the next pay advance/ }).click();
  await expect(sheet.getByRole("heading", { name: "Skip the next pay advance if you can" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1); // replaced in place, never a second sheet
  await sheet.getByRole("button", { name: "Back" }).click();
  await expect(sheet.getByRole("heading", { name: "Current borrowing" })).toBeVisible();
  await expect(sheet.getByRole("heading", { name: "Current borrowing" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/score$/);
});

test("factor deep link opens its sheet", async ({ page }) => {
  await page.goto("/score/current-borrowing?persona=jess&present=1");
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Current borrowing" })).toBeVisible();
});

test("Priya: override state, null factors, no recommendations", async ({ page }) => {
  await page.goto("/score?persona=priya&present=1");
  await expect(page.getByRole("heading", { name: "Not enough history yet" })).toBeVisible();
  await expect(page.getByText(/10\/11\/2026/)).toBeVisible();
  await expect(page.getByText("-998")).toHaveCount(0);
  await page.getByRole("button", { name: /^Income stability.*Not enough history yet/ }).click();
  await expect(page.getByRole("dialog").getByText("We don't have enough history to work this out yet.").first()).toBeVisible();

  await page.goto("/savings?persona=priya&present=1");
  await expect(page.getByRole("button", { name: "See how" })).toHaveCount(0);
});

test("Ways to lift your score: snooze and dismiss with undo", async ({ page }) => {
  await page.goto("/savings?persona=jess&present=1");
  await page.evaluate(() => localStorage.removeItem("tippla-recs"));
  await page.reload();
  const before = await page.getByRole("button", { name: "See how" }).count();
  await page.getByRole("button", { name: "Not relevant to me" }).first().click();
  await expect(page.getByRole("button", { name: "See how" })).toHaveCount(before - 1);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "See how" })).toHaveCount(before);
});

for (const persona of ["jess", "marcus", "priya"]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`axe: Phase 3 screens, ${persona}, ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const url of ["/", "/score", "/savings"]) {
        await page.goto(`${url}?persona=${persona}&present=1`);
        await page.waitForLoadState("networkidle");
        await expectNoAxe(page);
      }
    });
  }
}
