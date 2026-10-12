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
  // Your progress (09/10/2026): the score opens the SmartScore page.
  await page.getByRole("link", { name: /^Open SmartScore/ }).click();

  await expect(page).toHaveURL(/\/score$/);
  await expect(page.getByRole("heading", { name: "SmartScore", level: 1 })).toBeVisible();
  await page.getByRole("region", { name: "What's behind it" }).getByRole("button", { name: /^Current borrowing/ }).click();

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
  await page.getByRole("region", { name: "What's behind it" }).getByRole("button", { name: /^Income stability/ }).click();
  await expect(page.getByRole("dialog").getByText("We don't have enough history to work this out yet.").first()).toBeVisible();

  // The money plan carries no score-factor copy (it moved to SmartScore).
  await page.goto("/money-plan?persona=priya&present=1");
  await expect(page.getByRole("heading", { level: 1, name: "Your money plan" })).toBeVisible();
  await expect(page.getByText(/lift this factor|lenders look at|Cash use/i)).toHaveCount(0);
});

test("Money plan cards: remind me next pay cycle and not relevant, each with a way back", async ({ page }) => {
  await page.goto("/money-plan?persona=jess&present=1");
  await page.evaluate(() => localStorage.removeItem("tippla-recs"));
  await page.reload();
  const repay = page.getByRole("region", { name: /Your repayments/ });
  await repay.getByRole("button", { name: "More options" }).click();
  await page.getByRole("button", { name: "Remind me next pay cycle" }).click();
  await expect(repay).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "hidden until your next pay cycle" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: /Your repayments/ })).toHaveCount(0); // kept for this pay cycle
  await page.getByRole("button", { name: "Show it again" }).click();
  await expect(page.getByRole("region", { name: /Your repayments/ })).toBeVisible();
  const g = page.getByRole("region", { name: /on betting last pay cycle/ });
  await g.getByRole("button", { name: "More options" }).click();
  await page.getByRole("button", { name: "Hide this card" }).click();
  await expect(g).toHaveCount(0);
  await page.getByRole("button", { name: "Show it again" }).click();
  await expect(page.getByRole("region", { name: /on betting last pay cycle/ })).toBeVisible();
});

for (const persona of ["jess", "marcus", "priya"]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`axe: Phase 3 screens, ${persona}, ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const url of ["/", "/score", "/money-plan"]) {
        await page.goto(`${url}?persona=${persona}&present=1`);
        await page.waitForLoadState("networkidle");
        await expectNoAxe(page);
      }
    });
  }
}

test("SmartScore one column (Jess): header, pills, hero, what changed, next step with the shortfall note, factors, trend", async ({ page }) => {
  await page.goto("/score?persona=jess&present=1");
  await expect(page.getByText("Updated Fri 25/09, 9:14am · Next update Fri 09/10")).toBeVisible();
  await expect(page.getByRole("link", { name: "Why did my score drop?" })).toHaveAttribute("href", /\/assistant\?entry=contextual&q=Why%20did%20my%20score%20drop/);
  await expect(page.getByRole("link", { name: "How your score works" })).toHaveCount(0); // no info icon in the header
  const pills = page.getByRole("navigation", { name: "On this page" });
  await expect(pills.getByRole("link")).toHaveText(["Where you stand", "Next step", "What's behind it", "Over time"]);
  // 1 Where you stand: the dark hero, then What changed.
  const stand = page.getByRole("region", { name: "Where you stand" });
  await expect(stand).toContainText("Steadying · falling for 10 weeks");
  await expect(stand).toContainText("↓ 17 since 11/09");
  await expect(stand).toContainText("Was 489 · out of 1,000");
  await expect(stand).toContainText("128 points to Healthy at 600");
  await expect(stand).toContainText("489 → 472 since 11/09");
  await expect(stand).toContainText("Points per factor are estimates. The total (−17) is your actual change.");
  // 2 Next step: the plan, the action, the estimate and the shortfall note.
  const next = page.getByRole("region", { name: "Next step" });
  await expect(next).toContainText("Your plan · Step 1 of 3");
  await expect(next).toContainText("Skip the next pay advance if you can");
  await expect(next).toContainText("~490 by 23/10 · estimate");
  await expect(next.getByRole("note")).toContainText("You're about $53 short before payday on Thu 01/10");
  await expect(next.getByRole("link", { name: /Options if money's tight/ })).toHaveAttribute("href", "/hardship");
  // 3 What's behind it: three with most room to move, the other five behind a toggle.
  const factors = page.getByRole("region", { name: "What's behind it" });
  await expect(factors).toContainText("8 factors, each scored out of 10");
  const toggle = factors.getByRole("button", { name: /^Other factors · 5/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(factors.getByRole("button", { name: /^Income stability/ })).toBeHidden();
  await toggle.click();
  await expect(factors.getByRole("button", { name: /^Income stability/ })).toBeVisible();
  await expect(factors.getByRole("button", { name: /See gambling in Spending/ })).toBeVisible(); // opens the gambling panel (journeys A2)
  // 4 Over time: a chart with a text alternative listing the values.
  await expect(page.getByRole("img", { name: /521, 515, 506, 498, 489, 472\. Healthy starts at 600/ })).toBeVisible();
  await page.getByRole("button", { name: "How your score works" }).click();
  await expect(page.getByRole("dialog", { name: "How your score works" })).toBeVisible();
});

test("SmartScore: no shortfall note when Today shows none (Marcus)", async ({ page }) => {
  await page.goto("/score?persona=marcus&present=1");
  await expect(page.getByRole("region", { name: "Next step" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Next step" }).getByRole("note")).toHaveCount(0);
  await page.goto("/?persona=marcus&present=1");
  await expect(page.getByTestId("hero-amount")).not.toContainText("short");
});
