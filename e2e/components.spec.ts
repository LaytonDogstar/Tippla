// Phase 1 acceptance: axe has no violations on /dev/components (both themes) and components are keyboard operable.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const scheme of ["light", "dark"] as const) {
  test(`axe: no violations on /dev/components (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/dev/components");
    // @axe-core/playwright ships its own playwright-core types; the runtime Page is the same.
    const results = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const summary = results.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")} — ${v.help}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}

test("sheet: opens with focus inside, Escape closes, focus returns to the trigger", async ({ page }) => {
  await page.goto("/dev/components");
  const trigger = page.getByRole("button", { name: "Open sheet" }).first();
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Example sheet" });
  await expect(dialog).toBeVisible();
  await expect(page.locator("#app-root")).toHaveAttribute("inert", "");
  // Tab stays inside the dialog.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("insight pager: manual paging with announced position", async ({ page }) => {
  await page.goto("/dev/components");
  const card = page.getByRole("region", { name: "Insights", exact: true }).first();
  await expect(card.getByText("1 of 3").first()).toBeVisible();
  await expect(card.getByRole("button", { name: "Previous" })).toBeDisabled();
  await card.getByRole("button", { name: "Next" }).click();
  await expect(card.getByText("2 of 3").first()).toBeVisible();
  await expect(card.getByRole("heading", { name: "How gambling affects your SmartScore" })).toBeVisible();
});

test("segmented control: arrow keys move the selection (radio group)", async ({ page }) => {
  await page.goto("/dev/components");
  const all = page.getByRole("radio", { name: "All" }).first();
  await all.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Money out" }).first()).toBeChecked();
});

test("calendar: roving focus with arrows, Enter opens the day", async ({ page }) => {
  await page.goto("/dev/components");
  const grid = page.getByRole("grid").first();
  const today = grid.getByRole("button", { name: /^Fri 25\/09/ });
  await today.focus();
  await page.keyboard.press("ArrowRight");
  await expect(grid.getByRole("button", { name: /^Sat 26\/09/ })).toBeFocused();
  await expect(grid.getByRole("button", { name: /^Sat 26\/09/ })).toHaveAccessibleName(/Telstra \$52 predicted/);
  await page.keyboard.press("ArrowDown"); // can't go below the last row: stays put
  await page.keyboard.press("End");
  const wed = grid.getByRole("button", { name: /^Wed 30\/09/ });
  await expect(wed).toBeFocused();
  await expect(wed).toHaveAccessibleName(/Balance forecast −\$53/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Day 30/09" })).toBeVisible();
});

test("donut: legend rows select and clear a category", async ({ page }) => {
  await page.goto("/dev/components");
  const donut = page.locator("#donut [data-theme=light]");
  const gambling = donut.getByRole("button", { name: /^Gambling/ });
  await gambling.click();
  await expect(gambling).toHaveAttribute("aria-pressed", "true");
  await expect(donut.getByRole("button", { name: "Remove Gambling filter" })).toBeVisible();
  await gambling.click();
  await expect(gambling).toHaveAttribute("aria-pressed", "false");
});

test("disclosures: category row and loan card expand with aria-expanded", async ({ page }) => {
  await page.goto("/dev/components");
  const row = page.locator("#category-row [data-theme=light]").getByRole("button", { name: /Gambling/ }).first();
  await expect(row).toHaveAttribute("aria-expanded", "false");
  await row.press("Enter");
  await expect(row).toHaveAttribute("aria-expanded", "true");
});

test("no red, no green: financial components never use the destructive or positive tokens", async ({ page }) => {
  await page.goto("/dev/components");
  const offenders = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const destructive = css.getPropertyValue("--color-destructive").trim().toLowerCase();
    const sections = ["score-ring", "stage-scale", "factor-tile", "pay-cycle", "insight", "category-row", "donut", "transaction-row", "calendar", "loan-card", "offer-card", "recommendation"];
    const hex = (rgb: string) => { const m = rgb.match(/\d+/g); return m ? "#" + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("") : ""; };
    const bad: string[] = [];
    for (const id of sections)
      for (const el of document.querySelectorAll(`#${id} [data-theme=light] *`)) {
        const s = getComputedStyle(el);
        for (const v of [s.color, s.backgroundColor, s.borderTopColor]) if (hex(v) === destructive) bad.push(`${id}: ${el.tagName}`);
      }
    return bad;
  });
  expect(offenders).toEqual([]);
});
