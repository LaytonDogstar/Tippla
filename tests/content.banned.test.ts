// Copy rules are code (docs/02_voice_and_copy.md). Scans every file in src/content/.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const BANNED = [
  "significant concern", "areas of concern", "safe levels", "escalating", "red flag", "warning:", "critical",
  "top performers", "top savers", "your ranking", "you rank", "percentile", "better than %", "worse than",
  "nice work", "great job", "well done", "congratulations", "you're on the right track", "keep it up",
  "avoid gambling", "knowing the pattern", "first step", "addiction", "problem gambling",
  "cook more", "meal prep", "try cooking", "use public transport", "cut back on",
  "customize", "color", "behavior", "organization", "prioritize", "recognize",
  "reduce gambling to $0", "unbudgeted", "biggest gap", "worth a closer look",
  "act now", "limited time", "hurry", "don't miss out", "pre-approved", "guaranteed approval",
];
const BANNED_PATTERNS = [/better than \d+\s*%/i];

const dir = path.join(__dirname, "../src/content");
const files = fs.readdirSync(dir, { recursive: true }).map(String).filter((f) => /\.(ts|tsx|json|md)$/.test(f));

describe("banned phrases in src/content", () => {
  it("has content files to scan", () => expect(files.length).toBeGreaterThan(0));
  for (const f of files) {
    it(f, () => {
      const text = fs.readFileSync(path.join(dir, f), "utf8").toLowerCase();
      for (const p of BANNED) expect(text, `"${p}" in ${f}`).not.toContain(p);
      for (const r of BANNED_PATTERNS) expect(text).not.toMatch(r);
    });
  }
});
