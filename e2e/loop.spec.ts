// Phase 2 (loop): safe to spend, payday check-in and recap, score projection, value tally (with the actions
// that feed it), and event-driven notifications with a daily cap and weekly digest.
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
const region = (page: Page, name: string | RegExp) => page.getByRole("region", { name });

test("safe to spend: short or nothing spare before payday, with the working and hardship options", async ({ page }) => {
  // Today redesign: safe to spend lives in the hero. Jess is short (the hardship options sit next to it) ...
  await page.goto("/?persona=jess&present=1&state=none");
  const hero = region(page, "This pay cycle");
  await expect(hero).toContainText("Short before payday");
  await expect(hero.getByRole("link", { name: "Options if money's tight" })).toHaveAttribute("href", "/hardship");
  // ... and Marcus with a tight cycle has nothing spare, with the working one tap away.
  await page.goto("/?persona=marcus&present=1&state=tight");
  await expect(hero).toContainText("left after bills, with nothing spare before payday");
  await hero.getByRole("button", { name: "How we worked this out" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Forecast balance on Tue 06/10")).toBeVisible();
  await expect(sheet.getByText("Kept aside as a buffer")).toBeVisible();
  await expect(sheet.getByText("÷ 12 days")).toBeVisible();
  await page.keyboard.press("Escape");
  await expectNoAxe(page);
  await page.goto("/?persona=marcus&present=1&state=none");
});

test("payday: check-in and recap replace the snapshot; no offers, nothing about gambling", async ({ page }) => {
  await page.goto("/?persona=jess&present=1&state=payday");
  await expect(page.getByText(/Checked \d+ new transactions this morning/)).toBeVisible();
  const checkIn = region(page, "Payday check-in");
  await expect(checkIn).toContainText("$2,305.49 from Harbourside Hospitality Pty landed this morning");
  await expect(checkIn).toContainText("Safe to spend: about $28 a day");
  await expect(checkIn).toContainText("No pay advance to repay this pay cycle.");
  const recap = region(page, "Your last pay cycle");
  await expect(recap).toContainText("17/09 – 30/09");
  await expect(recap).toContainText("You took 1 pay advance ($300).");
  await expect(recap).toContainText("SmartScore 489 → 472.");
  // Spec 07: no current streak, so the recap leads with her best-ever one; never "broke" or "ended".
  await expect(recap).toContainText("Your best is 10 pay cycles in a row without a new pay advance.");
  await expect(recap).not.toContainText(/broke|ended|lost|reset/i);
  for (const r of [checkIn, recap]) await expect(r).not.toContainText(/offer|lender|gambl|alcohol/i);
  await expect(page.getByRole("main")).not.toContainText(/offer|lender/i);
  await checkIn.getByRole("button", { name: "How we worked this out" }).click();
  await expect(page.getByRole("dialog").getByText("÷ 14 days")).toBeVisible();
  await page.keyboard.press("Escape");
  await expectNoAxe(page);
});

test("payday recap celebrates a positive streak (Marcus)", async ({ page }) => {
  await page.goto("/?persona=marcus&present=1&state=payday");
  await expect(region(page, "Your last pay cycle")).toContainText("You got through without a new pay advance. That's 13 pay cycles in a row.");
});

test("score projection on /score is an estimate (Jess), and absent without a score (Priya)", async ({ page }) => {
  await page.goto("/score?persona=jess&present=1");
  const box = region(page, "If you act on your next step");
  await expect(box).toContainText("Skip the next pay advance: about 490 by 23/10");
  await expect(box).toContainText("Estimate");
  await expect(box.getByText(/Sample logic/)).toHaveCount(0);
  await page.goto("/score?persona=jess&present=0");
  await expect(region(page, "If you act on your next step").getByText("Sample logic · Q3")).toBeVisible();
  await page.goto("/score?persona=priya&present=1");
  await expect(region(page, "If you act on your next step")).toHaveCount(0);
});

test("value tally: actions in the app are pending, then confirmed from bank data at payday", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  await expect(region(page, "Tippla has helped you save")).toHaveCount(0); // nothing done yet

  // 1. "I'll try this" on the pay-advance next step.
  await page.getByRole("button", { name: /^See how: Skip the next pay advance/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "I'll try this" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Noted. We'll show you how it goes at payday" })).toBeVisible();
  await expect(page.getByRole("dialog").getByText("You're trying this.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(region(page, "Tippla has helped you save")).toContainText("we'll confirm after payday 01/10");

  // 2. "I've cancelled it" for Binge.
  await page.goto("/subscriptions?persona=jess&present=1");
  await page.getByRole("button", { name: "More options for Binge" }).click();
  await page.getByRole("dialog", { name: "Binge" }).getByRole("button", { name: "How to cancel" }).click();
  await page.getByRole("dialog", { name: "How to cancel Binge" }).getByRole("button", { name: "I've cancelled it" }).click();
  await expect(page.getByRole("dialog").getByText("Marked as cancelled. We'll confirm after 11/10.")).toBeVisible();

  // 3. On Tue 29/09 (spec 01: flagged within 3 days), Done on the "Beforepay bigger than your balance" card.
  await page.goto("/?persona=jess&present=1&state=bill_due");
  await region(page, "Needs a look").getByRole("button", { name: /^More actions: Beforepay \$315/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Marked as done" })).toBeVisible();

  // Payday: the Beforepay repayment went through without a failed-payment fee.
  await page.goto("/?persona=jess&present=1&state=payday");
  const tally = region(page, "Tippla has helped you save");
  // Spec 02: counted conservatively, at 50% of her usual $15 fee.
  await expect(tally).toContainText("$7.50");
  await expect(region(page, "Your last pay cycle")).toContainText("$7.50 in fees avoided.");
  await tally.getByRole("button", { name: "What we've counted" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toContainText("Beforepay went through on 30/09 with no failed-payment fee");
  await expect(sheet).toContainText("Binge cancellation: we'll confirm after 11/10");
  await expect(sheet).toContainText("Skipping the next advance: we'll confirm after payday 15/10");
  await expectNoAxe(page);
});

test("notifications: events only; one urgent alert a day; pause, quiet hours and weekly digest from settings (spec 10)", async ({ page }) => {
  await page.goto("/notifications?persona=jess&present=1&state=bill_due");
  const main = page.getByRole("main");
  await expect(main.getByText("Beforepay $315 is due tomorrow")).toBeVisible();
  await expect(main).not.toContainText(/refreshed|went through|offer|lender|gambl/i);
  // 29/09: the shortfall goes to the phone; the bill alert is the second urgent one that day, so it waits here.
  await expect(main.getByRole("link", { name: /Heads up/ })).toContainText("Sent to your phone");
  await expect(main.getByRole("link", { name: /Beforepay \$315 is due tomorrow/ })).toContainText("Kept here (you'd reached your daily limit)");

  // Pause everything: nothing goes out, all still listed here.
  await page.goto("/account/profile?persona=jess&present=1&state=none");
  await expect(page.getByText("At most one notification a day, plus one urgent money alert, and three a week.", { exact: false })).toBeVisible();
  await page.getByText("Pause all notifications").click();
  await expect(page.getByRole("status").filter({ hasText: "Notification settings saved" })).toBeVisible();
  await page.goto("/notifications?persona=jess&present=1");
  await expect(page.getByRole("main").getByText("Kept here (notifications are paused)").first()).toBeVisible();

  // Unpause; weekly digest: score updates move to the summary instead.
  await page.goto("/account/profile?persona=jess&present=1");
  await page.getByText("Pause all notifications").click();
  await page.getByText("Weekly summary for SmartScore updates").click();
  await page.getByLabel("From").selectOption("22:00");
  await expectNoAxe(page);
  await page.goto("/notifications?persona=jess&present=1");
  await expect(page.getByRole("main").getByText("In your weekly summary").first()).toBeVisible();
  await expect(page.getByRole("main").getByText("Kept here (notifications are paused)")).toHaveCount(0);
  await page.goto("/account/profile?persona=jess&present=1");
  await expect(page.getByLabel("From")).toHaveValue("22:00");
  await expect(page.getByLabel("Show amounts and names on my lock screen")).not.toBeChecked();
});

test("first payday after onboarding: the check-in says so and shows the goal; the recap leads with it (spec 04)", async ({ page, context }) => {
  await context.addCookies([{ name: "tippla-account", value: encodeURIComponent(JSON.stringify({ jess: { focusGoal: { type: "reach_payday", startedAt: "2026-09-25" }, onboardedAt: "2026-09-25" } })), url: "http://localhost:3200" }]);
  await page.goto("/?persona=jess&present=1&state=payday");
  const checkIn = region(page, "Payday check-in");
  await expect(checkIn).toContainText("Your first payday with Tippla. Here's your pay cycle, with your goal in view.");
  await expect(checkIn).toContainText("Your goal: Get to payday without running short");
  await expect(region(page, "Your last pay cycle").getByRole("listitem").first()).toHaveText("The day before payday you were $680 under.");
  await expectNoAxe(page);
});
