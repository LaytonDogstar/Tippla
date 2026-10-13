// Your money plan (12/10/2026): the /savings redirect, Jess's 03/09–16/09 figures, nav placement, the plan card's
// sheet and calendar range, smaller wins saved per pay cycle, and the gambling card hidden by the member's setting.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoAxe(page: Page) {
  const r = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const s = r.violations.map((v) => `${page.url()} ${v.id}: ${v.nodes[0]?.target.join(" ")} — ${v.help}`);
  expect(s, s.join("\n")).toEqual([]);
}

test("/savings redirects to the money plan, keeping the query", async ({ page }) => {
  await page.goto("/savings?persona=marcus&present=1");
  await expect(page).toHaveURL(/\/money-plan\?persona=marcus&present=1$/);
  await expect(page.getByRole("heading", { level: 1, name: "Your money plan" })).toBeVisible();
});

test("Jess: where the money went, the plan, repayments, gambling, progress and wins", async ({ page }) => {
  await page.goto("/money-plan?persona=jess&present=1");
  await expect(page.getByText("Built from your last full pay cycle, Thu 03/09 – Wed 16/09. These are options, not rules.")).toBeVisible();
  const went = page.getByRole("region", { name: "Last pay cycle You spent $238 more than you were paid" });
  await expect(went).toContainText("Paid$2,167Spent$2,405Difference−$238");
  // 111 squares: 100 for the pay, 11 past "Your pay ran out here".
  const waffle = went.getByTestId("waffle");
  await expect(waffle).toHaveAttribute("aria-label", "Where your pay went: Rent 38%, Everyday spending 20%, Bills, subscriptions & fees 4%, Gambling 18%, Loans & buy now, pay later 17%, Beforepay repayment 15%. 111% of pay in total.");
  await expect(waffle.locator("span.aspect-square")).toHaveCount(111);
  await expect(went.getByText("Your pay ran out here")).toBeVisible();
  await expect(went.getByTestId("debt-share")).toHaveText("Debt, pay advances and gambling took about half your pay, $1,075 in total.");
  for (const [k, v] of <[string, string][]>[["Rent", "$82038% of pay"], ["Everyday spending", "Food, groceries, transport$43220% of pay"], ["Gambling", "$38518% of pay"], ["Loans & buy now, pay later", "5 lenders$37517% of pay"], ["Beforepay repayment", "Includes a $15 fee$31515% of pay"], ["Bills, subscriptions & fees", "$784% of pay"]]) {
    await expect(went.getByRole("button", { name: new RegExp(`^${k.replace(/[&,]/g, ".")}`) })).toContainText(v);
  }
  await expect(went).toContainText("Essentials$1,33061% of pay");
  await expect(went).toContainText("Debt & gambling$1,07550% of pay");
  await expect(went).toContainText("The $238 gap was covered by a $300 Beforepay advance on 10/09.");
  // Tapping a row pins its squares; tapping again lets go. The card uses no red or warning colours.
  const gamb = went.getByRole("button", { name: /^Gambling/ });
  await gamb.click();
  await expect(gamb).toHaveAttribute("aria-pressed", "true");
  await expect(waffle.locator("span.aspect-square.opacity-\\[\\.18\\]")).toHaveCount(111 - 18);
  await gamb.click();
  await expect(gamb).toHaveAttribute("aria-pressed", "false");
  await expect(went.locator(".text-negative, .bg-negative-soft, .text-caution, .bg-caution-soft")).toHaveCount(0);

  const plan = page.getByRole("region", { name: "Get off pay advances" });
  await expect(plan).toContainText("you’d need to free up $90–$240");
  await expect(plan.getByRole("link", { name: "See it on the calendar" })).toHaveAttribute("href", "/calendar?from=2026-09-17&to=2026-09-30");
  await plan.getByRole("button", { name: "Plan the next pay cycle" }).click();
  const sheet = page.getByRole("dialog", { name: "Plan the next pay cycle" });
  await expect(sheet).toContainText("Thu 01/10 – Wed 14/10");
  await expect(sheet).toContainText("Your goal this pay cycle: a pay cycle with pay advances of $150 or less.");
  await page.keyboard.press("Escape");

  const repay = page.getByRole("region", { name: "Your repayments: about $668 a pay cycle" });
  await expect(repay.getByRole("row")).toHaveCount(7);
  await expect(repay.getByRole("row", { name: /Zip Pay/ })).toContainText("monthly, $40 a month");
  await expect(repay.getByRole("link", { name: /National Debt Helpline/ })).toHaveAttribute("href", "tel:1800007007");
  await expect(repay).not.toContainText(/offer|apply|consolidat/i);

  const g = page.getByRole("region", { name: "$385 on betting last pay cycle" });
  await expect(g).toContainText("That’s 18% of your pay, across Ladbrokes, Sportsbet and TAB. So far this pay cycle it’s $200.");
  await expect(g).not.toContainText(/score/i);

  const prog = page.getByRole("region", { name: "Pay cycles" });
  await expect(prog.getByRole("row", { name: /Lowest balance/ })).toContainText("−$483↑ $154 · forecast with usual spending");
  await expect(prog.getByRole("row", { name: /Gambling/ })).toContainText("$200↓ $100 since this point last cycle"); // as Today and the panel
  await expect(prog.getByRole("row", { name: /Pay advances/ })).toContainText("Same as this point last cycle");
  await expect(prog.getByRole("link", { name: "See every pay cycle" })).toHaveAttribute("href", "/progress");
  await expect(page.getByText("General information only. It doesn’t take your full situation into account.", { exact: false })).toBeVisible();
  await expect(page.getByText(/Pay by card|lenders can.t see cash/i)).toHaveCount(0);
  await expectNoAxe(page);
});

test("smaller wins: ticks are kept for the pay cycle, and the list folds away", async ({ page }) => {
  await page.goto("/money-plan?persona=jess&present=1");
  await page.evaluate(() => localStorage.removeItem("tippla-recs"));
  await page.reload();
  const wins = page.getByRole("region", { name: "Smaller wins" });
  await expect(wins).toContainText("Worth about $36 a pay cycle together");
  await wins.getByLabel("Drop a streaming service or two").check();
  await expect(wins).toContainText("1 of 4 done");
  await page.reload();
  await expect(page.getByRole("region", { name: "Smaller wins" }).getByLabel("Drop a streaming service or two")).toBeChecked();
  await page.getByRole("region", { name: "Smaller wins" }).getByRole("button", { name: "Hide" }).click();
  await expect(page.getByLabel("Drop a streaming service or two")).toBeHidden();
});

test("nav: Money plan sits under Money, above Calendar; the calendar opens on the linked range", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/money-plan?persona=jess&present=1");
  const nav = page.getByRole("navigation", { name: "Main" }).first();
  const links = await nav.getByRole("link").allTextContents();
  expect(links.indexOf("Money plan")).toBeGreaterThan(-1);
  expect(links.indexOf("Money plan")).toBeLessThan(links.indexOf("Calendar"));
  await expect(nav.getByRole("link", { name: "Money plan" })).toHaveAttribute("aria-current", "page");
  await page.goto("/calendar?persona=jess&present=1&from=2026-09-17&to=2026-09-30");
  await expect(page.getByRole("region", { name: "Thu 17/09 – Wed 30/09" })).toBeVisible();
});

test("the gambling card follows the member's gambling setting", async ({ page, context }) => {
  await context.addCookies([{ name: "tippla-account", value: encodeURIComponent(JSON.stringify({ jess: { hideGambling: true } })), url: "http://localhost:3200" }]);
  await page.goto("/money-plan?persona=jess&present=1");
  await expect(page.getByRole("region", { name: /on betting last pay cycle/ })).toHaveCount(0);
});

test("pay cycle card, money left (Marcus): no 'ran out' divider, the unspent pay as empty squares, no advance footnote", async ({ page }) => {
  await page.goto("/money-plan?persona=marcus&present=1");
  const went = page.getByRole("region", { name: /^Last pay cycle You had \$[\d,]+ left over$/ });
  await expect(went.getByText("Your pay ran out here")).toHaveCount(0);
  const waffle = went.getByTestId("waffle");
  await expect(waffle.locator("span.aspect-square")).toHaveCount(100); // spent squares plus the empty track
  await expect(went).not.toContainText("gap was covered");
  await expect(went).toContainText(/Difference\+\$/);
});

for (const width of [360, 1440]) {
  test(`pay cycle card: no sideways scroll at ${width}px, axe clean (light and dark)`, async ({ browser }) => {
    for (const colorScheme of ["light", "dark"] as const) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme });
      const page = await ctx.newPage();
      await page.goto("/money-plan?persona=jess&present=1");
      await expect(page.getByTestId("waffle")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      await expectNoAxe(page);
      await ctx.close();
    }
  });
}
