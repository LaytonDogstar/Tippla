// Phase 6 acceptance: every docs/09 state via personas or dev toggles; 200% text without clipping or
// sideways scrolling; reduced motion; presentation mode hides dev tools and "Sample logic" tags.
import { expect, test, type Page } from "@playwright/test";

const ROUTES = ["/", "/score", "/score/current-borrowing", "/savings", "/spending", "/spending?tab=categories", "/spending?tab=budgets",
  "/spending/compare", "/spending/compare?tab=cohort", "/calendar", "/calendar?month=2026-10", "/subscriptions", "/loans", "/loans?tab=upcoming",
  "/loans?tab=history", "/loans?tab=other", "/loans/repayment", "/offers", "/hardship", "/help", "/notifications", "/account",
  "/account/profile", "/account/subscription", "/account/consents", "/account/bank", "/onboarding", "/onboarding/consents", "/onboarding/score-reveal", "/progress", "/notifications/summary"];
const url = (r: string, persona: string, extra = "") => `${r}${r.includes("?") ? "&" : "?"}persona=${persona}&present=1${extra}`;

/** Text that overflows the page, or is clipped, or spills out of a fixed-height box. */
async function textProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const W = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > W + 1) out.push(`page is ${document.documentElement.scrollWidth}px wide`);
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || el.closest("svg") || el.closest(".sr-only")) continue;
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim())) continue;
      const label = `<${el.tagName.toLowerCase()}> "${el.textContent?.trim().slice(0, 40)}"`;
      // Content inside a sideways-scrolling row (Today's quick actions) is reachable by scrolling, not off-screen.
      const inScroller = (() => { for (let p = el.parentElement; p; p = p.parentElement) if (["auto", "scroll"].includes(getComputedStyle(p).overflowX)) return true; return false; })();
      if (el.getBoundingClientRect().right > W + 1 && cs.position !== "fixed" && !inScroller) out.push(`off-screen ${label}`);
      const clipped = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2;
      if (clipped && cs.overflow !== "visible" && !["auto", "scroll"].includes(cs.overflowY) && !["TEXTAREA", "INPUT"].includes(el.tagName)) out.push(`clipped ${label}`);
      if (/\bh-/.test(String(el.className)) && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 2) out.push(`spills ${label}`);
    }
    return [...new Set(out)];
  });
}

test.describe("dynamic type 200%", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => document.addEventListener("DOMContentLoaded", () => { document.documentElement.style.fontSize = "200%"; }));
  });
  for (const persona of ["jess", "marcus", "priya"]) {
    test(`no clipped or off-screen text on any screen (${persona})`, async ({ page }) => {
      test.setTimeout(180_000);
      const problems: string[] = [];
      for (const r of ROUTES) {
        await page.goto(url(r, persona));
        await page.waitForLoadState("networkidle");
        for (const p of await textProblems(page)) problems.push(`${r}: ${p}`);
      }
      expect(problems, problems.join("\n")).toEqual([]);
    });
  }
  test("calendar: picking a day works at large text", async ({ page }) => {
    await page.goto(url("/calendar", "jess"));
    await page.getByRole("button", { name: /^Wed 30\/09, forecast balance/ }).click();
    const panel = page.getByRole("region", { name: "Wed 30/09" });
    await expect(panel.getByText("Forecast end of day −$53")).toBeVisible();
  });
});

test("reduced motion: transitions are effectively off and sheets appear without animating", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url("/spending", "jess"));
  const d = await page.getByRole("button", { name: /^Set \$150 budget for Food/ }).evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(parseFloat(d)).toBeLessThan(0.001);
  await page.getByRole("region", { name: "How lenders see your spending" }).getByRole("button", { name: /^2 deposits/ }).click();
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  // Framer applies the zero-length transition on the next frame; the normal slide takes 250 ms, so a
  // 150 ms ceiling still proves the animation is off.
  await expect.poll(() => panel.evaluate((el) => getComputedStyle(el).transform), { timeout: 150, intervals: [10] })
    .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
});

test("presentation mode hides the dev pill and Sample logic tags; dev mode shows them", async ({ page }) => {
  for (const r of ["/score", "/savings", "/spending/compare?tab=cohort", "/hardship", "/account/subscription"]) {
    await page.goto(url(r, "jess"));
    await expect(page.getByText(/Sample logic/), r).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Dev ·/ }), r).toHaveCount(0);
  }
  await page.goto("/hardship?persona=jess&present=0");
  await expect(page.getByText("Sample logic · Q8")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Dev · jess/ })).toBeVisible();
});

test.describe("states (docs/09)", () => {
  test("brand new: analysing skeleton on Home and drill-downs; Hardship still works", async ({ page }) => {
    await page.goto(url("/", "jess", "&state=analysing"));
    await expect(page.getByRole("heading", { name: "Working out your SmartScore" })).toBeVisible();
    await expect(page.getByText("About $53 short before payday")).toHaveCount(0);
    await page.goto(url("/spending", "jess"));
    await expect(page.getByRole("heading", { name: "Working out your SmartScore" })).toBeVisible();
    await page.goto(url("/hardship", "jess"));
    await expect(page.getByText("If money's tight right now, these are real options.")).toBeVisible();
  });

  test("lapsed subscription: score visible on Home, drill-downs show the reactivate sheet, support never gated", async ({ page }) => {
    await page.goto(url("/", "marcus", "&state=lapsed"));
    await expect(page.getByRole("link", { name: /SmartScore 612 out of 1,000/ })).toBeVisible();
    await expect(page.getByText("Your subscription has ended, so the rest of Tippla is paused. Your SmartScore stays here.")).toBeVisible();
    await page.goto(url("/spending", "marcus"));
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("heading", { name: "Your subscription has ended" })).toBeVisible();
    await sheet.getByRole("button", { name: "Back to Home" }).click();
    await expect(page).toHaveURL(/\/$|\/\?/);
    for (const r of ["/hardship", "/help", "/account/subscription"]) {
      await page.goto(url(r, "marcus"));
      await expect(page.getByRole("dialog"), r).toHaveCount(0);
    }
  });

  test("offline / API error: cached data with a plain notice", async ({ page }) => {
    await page.goto(url("/", "jess", "&state=offline"));
    await expect(page.getByText("Couldn't refresh. Showing data from Fri 25/09, 9:14am.")).toBeVisible();
    await expect(page.getByTestId("hero-amount")).toContainText("About $53 short of what's due before payday");
  });

  test("bank connection expired: banner with the date numbers stopped, and a way to reconnect", async ({ page }) => {
    await page.goto(url("/", "jess", "&state=bank_expired"));
    const banner = page.getByRole("link", { name: /Your bank connection has expired, so your numbers stopped updating on 25\/09\/2026/ });
    await expect(banner).toBeVisible();
    await banner.click();
    await expect(page).toHaveURL(/\/account\/bank/);
  });

  test("one-off $4,000 deposit is left out of monthly income, with a note", async ({ page }) => {
    await page.goto(url("/score/income-stability", "jess", "&state=one_off"));
    await expect(page.getByRole("dialog").getByText("We've left out a one-off $4,000 deposit on 12/09")).toBeVisible();
  });

  test("second account: Spending counts both accounts (v5 has no account filter)", async ({ page }) => {
    await page.goto(url("/spending", "jess", "&state=two_accounts"));
    await expect(page.getByLabel("Account")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Where it went" }).getByRole("button", { name: /^Groceries/ })).toBeVisible();
  });

  test("in hardship (self-selected): the gentle banner appears on Home", async ({ page }) => {
    await page.goto(url("/hardship", "marcus"));
    await page.getByText("I'm finding things hard right now").click();
    await page.goto(url("/", "marcus"));
    await expect(page.getByRole("link", { name: /Money tight right now/ })).toBeVisible();
  });
});
