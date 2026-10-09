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
  // Spec 04: one-sentence welcome first.
  await page.goto(`/onboarding?persona=${persona}`);
  await expect(page.getByRole("heading", { name: "Welcome to Tippla" })).toBeVisible();
  await expect(page.getByText("We'll tell you what's coming, what needs a look, and how to get ahead, every pay cycle.")).toBeVisible();
  await expectNoAxe(page);
  await page.getByRole("link", { name: "Get started" }).click();
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

test("journey 1 — Jess: onboarding to score reveal, then her goal (spec 04: shortfall aha → score → goal → Home)", async ({ page }) => {
  await throughConnect(page, "jess");
  await page.getByRole("button", { name: "That's all of them" }).click();
  await page.waitForURL("**/onboarding/analysing");
  await page.goto("/onboarding/analysing?fast=1");
  await expect(page.getByRole("listitem").filter({ hasText: "Reading 6 months of transactions" })).toBeVisible();

  // The first insight: the shortfall, full screen, with the detail in a sheet.
  await page.waitForURL("**/onboarding/insight", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Heads up: you could be about $53 short before your 01/10 payday" })).toBeVisible();
  await expect(page.getByText("You have $314 and 2 bills totalling $367 due before then.")).toBeVisible();
  await expectNoAxe(page);
  await page.getByRole("button", { name: "See what's due" }).click();
  const due = page.getByRole("dialog", { name: "Due before payday" });
  await expect(due).toContainText("Beforepay · 30/09");
  await expect(due).toContainText("$315");
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Next" }).click();

  // O5 / spec 04 step 4: score, stage, path to next stage, biggest factor. Short: no first action here.
  await expect(page.getByRole("heading", { name: "Your SmartScore is 472." })).toBeVisible();
  await expect(page.getByRole("meter", { name: "SmartScore" })).toHaveAttribute("aria-valuetext", "SmartScore 472. Steadying. 128 points to Healthy.");
  await expect(page.getByText("Biggest factor with room to move")).toBeVisible();
  await expect(page.getByRole("button", { name: /Current borrowing 2\.9 \/ 10 You have 3 loans open\./ })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/congratulations|well done|great job/i);
  await expectNoAxe(page);
  await page.getByRole("link", { name: "Next" }).click();

  // Goal: nothing preselected; gambling offered (detected), last, neutral; Continue waits for a choice.
  await expect(page.getByRole("heading", { name: "What would help most right now?" })).toBeVisible();
  const radios = page.getByRole("radio");
  await expect(radios).toHaveCount(6);
  for (const r of await radios.all()) await expect(r).not.toBeChecked();
  await expect(radios.last()).toHaveAccessibleName("Spend less on gambling");
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await expectNoAxe(page);
  await page.getByText("Stop relying on pay advances").click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Alerts, asked after the aha. Headless Chromium denies permission: say so plainly and carry on.
  await expect(page.getByRole("heading", { name: "Want a heads-up before you run short?" })).toBeVisible();
  await expectNoAxe(page);
  await page.getByRole("button", { name: "Not now" }).click();

  // Today: the feed is there; the goal leads the plan, and "See how" shows it (with Change).
  await page.waitForURL((u) => u.pathname === "/");
  await expect(page.getByRole("heading", { name: "Needs a look" })).toBeVisible();
  await page.getByRole("button", { name: /^See how: Skip the next pay advance/ }).click();
  await expect(page.getByRole("dialog").getByRole("region", { name: "Your goal" })).toContainText("Your goal: Stop relying on pay advances");
});

test("Today: change the goal in a sheet; the plan follows it", async ({ page }) => {
  await page.goto("/?persona=jess&present=1");
  // Goal setting sits behind "See how" in Your progress (09/10/2026: no separate "Pick a goal" button on the card).
  await page.getByRole("button", { name: /^See how:/ }).click();
  const row = page.getByRole("dialog").getByRole("region", { name: "Your goal" });
  await row.getByRole("button", { name: "Pick a goal" }).click();
  const sheet = page.getByRole("dialog", { name: "Change your goal" });
  await sheet.getByText("Cut my bills and subscriptions").click();
  await sheet.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Goal saved" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^See how: Check your subscriptions/ })).toBeVisible();
  await page.goto("/savings?persona=jess&present=1");
  await expect(page.getByRole("main").getByRole("article").first().getByRole("heading", { level: 2 })).toHaveText("Check your subscriptions");
  await expectNoAxe(page);
});

test("journey 1 — Priya: onboarding ends on the no-score reveal", async ({ page }) => {
  await throughConnect(page, "priya");
  await page.goto("/onboarding/analysing?fast=1");
  // No score and no issues: the positive fallback (spec 04).
  await page.waitForURL("**/onboarding/insight", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Your pay comes in every second Thursday, about $1,960. That steady rhythm is a good start." })).toBeVisible();
  await page.getByRole("link", { name: "Next" }).click();
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
  for (const url of ["/onboarding/create-account", "/onboarding/consents", "/onboarding/connect-bank", "/onboarding/connect-bank/done?persona=jess", "/onboarding/score-reveal?persona=jess", "/onboarding/score-reveal?persona=priya",
    "/onboarding/welcome", "/onboarding/insight?persona=jess", "/onboarding/insight?persona=marcus", "/onboarding/goal?persona=jess", "/onboarding/alerts?persona=jess"]) {
    await page.goto(url);
    await expectNoAxe(page);
  }
});
