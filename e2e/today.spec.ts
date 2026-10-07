// Phase 1 (loop): Today's status line, "Needs a look" feed with done / snooze / dismiss, section badges,
// score explanations, and the offers guardrail. Updated for the Today redesign (07/10/2026): rows with a ⋯ menu
// holding the actions, the tab bar (Today, Money, Ask, Score, More) and the hardship link in the hero.
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
const feedCards = (page: Page) => page.getByRole("region", { name: "Needs a look" }).getByRole("listitem");
/** Open a row's ⋯ menu and choose an action (Done, Snooze, Not relevant). */
async function rowAction(page: Page, title: RegExp, action: "Done" | "Snooze" | "Not relevant") {
  await page.getByRole("region", { name: "Needs a look" }).getByRole("button", { name: new RegExp(`^More actions: ${title.source}`) }).click();
  await page.getByRole("dialog").getByRole("button", { name: action, exact: true }).click();
}
const dock = (page: Page) => page.getByRole("navigation", { name: "Main" }).first();

test("Jess: status line, three ranked cards, section badges", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  await expect(page.getByText("Checked 32 new transactions this morning · 8 things to look at")).toBeVisible();
  await expect(feedCards(page)).toHaveCount(3);
  // Spec 01 ranking (urgency × 10 + log10(amount) × 5). The Beforepay repayment (Wed 30/09) is 5 days out,
  // so it isn't flagged until it's within 3 days (see the bill_due state).
  await expect(feedCards(page).nth(0)).toContainText("About $53 short before payday");
  await expect(feedCards(page).nth(1)).toContainText("Possible double charge: Amazon AU $10.73 twice on 24/09");
  await expect(feedCards(page).nth(2)).toContainText("You can pause your $9.99 Tippla payment");
  // Hardship is one tap away: in the hero next to the shortfall, and in the shortfall row's menu.
  await expect(page.getByRole("region", { name: "This pay cycle" }).getByRole("link", { name: "Options if money's tight" })).toHaveAttribute("href", "/hardship");
  await expect(dock(page).getByRole("link", { name: "Money 4 things to look at" })).toBeVisible();
  // Spec 03: short before payday, so "pause your Tippla payment" sits under Help; spec 06 adds the entitlements check.
  // Help and Borrowing live under More on phones.
  await expect(dock(page).getByRole("button", { name: "More 2 things to look at" })).toBeVisible();
  await expectNoAxe(page);
});

test("Done, with Undo; Not relevant sticks after a reload; badges follow", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  await rowAction(page, /About \$53 short/, "Done");
  await expect(page.getByRole("status").filter({ hasText: "Marked as done" })).toBeVisible();
  await expect(feedCards(page).nth(0)).toContainText("Possible double charge");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(feedCards(page).nth(0)).toContainText("About $53 short before payday");

  await page.getByRole("region", { name: "Needs a look" }).getByRole("button", { name: "See all" }).click();
  await expect(feedCards(page)).toHaveCount(8);
  await rowAction(page, /Possible double charge/, "Not relevant");
  await expect(page.getByRole("status").filter({ hasText: "Got it. We won't show this again unless it changes" })).toBeVisible();
  await expect(feedCards(page)).toHaveCount(7);
  await page.reload();
  await expect(page.getByText("7 things to look at")).toBeVisible();
  await expect(dock(page).getByRole("link", { name: "Money 3 things to look at" })).toBeVisible();
});

test("Snooze until tomorrow hides the card", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  await rowAction(page, /Possible double charge/, "Snooze");
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("button", { name: "Until payday (Thu 01/10)" })).toBeVisible();
  await sheet.getByRole("button", { name: "Until tomorrow" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Snoozed until Sat 26/09" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Needs a look" })).not.toContainText("Possible double charge");
});

test("score explanation on Today and /score", async ({ page }) => {
  // Phones: the compact SmartScore card says how much it moved; desktop also says what moved it (estimated).
  await page.goto("/?persona=jess&present=1");
  await expect(page.getByRole("link", { name: /Open SmartScore: SmartScore 472 out of 1,000, Steadying\. –17 since 11\/09/ })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await expect(page.getByText("New pay advance –9 · Gambling deposits –6 · Money left over –2")).toBeVisible();
  await page.goto("/score?persona=jess&present=1");
  const box = page.getByRole("region", { name: "What changed" });
  await expect(box).toContainText("Current borrowing 3.4 → 2.9");
  await expect(box).toContainText("New Beforepay pay advance (24/09)");
  await expect(box).toContainText("Estimate");
});

test("offers never appear on Today, even with lender matching on (Marcus)", async ({ page }) => {
  await page.goto("/?persona=marcus&present=1");
  await expect(page.getByRole("main")).not.toContainText(/offer|Harbour Lending/i);
  await expect(feedCards(page)).toHaveCount(1);
  await expect(feedCards(page).nth(0)).toContainText("Your SmartScore went up 11 points");
  await page.goto("/notifications?persona=marcus&present=1");
  await expect(page.getByRole("main")).not.toContainText(/offer|lender/i);
});

test("Priya: a repayment within 3 days; empty state copy when everything's dealt with", async ({ page }) => {
  await page.goto("/?persona=priya&present=1");
  await expect(feedCards(page)).toHaveCount(1);
  await expect(feedCards(page).nth(0)).toContainText("Afterpay $28 comes out Mon 28/09");
  await rowAction(page, /Afterpay/, "Done");
  // Spec 01: the empty state says what Tippla checked; the status line says all caught up.
  await expect(page.getByText(/^Nothing needs a look right now\. (Checked|Read) \d+/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/^All caught up · next payday /)).toBeVisible();
});

for (const persona of ["jess", "marcus", "priya"]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`axe: Today and Score, ${persona}, ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const url of ["/", "/score"]) {
        await page.goto(`${url}?persona=${persona}&present=1`);
        await expectNoAxe(page);
      }
    });
  }
}
