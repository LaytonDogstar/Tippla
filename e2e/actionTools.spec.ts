// Spec 06: hardship letter (pre-filled, copy, follow-up), cancellation helper usage check, bill comparison
// pointers, and the entitlements check (official links only).
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

test("acceptance: Jess's hardship letter to Beforepay is pre-filled with $315 due 30/09", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/hardship?persona=jess&present=1");
  await page.getByRole("button", { name: "Write my letter" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByLabel("Lender", { exact: true })).toHaveValue("Beforepay");
  await expect(sheet.getByLabel("Repayment ($)", { exact: true })).toHaveValue("315");
  await expect(sheet.getByLabel("Due date", { exact: true })).toHaveValue("2026-09-30");
  await expect(sheet.getByLabel("Your name", { exact: true })).toHaveValue("Jess Taylor");
  await expectNoAxe(page);
  await sheet.getByRole("button", { name: "Next" }).click();
  await sheet.getByRole("button", { name: "My hours were cut" }).click();
  await expect(sheet.getByRole("button", { name: "My hours were cut" })).toHaveAttribute("aria-pressed", "true");
  await sheet.getByRole("button", { name: "Next" }).click();
  const letter = sheet.getByLabel("Your letter (you can edit it)");
  await expect(letter).toHaveValue(/including the \$315 due on Wed 30\/09/);
  await expect(letter).toHaveValue(/My working hours have been cut\./);
  await expect(sheet.getByText("Tippla never sends this for you.", { exact: false })).toBeVisible();
  await expect(sheet.getByRole("link", { name: "Open in email" })).toHaveAttribute("href", /^mailto:support%40beforepay\.com\.au\?subject=Hardship%20request%3A%20Beforepay%20repayment&body=Hi%20Beforepay/);
  await expectNoAxe(page);
  await sheet.getByRole("button", { name: "Copy", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^Hi Beforepay,/);
  // PDF download.
  const [download] = await Promise.all([page.waitForEvent("download"), sheet.getByRole("button", { name: "Download PDF" }).click()]);
  expect(download.suggestedFilename()).toBe("hardship-letter.pdf");
});

test("follow-up next pay cycle: 'Did you hear back?', and the helpline if they said no", async ({ page, context }) => {
  await context.addCookies([{ name: "tippla-account", value: encodeURIComponent(JSON.stringify({ jess: { hardshipLetters: [{ lender: "Beforepay", at: "2026-09-25", output: "copy" }] } })), url: "http://localhost:3200" }]);
  await page.goto("/hardship?persona=jess&present=1&state=payday&followup=Beforepay");
  const sheet = page.getByRole("dialog", { name: "Did you hear back from Beforepay?" });
  await sheet.getByRole("button", { name: "Yes, they said no" }).click();
  await expect(sheet.getByRole("link", { name: "Call 1800 007 007" })).toHaveAttribute("href", "tel:1800007007");
  await expectNoAxe(page);
});

test("cancellation helper: 'Still using Netflix?' No leads to Could save and how to cancel; iCloud has its own steps", async ({ page }) => {
  await page.goto("/subscriptions?persona=jess&present=1");
  await page.getByRole("region", { name: "Quick check" }).getByRole("button", { name: "No, I don't use it" }).click();
  const save = page.getByRole("region", { name: "Could save" });
  await expect(save).toContainText("$227.88");
  await expect(save).toContainText("Cancel before Sat 03/10 to skip the next $18.99 charge");
  // Keyboard: the "marked as not using" message and the tab bar sit over the bottom of the page.
  await save.getByRole("button", { name: /^How to cancel\s*: Netflix$/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "How to cancel Netflix" })).toBeVisible();
  await page.keyboard.press("Escape");
  const coming = page.getByRole("region", { name: "Coming up" });
  await coming.getByRole("button", { name: /^Apple iCloud/ }).click();
  await coming.getByRole("button", { name: "How to cancel" }).click();
  await expect(page.getByRole("dialog", { name: "How to cancel Apple iCloud" })).toContainText("iCloud storage is billed by Apple");
});

test("bill comparison (money plan's smaller wins): neutral pointers only", async ({ page }) => {
  await page.goto("/money-plan?persona=jess&present=1");
  const section = page.getByRole("region", { name: "Smaller wins" });
  await expect(section.getByRole("link", { name: /Compare on Energy Made Easy/ })).toHaveAttribute("href", "https://www.energymadeeasy.gov.au/");
  await section.getByRole("button", { name: "Ways to pay less" }).click();
  await expect(page.getByRole("dialog", { name: "Paying less for Telstra" })).toContainText("General information only");
  await page.keyboard.press("Escape");
  await expectNoAxe(page);
});

test("acceptance: the entitlements check links only to official sources", async ({ page }) => {
  await page.goto("/help/entitlements?persona=jess&present=1");
  await page.getByRole("button", { name: "Yes" }).nth(2).click(); // Do you rent? (third yes/no question)
  await page.getByRole("button", { name: "See pointers" }).click();
  const results = page.getByRole("region", { name: "Places to check" });
  await expect(results.getByRole("heading", { name: "No-interest loans (NILS)" })).toBeVisible();
  const hrefs = await results.getByRole("link").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
  expect(hrefs.length).toBeGreaterThan(2);
  for (const h of hrefs) expect(new URL(h).hostname).toMatch(/(\.gov\.au|goodshep\.org\.au)$/);
  await expectNoAxe(page);
});
