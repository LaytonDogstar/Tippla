// Captures the public site's preview screens (public/site/preview-<id>-<light|dark>.jpg) from the running portal,
// with Jess's example data in presentation mode, at phone width. Run against a local server:
//   npx next start -p 3400 &  then  node scripts/capture-site-previews.mjs [http://localhost:3400]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire(import.meta.url)("@playwright/test");

const base = process.argv[2] ?? "http://localhost:3400";
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "site");
const SHOTS = [
  { id: "today", url: "/?persona=jess&present=1&state=none", at: null },
  { id: "score", url: "/score?persona=jess&present=1", at: null },
  { id: "plan", url: "/money-plan?persona=jess&present=1", at: "[data-testid=waffle]" },
  { id: "cycles", url: "/progress?persona=jess&present=1", at: "[data-testid=trend-headline]" },
];

const browser = await chromium.launch();
for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const s of SHOTS) {
    await page.goto(base + s.url, { waitUntil: "networkidle" });
    if (s.at) await page.locator(s.at).first().evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 140));
    else await page.evaluate(() => window.scrollTo(0, 0));
    // Ask Tippla needs compliance sign-off before production (featureFlags assistant_v1), so the site doesn't show it.
    await page.addStyleTag({ content: "[role=search]{display:none!important}" });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, `preview-${s.id}-${scheme}.jpg`), type: "jpeg", quality: 80 });
    console.log(`preview-${s.id}-${scheme}.jpg`);
  }
  await ctx.close();
}
await browser.close();
