// Spec 08 "Ask Tippla" (scripted mode in tests: no API key, deterministic answers from the same tools).
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

test("acceptance: from Today, 'Can I afford $80 on Saturday?' → about $53 short becomes about $133, with options", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  await page.getByRole("navigation", { name: "Quick actions" }).getByRole("link", { name: "Ask Tippla" }).click();
  await expect(page.getByRole("heading", { name: "Ask Tippla" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Can I afford $50 on Saturday?" })).toBeVisible(); // suggested from the feed
  await expectNoAxe(page);
  await page.getByLabel("Your question").fill("Can I afford $80 on Saturday?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText("Probably not without running short. You're forecast to be about $53 short before payday on 01/10, and $80 would make that about $133. Here are some options.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Options if money's tight" })).toHaveAttribute("href", "/hardship");
  await page.getByRole("button", { name: "Yes: Was this helpful?" }).click();
  await expect(page.getByText("Thanks for letting us know")).toBeVisible();
  await expectNoAxe(page);
});

test("borrowing: no recommendation, the member's own figures and options; distress leads with support", async ({ page }) => {
  await page.goto("/assistant?persona=jess&present=1");
  await page.getByLabel("Your question").fill("Which lender should I use?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText("I can't recommend loans, lenders or whether to borrow.", { exact: false })).toBeVisible();
  await expect(page.getByText("Your Beforepay advances cost about $15 each in fees.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Your Borrowing page" })).toHaveAttribute("href", "/loans");
  await page.getByLabel("Your question").fill("I can't cope anymore");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText("It sounds like things are really hard right now.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call the National Debt Helpline" })).toHaveAttribute("href", "tel:1800007007");
});

test("contextual: 'Ask about this' on the score page asks straight away", async ({ page }) => {
  await page.goto("/score?persona=jess&present=1");
  await page.getByRole("link", { name: /Ask about this: Why did my score change\?/ }).click();
  await expect(page.getByText("Your SmartScore is 472, in the Steadying stage. It's down 17 since 11/09.", { exact: false })).toBeVisible();
});
