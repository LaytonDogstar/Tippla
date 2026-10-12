// Cross-page journeys (12/10/2026): one test for each defect in Part B of the brief, then the five journeys at 390px
// using only in-page controls (as when Tippla is added to the home screen: no browser back button).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

async function expectNoAxe(page: Page) {
  const r = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const s = r.violations.map((v) => `${page.url()} ${v.id}: ${v.nodes[0]?.target.join(" ")} — ${v.help}`);
  expect(s, s.join("\n")).toEqual([]);
}
const withAccount = (context: BrowserContext, persona: string, a: object) =>
  context.addCookies([{ name: "tippla-account", value: encodeURIComponent(JSON.stringify({ [persona]: a })), url: "http://localhost:3200" }]);
const phone = { width: 390, height: 844 };
const back = (page: Page) => page.getByTestId("back-control");
/** The Activity heading's distance from the top of the viewport (the sticky chips are 72px). */
const activityTop = (page: Page) => page.evaluate(() => Math.round(document.getElementById("activity")!.getBoundingClientRect().top));

test.describe("Part B defects", () => {
  test.use({ viewport: phone });

  test("B1/B12: Today → Gambling opens a titled panel with tap-to-call support; back closes it", async ({ page }) => {
    await page.goto("/?persona=jess&present=1&state=none");
    await page.getByRole("region", { name: "Spending" }).getByRole("button", { name: /Gambling/ }).click();
    const dlg = page.getByRole("dialog", { name: "Gambling" });
    await expect(dlg).toContainText("This pay cycle so far");
    await expect(dlg.getByRole("link", { name: "Call 1800 858 858" })).toHaveAttribute("href", "tel:1800858858");
    await expect(dlg.getByRole("link", { name: "Call 1800 007 007" })).toHaveAttribute("href", "tel:1800007007");
    await expect(page).toHaveURL(/panel=gambling/);
    await expectNoAxe(page);
    await page.goBack();
    await expect(dlg).toBeHidden();
    await expect(page).not.toHaveURL(/panel=/);
  });

  test("B2: deep links scroll to Activity only once the page has laid out (category and search)", async ({ page }) => {
    for (const url of ["/spending?persona=jess&present=1&category=gambling", "/spending?persona=jess&present=1&q=Amazon%20AU"]) {
      await page.goto(url);
      await expect.poll(() => activityTop(page), { timeout: 5000 }).toBeLessThan(140);
      expect(await activityTop(page)).toBeGreaterThan(-20);
    }
  });

  test("B3: back controls on sub-pages, labelled with where you came from, falling back to the parent", async ({ page }) => {
    for (const [url, label] of <[string, string][]>[["/spending/budgets", "Back to Spending"], ["/progress", "Back to Money plan"], ["/progress/whats-next", "Back to Pay cycles"], ["/notifications", "Back to Today"]]) {
      await page.goto(`${url}?persona=jess&present=1`);
      await expect(back(page)).toHaveText(label);
    }
    await page.goto("/money-plan?persona=jess&present=1");
    await page.getByRole("link", { name: "See every pay cycle" }).click();
    await expect(back(page)).toHaveText("Back to Money plan");
  });

  test("B4: Pay cycles (/progress) belongs to Money in the sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/progress?persona=jess&present=1");
    await expect(page.getByRole("heading", { level: 1, name: "Pay cycles" })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Main" }).first();
    await expect(nav.getByRole("link", { name: /^Money( \d+ things? to look at)?$/ })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Pay cycles" })).toHaveAttribute("aria-current", "page");
  });

  test("B5: SmartScore's gambling link opens the panel with support, not a bare list", async ({ page }) => {
    await page.goto("/score?persona=jess&present=1");
    await page.getByRole("button", { name: /^See gambling/ }).click();
    const dlg = page.getByRole("dialog", { name: "Gambling" });
    await expect(dlg.getByRole("link", { name: "Call 1800 858 858" })).toBeVisible();
    await dlg.getByRole("link", { name: "See all gambling in Spending" }).click();
    await expect(page.getByTestId("gambling-support-strip")).toBeVisible();
    // The way back sits where the customer landed (not 2,500px up at the top of the page).
    await expect(page.getByTestId("context-header")).toHaveText("Back to SmartScoreGambling · this pay cycle");
    await expect(page.getByTestId("back-inline")).toBeInViewport();
    await expect(page.getByText(/may have charged you twice/)).toHaveCount(0); // not a gambling transaction
  });

  test("B6: the calendar keeps from/to, selects no quick button that doesn't match, and drops September's banner in October", async ({ page }) => {
    await page.goto("/calendar?persona=jess&present=1&from=2026-10-01&to=2026-10-14");
    await expect(page.getByRole("region", { name: "Thu 01/10 – Wed 14/10" })).toBeVisible();
    await expect(page).toHaveURL(/from=2026-10-01&to=2026-10-14/);
    await expect(page.getByRole("group", { name: "Show", exact: true }).locator('[aria-pressed="true"]')).toHaveCount(0);
    await expect(page.locator("#short-h")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("region", { name: "Thu 01/10 – Wed 14/10" })).toBeVisible();
    await page.getByRole("button", { name: "This pay cycle" }).click();
    await expect(page.getByRole("button", { name: "This pay cycle" })).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/from=2026-09-17&to=2026-09-30/);
  });

  test("B7: the forecast says what it counts; Today and the calendar show the usual-spending figure too", async ({ page }) => {
    // Future days lead with the usual everyday spending taken off; "Bills only" is one tap away.
    await page.goto("/calendar?persona=jess&present=1&from=2026-10-01&to=2026-10-14");
    await expect(page.getByTestId("forecast-note")).toHaveText("Forecast days take off your usual everyday spending (about $86 a day). Counting bills only, the lowest would be $1,051 on Tue 13/10.");
    await expect(page.getByRole("button", { name: /^Wed 14\/10, forecast balance −\$583/ })).toBeVisible();
    await page.getByRole("radio", { name: "Bills only" }).check({ force: true });
    await expect(page).toHaveURL(/forecast=bills/);
    await expect(page.getByTestId("forecast-note")).toContainText("Forecast days count pay and bills only. With your usual everyday spending (about $86 a day), the lowest would be about −$583 on Wed 14/10.");
    await page.goto("/calendar?persona=jess&present=1");
    await expect(page.locator("#short-h")).toHaveText("You're forecast to be $483 short on Wed 30/09"); // as on Today
    await page.goto("/?persona=jess&present=1&state=none");
    await expect(page.getByTestId("hero-usual")).toHaveText("With your usual everyday spending (about $86 a day): about $483 short by Wed 30/09");
  });

  test("B8: repayments and lender count read the same on Spending, Money plan and Borrowing", async ({ page }) => {
    await page.goto("/spending?persona=jess&present=1");
    const lenders = page.getByRole("region", { name: "Longer term" });
    await expect(lenders).toContainText("$668 a pay cycle");
    await expect(lenders).toContainText("6 lenders, including pay advances");
    await page.goto("/money-plan?persona=jess&present=1");
    await expect(page.getByRole("heading", { name: "Your repayments: about $668 a pay cycle" })).toBeVisible();
    await page.goto("/loans?persona=jess&present=1");
    await expect(page.getByTestId("repay-per-cycle")).toHaveText("Repayments: about $668 a pay cycle across 6 lenders, including pay advances");
    await expect(page.getByText("About $1,060 left across Nimble and Cash Train together", { exact: false })).toBeVisible();
  });

  test("B9: Money plan shows Borrowing's balance estimates", async ({ page }) => {
    await page.goto("/money-plan?persona=jess&present=1");
    const repay = page.getByRole("region", { name: /Your repayments/ });
    await expect(repay).toContainText("About $2,140 (estimated)");
    await expect(repay).toContainText("About $1,060 with Cash Train, together (estimated)");
    await expect(repay).not.toContainText("can’t see what you still owe");
  });

  test("B10: Money plan's hardship button opens the letter, with a lender picker", async ({ page }) => {
    await page.goto("/money-plan?persona=jess&present=1");
    await page.getByRole("button", { name: "Ask a lender for hardship help" }).click();
    const dlg = page.getByRole("dialog", { name: "Ask a lender for hardship help" });
    await expect(dlg.getByRole("combobox")).toBeVisible();
    await expect(page).toHaveURL(/\/money-plan\?.*panel=letter/);
  });

  test("B11: no 'Set a buffer' while Today doesn't show a safe-to-spend figure (Jess); shown when it does (Marcus)", async ({ page }) => {
    await page.goto("/?persona=jess&present=1&state=none&panel=tight");
    await expect(page.getByRole("dialog", { name: "Options if money's tight" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Set a buffer" })).toHaveCount(0);
    await page.goto("/?persona=marcus&present=1&state=none&panel=tight");
    await expect(page.getByRole("dialog", { name: "Options if money's tight" }).getByRole("link", { name: "Set a buffer" })).toBeVisible();
  });

  test("review: Coming up's below-$0 link opens the same panel; its links go where they say; closed panels leave no dialog", async ({ page }) => {
    await page.goto("/?persona=jess&present=1&state=none");
    await page.getByRole("button", { name: /This takes you below \$0/ }).click();
    const dlg = page.getByRole("dialog", { name: "Options if money's tight" });
    await expect(dlg).toBeVisible();
    await expect(dlg).not.toContainText("see 5");
    await expect(dlg.getByRole("link", { name: /Compare on Energy Made Easy/ })).toHaveAttribute("href", "https://www.energymadeeasy.gov.au/");
    await expect(dlg.getByRole("link", { name: "See what’s due and when" })).toHaveAttribute("href", "/calendar?from=2026-09-26&to=2026-09-30");
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"], [aria-modal]')).toHaveCount(0);
  });

  test("review: one gambling comparison everywhere; SmartScore names pay cycles, not a third figure", async ({ page }) => {
    await page.goto("/?persona=jess&present=1&state=none");
    await expect(page.getByRole("region", { name: "Spending" }).getByRole("button", { name: /Gambling/ })).toContainText("since this point last cycle");
    await page.getByRole("region", { name: "Spending" }).getByRole("button", { name: /Gambling/ }).click();
    await expect(page.getByRole("dialog", { name: "Gambling" })).toContainText("↓ $100 since this point last cycle (Last pay cycle in full: $385)");
    await page.goto("/score?persona=jess&present=1");
    await expect(page.getByRole("button", { name: "See gambling", exact: true })).toBeVisible();
    await expect(page.locator("main")).not.toContainText("$285");
    await expect(page.locator("main")).toContainText("Gambling: $200 so far this pay cycle, $385 last pay cycle");
  });
});

test.describe("journeys at 390px with in-page controls only", () => {
  test.use({ viewport: phone });

  test("1. Today → Gambling → support → back to Today at the same place", async ({ page }) => {
    await page.goto("/?persona=jess&present=1&state=none");
    const row = page.getByRole("region", { name: "Spending" }).getByRole("button", { name: /Gambling/ });
    await row.scrollIntoViewIfNeeded();
    const y = await page.evaluate(() => window.scrollY);
    await row.click();
    const dlg = page.getByRole("dialog", { name: "Gambling" });
    await dlg.getByRole("link", { name: "See all gambling in Spending" }).click();
    await expect(page.getByTestId("gambling-support-strip")).toBeVisible();
    await back(page).click();
    await expect(page).toHaveURL(/localhost:3200\/\?/);
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 }).toBeGreaterThan(y - 40);
  });

  test("2. Money plan → Nimble → hardship letter pre-filled → close → still on Money plan", async ({ page }) => {
    await page.goto("/money-plan?persona=jess&present=1");
    await page.getByRole("button", { name: "Nimble" }).click();
    const lender = page.getByRole("dialog", { name: "Nimble" });
    await expect(lender).toContainText("$96 fortnightly");
    await expect(lender).toContainText("$96 on Sat 03/10");
    await lender.getByRole("button", { name: "Ask for hardship help" }).click();
    const letter = page.getByRole("dialog", { name: "Ask a lender for hardship help" });
    await expect(letter.getByRole("combobox")).toHaveValue("Nimble");
    await letter.getByRole("button", { name: /^Close/ }).click();
    await expect(letter).toBeHidden();
    await expect(page).toHaveURL(/\/money-plan\?/);
  });

  test("3. Today → Options if money's tight → smaller wins → All hardship support → back", async ({ page }) => {
    await page.goto("/?persona=jess&present=1&state=none");
    await page.getByRole("button", { name: "Options if money's tight" }).first().click();
    const dlg = page.getByRole("dialog", { name: "Options if money's tight" });
    for (const h of ["1. What's due before payday", "2. Smaller wins this pay cycle", "3. Pause or downgrade Tippla", "4. Ask a lender for hardship help"]) await expect(dlg.getByRole("heading", { name: h })).toBeVisible();
    await expect(dlg.getByRole("link", { name: /National Debt Helpline/ })).toHaveAttribute("href", "tel:1800007007");
    await dlg.getByRole("link", { name: "All hardship support" }).click();
    await expect(page).toHaveURL(/\/hardship\?/);
    await back(page).click();
    await expect(page).toHaveURL(/localhost:3200\/\?/);
  });

  test("4. Money plan → Plan the next pay cycle → calendar 01/10–14/10 → refresh → back to Money plan", async ({ page }) => {
    await page.goto("/money-plan?persona=jess&present=1");
    await page.getByRole("button", { name: "Plan the next pay cycle" }).click();
    await page.getByRole("dialog", { name: "Plan the next pay cycle" }).getByRole("link", { name: "Open the calendar" }).click();
    await expect(page.getByRole("region", { name: "Thu 01/10 – Wed 14/10" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("region", { name: "Thu 01/10 – Wed 14/10" })).toBeVisible();
    await expect(back(page)).toHaveText("Back to Money plan");
    await back(page).click();
    await expect(page).toHaveURL(/\/money-plan\?persona=jess&present=1$/);
  });

  test("5. SmartScore → gambling → panel → See all in Spending → back to SmartScore", async ({ page }) => {
    await page.goto("/score?persona=jess&present=1");
    await page.getByRole("button", { name: /^See gambling/ }).click();
    await page.getByRole("dialog", { name: "Gambling" }).getByRole("link", { name: "See all gambling in Spending" }).click();
    await expect(back(page)).toHaveText("Back to SmartScore");
    await back(page).click();
    await expect(page).toHaveURL(/\/score\?/);
  });
});

test("hardship mode stays off on the live build; the preview shows the prompt and pauses lender matching", async ({ page, context }) => {
  await page.goto("/?persona=jess&present=1&state=none");
  await expect(page.getByTestId("hardship-prompt")).toHaveCount(0);
  await withAccount(context, "jess", {});
  await page.goto("/?persona=jess&present=1&state=hardship_mode");
  const prompt = page.getByTestId("hardship-prompt");
  await expect(prompt).toBeVisible();
  await prompt.getByText("I'm finding things hard right now").click();
  await expect(page.getByRole("status").filter({ hasText: "lender matching are paused" })).toBeVisible();
  // Lender matching is paused in the member's consents, and they can turn it back on from here.
  await expect.poll(async () => JSON.parse(decodeURIComponent((await context.cookies()).find((c) => c.name === "tippla-account")!.value)).jess?.consents?.lender_matching?.granted).toBe(false);
  await page.goto("/hardship?persona=jess&present=1");
  await page.getByRole("button", { name: "Turn lender matching back on" }).click();
  await expect.poll(async () => JSON.parse(decodeURIComponent((await context.cookies()).find((c) => c.name === "tippla-account")!.value)).jess?.consents?.lender_matching?.granted).toBe(true);
});
