// Phase 2 acceptance: journey 1 (onboarding → score reveal) for Jess and Priya.
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

async function throughConnect(page: Page, persona: string) {
  await page.goto(`/onboarding?persona=${persona}`);
  await expect(page.getByRole("heading", { name: "Let's get you set up" })).toBeVisible();
  await expectNoAxe(page);

  // O1: validation after submit, plain language.
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("That mobile number needs 10 digits, starting with 04")).toBeVisible();
  await page.getByLabel("Email").fill("customer@example.com");
  await page.getByLabel("Mobile").fill("0412345678");
  await expect(page.getByLabel("Mobile")).toHaveValue("0412 345 678");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Create a password").fill("a long password");
  await page.getByRole("button", { name: "Continue" }).click();

  // O2: three separate, unticked consents; only the two required ones enable Continue.
  await expect(page.getByRole("heading", { name: "Your choices" })).toBeVisible();
  const ff = page.getByRole("checkbox", { name: "Share my Friendly Finance application with Tippla" });
  const bank = page.getByRole("checkbox", { name: "Let Tippla read my bank data through TaleFin" });
  const matching = page.getByRole("checkbox", { name: "Let Tippla show my profile to partner lenders when I might qualify" });
  for (const c of [ff, bank, matching]) await expect(c).not.toBeChecked();
  const cont = page.getByRole("button", { name: "Continue" });
  await expect(cont).toBeDisabled();
  await expect(page.getByText("Optional.", { exact: true })).toBeVisible();
  await expectNoAxe(page);
  // Expanders never tick anything.
  await page.getByRole("button", { name: "What this means" }).nth(2).click();
  await expect(page.getByText("Leave it unticked to use Tippla without lender matching.")).toBeVisible();
  await expect(matching).not.toBeChecked();
  await page.getByText("Share my Friendly Finance application with Tippla").click();
  await expect(cont).toBeDisabled();
  await page.getByText("Let Tippla read my bank data through TaleFin").click();
  await expect(cont).toBeEnabled();
  await cont.click();

  // Choices are recorded separately, with time and version; optional stays false.
  await page.waitForURL("**/onboarding/connect-bank");
  const rec = await page.evaluate(() => JSON.parse(sessionStorage.getItem("tippla-onboarding") ?? "{}").consents);
  expect(rec.ff_data_sharing).toMatchObject({ granted: true, version: "1.2" });
  expect(rec.talefin_bank_data).toMatchObject({ granted: true, version: "1.2" });
  expect(rec.lender_matching).toMatchObject({ granted: false, version: "1.2" });
  expect(Date.parse(rec.lender_matching.at)).not.toBeNaN();

  // O3: explainer → mock TaleFin (third party) → connected → other accounts?
  await page.getByRole("link", { name: "Connect with TaleFin" }).click();
  await expect(page.getByText("Demo screen.")).toBeVisible();
  await page.getByRole("button", { name: "Log in and share" }).click();
  await expect(page.getByText("Connected to CBA · Smart Access ••")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add another account" })).toBeVisible();
  await expectNoAxe(page);
}

test("journey 1 — Jess: onboarding to score reveal", async ({ page }) => {
  await throughConnect(page, "jess");
  await page.getByRole("button", { name: "That's all of them" }).click();
  await page.waitForURL("**/onboarding/analysing");
  await page.goto("/onboarding/analysing?fast=1");
  await expect(page.getByRole("listitem").filter({ hasText: "Reading 6 months of transactions" })).toBeVisible();
  await page.waitForURL("**/onboarding/score-reveal", { timeout: 15_000 });

  // O5: score, stage, path to next stage, biggest factor, one first action. No confetti, no congratulations.
  await expect(page.getByRole("heading", { name: "Your SmartScore is 472." })).toBeVisible();
  await expect(page.getByRole("meter", { name: "SmartScore" })).toHaveAttribute("aria-valuetext", "SmartScore 472. Steadying. 128 points to Healthy.");
  await expect(page.getByText("Biggest factor with room to move")).toBeVisible();
  await expect(page.getByRole("button", { name: /Current borrowing 2\.9 \/ 10 you have 3 loans open\./ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Skip the next pay advance if you can" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/congratulations|well done|great job/i);
  await expectNoAxe(page);

  await page.getByRole("button", { name: "See how" }).click();
  await expect(page.getByRole("dialog", { name: "Skip the next pay advance if you can" })).toContainText("Fewer pay advances is one of the ways to lift Current borrowing.");
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "See your dashboard" }).click();
  await page.waitForURL((u) => u.pathname === "/");
});

test("journey 1 — Priya: onboarding ends on the no-score reveal", async ({ page }) => {
  await throughConnect(page, "priya");
  await page.goto("/onboarding/analysing?fast=1");
  await page.waitForURL("**/onboarding/score-reveal", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Not enough history yet" })).toBeVisible();
  await expect(page.getByText("We expect to have enough history around 10/11/2026.")).toBeVisible();
  await expect(page.getByText("24/09 – 07/10")).toBeVisible();
  await expect(page.getByText("About $1,960")).toBeVisible();
  await expect(page.getByText("45 days")).toBeVisible();
  await expect(page.getByRole("meter")).toHaveCount(0); // no number, ring or zero
  await expectNoAxe(page);
});

test("onboarding has no tab bar; Hardship support is always reachable", async ({ page }) => {
  await page.goto("/onboarding/consents");
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await page.getByRole("link", { name: "Hardship support" }).click();
  await expect(page.getByRole("heading", { name: "Hardship support" })).toBeVisible();
});

test("presentation mode hides the persona pill", async ({ page }) => {
  await page.goto("/?persona=jess");
  await expect(page.getByRole("button", { name: /Dev · jess/i })).toBeVisible();
  await page.goto("/?present=1");
  await expect(page.getByRole("button", { name: /Dev ·/ })).toHaveCount(0);
  await page.goto("/?present=0");
});

test("onboarding screens: axe clean in dark mode too", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  for (const url of ["/onboarding/create-account", "/onboarding/consents", "/onboarding/connect-bank", "/onboarding/connect-bank/done?persona=jess", "/onboarding/score-reveal?persona=jess", "/onboarding/score-reveal?persona=priya"]) {
    await page.goto(url);
    await expectNoAxe(page);
  }
});
