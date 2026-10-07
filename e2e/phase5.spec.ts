// Phase 5 acceptance: consent withdrawal hides Offers immediately; cancel the subscription in one tap +
// confirm; Hardship support always visible in the nav. Plus calculator, offers, help, notifications, axe.
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

test("withdrawing lender matching hides Offers immediately (Marcus), and Undo brings them back", async ({ page }) => {
  await page.goto("/offers?persona=marcus&present=1");
  await expect(page.getByRole("heading", { name: "Harbour Lending" })).toBeVisible();
  await page.goto("/?persona=marcus&present=1");
  await expect(page.getByRole("link", { name: /new offer/ })).toHaveCount(0); // offers never appear on Today

  await page.goto("/account/consents?persona=marcus&present=1");
  const matching = page.getByRole("region", { name: /partner lenders/ });
  await matching.getByText("On", { exact: true }).click();
  await expect(matching.getByRole("status")).toHaveText("Lender matching is paused. Lenders won't see your profile.");

  // Today redesign: Borrowing sits under More on phones.
  await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: /^More/ }).click();
  await page.getByRole("dialog", { name: "More" }).getByRole("link", { name: "Loans & credit" }).click();
  await page.getByRole("link", { name: /^Offers from partner lenders/ }).click();
  await expect(page.getByRole("heading", { name: "Lender matching is off" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Harbour Lending" })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /^Today/ }).first().click();
  await expect(page.getByRole("link", { name: /new offer/ })).toHaveCount(0);

  await page.goto("/account/consents?persona=marcus&present=1");
  await page.getByRole("region", { name: /partner lenders/ }).getByText("Off", { exact: true }).click();
  await page.goto("/offers?persona=marcus&present=1");
  await expect(page.getByRole("heading", { name: "Harbour Lending" })).toBeVisible();
});

test("cancel the subscription in one tap plus one confirmation, no retention screens", async ({ page }) => {
  await page.goto("/account/subscription?persona=jess&present=1");
  await page.getByRole("button", { name: "Cancel subscription" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Cancel your subscription?" })).toBeVisible();
  await expect(sheet.getByText("You won't be charged again. You can keep using Tippla until Mon 28/09.")).toBeVisible();
  await expectNoAxe(page);
  await sheet.getByRole("button", { name: "Yes, cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Cancelled. You can use Tippla until Mon 28/09, and you won't be charged again.")).toBeVisible();
  await page.getByRole("button", { name: "Keep my subscription" }).click();
  await expect(page.getByText("Next charge $11.32 on Fri 02/10 (the day after your payday)")).toBeVisible(); // spec 03: after payday
});

test("Pause instead is the single optional alternative, with its effect shown before confirming", async ({ page }) => {
  await page.goto("/account/subscription?persona=jess&present=1");
  await page.getByRole("button", { name: "Cancel subscription" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Pause instead" }).click();
  await expect(page.getByRole("dialog").getByText(/skipped and billing resumes on Fri 30\/10/)).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("Paused. Billing resumes on Fri 30/10.")).toBeVisible();
});

const ROUTES = ["/", "/score", "/savings", "/spending", "/calendar", "/subscriptions", "/loans", "/loans/repayment", "/offers", "/help", "/hardship", "/notifications", "/account", "/account/profile", "/account/subscription", "/account/consents", "/account/bank", "/spending/compare"];

test("Hardship support is always reachable: one tap from Today and the desktop rail, two taps from anywhere on phones", async ({ page, browser }) => {
  // Today redesign (07/10/2026): phones have Hardship help as a quick action on Today and under More everywhere.
  await page.goto("/?persona=jess&present=1");
  // The fifth tile sits at the screen edge of the quick-actions row (the hint that it scrolls); still one tap.
  await expect(page.getByRole("navigation", { name: "Quick actions" })).toBeInViewport();
  await expect(page.getByRole("navigation", { name: "Quick actions" }).getByRole("link", { name: "Hardship help" })).toHaveAttribute("href", "/hardship");
  for (const r of ROUTES) {
    await page.goto(`${r}?persona=jess&present=1`);
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: /^More/ }), r).toBeInViewport();
  }
  await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: /^More/ }).click();
  await expect(page.getByRole("dialog", { name: "More" }).getByRole("link", { name: "Hardship support" })).toHaveAttribute("href", "/hardship");
  const desk = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  for (const r of ["/", "/loans", "/account/profile"]) {
    await desk.goto(`http://localhost:3200${r}?persona=jess&present=1`);
    await expect(desk.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /^Help & hardship/ }), r).toBeInViewport();
  }
  await desk.close();
});

test("early repayment calculator: extra per pay cycle pays off sooner, based on the details entered", async ({ page }) => {
  await page.goto("/loans/repayment?persona=jess&present=1&loan=Right%20Road%20Finance");
  await page.getByLabel("Interest rate (% a year)").fill("24");
  await page.getByLabel("Extra each pay cycle").fill("60");
  await expect(page.getByText(/^Paid off about \d+ weeks sooner$/)).toBeVisible();
  await expect(page.getByText(/^About \$\d+ less in interest and fees$/)).toBeVisible();
  await expect(page.getByText("Based on the details you entered.")).toBeVisible();
  await expectNoAxe(page);
});

test("offers: Not interested hides one offer, with Undo; matching stays on", async ({ page }) => {
  await page.goto("/offers?persona=marcus&present=1");
  await page.getByRole("button", { name: "View details" }).click();
  await expect(page.getByRole("dialog").getByText(/Nothing is sent to the lender/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Not interested" }).click();
  await expect(page.getByRole("heading", { name: "Harbour Lending" })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("heading", { name: "Harbour Lending" })).toBeVisible();
});

test("hardship: template is editable and copies; counselling has a real phone link", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/hardship?persona=jess&present=1");
  // Spec 06: the template became a pre-filled letter; the end result is still editable and copies.
  await page.getByRole("button", { name: "Write my letter" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Next" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Next" }).click();
  const box = page.getByLabel("Your letter (you can edit it)");
  await box.fill("Hi Nimble, I'd like to ask about a hardship arrangement.");
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Letter copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Hi Nimble, I'd like to ask about a hardship arrangement.");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "See ways to get in touch" }).click();
  await expect(page.getByRole("link", { name: "Call 1800 007 007" })).toHaveAttribute("href", "tel:1800007007");
});

test("help: search first, plain empty state", async ({ page }) => {
  await page.goto("/help?persona=jess&present=1");
  await page.getByRole("searchbox", { name: "Search help" }).fill("declined");
  await expect(page.getByRole("main").getByRole("status")).toHaveText("1 answer");
  await page.getByRole("button", { name: "Why was I declined?" }).click();
  await expect(page.getByText(/Friendly Finance makes its own decision/)).toBeVisible();
  await page.getByRole("searchbox").fill("zzzz");
  await expect(page.getByText('No answers match "zzzz". Try another word, or contact us.')).toBeVisible();
});

test("notifications: mark all as read clears the bell badge", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  await expect(page.getByRole("link", { name: /^Notifications, \d+ unread/ })).toBeVisible();
  await page.getByRole("link", { name: /^Notifications/ }).click();
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page.getByRole("button", { name: "Mark all as read" })).toHaveCount(0);
  await page.goto("/?persona=jess&present=1");
  await expect(page.getByRole("link", { name: "Notifications", exact: true })).toBeVisible();
});

test("bank disconnect shows on Home, reconnect clears it", async ({ page }) => {
  await page.goto("/account/bank?persona=jess&present=1");
  await page.getByRole("button", { name: "Disconnect" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Disconnect", exact: true }).click();
  await page.goto("/?persona=jess&present=1");
  await expect(page.getByRole("link", { name: /You've disconnected your bank/ })).toBeVisible();
  await page.goto("/account/bank?persona=jess&present=1");
  await page.getByRole("button", { name: "Reconnect" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Continue" }).click();
  await page.goto("/?persona=jess&present=1");
  await expect(page.getByRole("link", { name: /disconnected your bank/ })).toHaveCount(0);
});

const SCREENS = ["/loans", "/loans?tab=upcoming", "/loans?tab=history", "/loans?tab=other", "/loans/repayment", "/offers", "/hardship", "/help", "/notifications", "/account", "/account/profile", "/account/subscription", "/account/consents", "/account/bank"];
for (const persona of ["jess", "marcus", "priya"]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`axe: Phase 5 screens, ${persona}, ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const url of SCREENS) {
        await page.goto(`${url}${url.includes("?") ? "&" : "?"}persona=${persona}&present=1`);
        await page.waitForLoadState("networkidle");
        await expectNoAxe(page);
      }
    });
  }
}
