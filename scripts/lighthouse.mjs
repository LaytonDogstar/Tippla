// Lighthouse mobile accessibility on every screen, every persona (definition of done: ≥ 95).
// Usage: npm run build && npm start (port 3000) in one shell, then: npm run lighthouse [-- --base http://localhost:3000] [--only /spending,/calendar]
// Chrome: uses CHROME_PATH, or Playwright's Chromium when PLAYWRIGHT_BROWSERS_PATH is set.
import fs from "node:fs";
import path from "node:path";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:3000";
const MIN = 95;
const ROUTES = ["/", "/score", "/score/current-borrowing", "/savings", "/spending", "/spending?tab=categories", "/spending?tab=budgets",
  "/spending/compare", "/spending/compare?tab=cohort", "/calendar", "/calendar?view=month", "/subscriptions", "/loans", "/loans?tab=upcoming",
  "/loans?tab=history", "/loans?tab=other", "/loans/repayment", "/offers", "/hardship", "/help", "/notifications", "/account",
  "/account/profile", "/account/subscription", "/account/consents", "/account/bank", "/onboarding", "/onboarding/create-account",
  "/onboarding/consents", "/onboarding/connect-bank", "/onboarding/analysing", "/onboarding/score-reveal",
  "/progress", "/notifications/summary", "/?state=payday", "/progress?state=payday", "/notifications?state=bill_due"];

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const dir = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!dir) return undefined;
  const pick = fs.readdirSync(dir).filter((d) => /^chromium-\d+$/.test(d)).sort().at(-1);
  return pick ? path.join(dir, pick, "chrome-linux", "chrome") : undefined;
}

const chrome = await chromeLauncher.launch({ chromePath: chromePath(), chromeFlags: ["--headless=new", "--no-sandbox"] });
let worst = 100, failed = 0;
for (const persona of ["jess", "marcus", "priya"]) {
  for (const r of args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : ROUTES) {
    // Dev states stick in a cookie, so every other route clears them.
    const url = `${base}${r}${r.includes("?") ? "&" : "?"}persona=${persona}&present=1${r.includes("state=") ? "" : "&state=none"}`;
    const { lhr } = await lighthouse(url, { port: chrome.port, onlyCategories: ["accessibility"], formFactor: "mobile", screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 3 }, logLevel: "error" });
    const score = Math.round(lhr.categories.accessibility.score * 100);
    worst = Math.min(worst, score);
    const fails = Object.values(lhr.audits).filter((a) => a.score === 0 && a.scoreDisplayMode === "binary").map((a) => a.id);
    if (score < MIN) failed++;
    console.log(`${score < MIN ? "FAIL" : "ok  "} ${score}  ${persona.padEnd(6)} ${r}${fails.length ? `  (${fails.join(", ")})` : ""}`);
  }
}
await chrome.kill();
console.log(`\nLowest accessibility score: ${worst} (target ≥ ${MIN})`);
process.exit(failed ? 1 : 0);
