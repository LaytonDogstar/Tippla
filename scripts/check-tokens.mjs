// Checks Astra's design/tokens.json before it goes into the build.
//   npm run tokens:check                  -> checks design/tokens.json (or the template if missing)
//   npm run tokens:check -- path/to.json  -> checks a specific file
// Exit code 1 if anything fails. Model-computed contrast tables are not trusted: this recomputes them.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = path.join(root, "design/tokens.template.json");
const arg = process.argv[2];
const target = arg ? path.resolve(arg) : fs.existsSync(path.join(root, "design/tokens.json"))
  ? path.join(root, "design/tokens.json") : templatePath;

const fails = [];
const warns = [];
const rows = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);

let tokens;
try { tokens = JSON.parse(fs.readFileSync(target, "utf8")); }
catch (e) { console.error(`Can't read ${target} as JSON: ${e.message}`); process.exit(1); }
const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));

// ---- 1. Schema: same keys and nesting as the template ----------------------------------
function keyPaths(obj, prefix = "") {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return [prefix];
  return Object.keys(obj).filter((k) => !k.startsWith("_"))
    .flatMap((k) => keyPaths(obj[k], prefix ? `${prefix}.${k}` : k));
}
const want = new Set(keyPaths(template));
const have = new Set(keyPaths(tokens));
for (const k of want) if (!have.has(k)) fail(`Schema: missing key ${k}`);
for (const k of have) if (!want.has(k)) warn(`Schema: extra key ${k} (not in the template; the build ignores it)`);

// ---- colour maths ---------------------------------------------------------------------
function parse(c) {
  if (typeof c !== "string") return null;
  let m = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join("") : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  m = c.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  return m ? [+m[1], +m[2], +m[3]] : null;
}
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s, l };
}
function lab(rgb) {
  const [r, g, b] = rgb.map(lin);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, y = 0.2126 * r + 0.7152 * g + 0.0722 * b, z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const deltaE = (a, b) => { const [p, q] = [lab(a), lab(b)]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
const isRed = (rgb) => { const { h, s, l } = hsl(rgb); return (h >= 345 || h <= 15) && s >= 0.35 && l > 0.15 && l < 0.85; };

const C = tokens.color ?? {};
const get = (group, mode, key) => {
  const obj = group ? C[group]?.[mode] : C[mode];
  const raw = obj?.[key];
  const rgb = parse(raw);
  if (raw !== undefined && !rgb) fail(`${group ? group + "." : ""}${mode}.${key}: "${raw}" is not a colour`);
  return rgb;
};

function pair(mode, label, a, b, min) {
  if (!a || !b) return;
  const r = contrast(a, b);
  rows.push({ mode, label, ratio: r.toFixed(2), min, ok: r >= min });
  if (r < min) fail(`Contrast (${mode}): ${label} is ${r.toFixed(2)}:1, needs ${min}:1`);
}

for (const mode of ["light", "dark"]) {
  if (!C[mode]) { fail(`color.${mode} is missing`); continue; }
  const s = (k) => get(null, mode, k);
  // Text (WCAG 1.4.3, 4.5:1)
  for (const [fg, bg] of [["text", "bg"], ["text", "surface"], ["text", "surface2"], ["textMuted", "bg"], ["textMuted", "surface"],
    ["textMuted", "surface2"], ["onAccent", "accent"], ["accent", "surface"], ["positive", "positiveSoft"], ["caution", "cautionSoft"],
    ["info", "infoSoft"], ["neutral", "neutralSoft"], ["destructive", "surface"], ["textInverse", "text"]])
    pair(mode, `${fg} on ${bg}`, s(fg), s(bg), 4.5);
  // Graphics (WCAG 1.4.11, 3:1)
  pair(mode, "focus on bg", s("focus"), s("bg"), 3);
  pair(mode, "focus on surface", s("focus"), s("surface"), 3);
  for (const k of Object.keys(C.stage?.[mode] ?? {}))
    for (const bg of ["surface", "surface2"]) pair(mode, `stage.${k} on ${bg}`, get("stage", mode, k), s(bg), 3);
  for (const k of Object.keys(C.category?.[mode] ?? {}))
    for (const bg of ["surface", "surface2"]) pair(mode, `category.${k} on ${bg}`, get("category", mode, k), s(bg), 3);
  for (const k of ["hatch", "predicted"]) if (C.chart?.[mode]?.[k]) pair(mode, `chart.${k} on surface`, get("chart", mode, k), s("surface"), 3);

  // No red for customer financial states. Destructive is the only red allowed.
  const checkRed = (label, rgb) => { if (rgb && isRed(rgb)) fail(`No red (${mode}): ${label} reads as red`); };
  for (const k of ["accent", "positive", "caution", "info", "neutral", "focus"]) checkRed(k, s(k));
  for (const k of Object.keys(C.stage?.[mode] ?? {})) checkRed(`stage.${k}`, get("stage", mode, k));
  for (const k of Object.keys(C.category?.[mode] ?? {})) checkRed(`category.${k}`, get("category", mode, k));
  for (const k of Object.keys(C.chart?.[mode] ?? {})) checkRed(`chart.${k}`, get("chart", mode, k));

  // Stages: one hue, steadily progressing lightness.
  const order = ["building", "steadying", "healthy", "thriving"];
  const st = order.map((k) => get("stage", mode, k)).filter(Boolean);
  if (st.length === 4) {
    const hs = st.map(hsl);
    const hues = hs.map((x) => x.h);
    const spread = Math.max(...hues.map((h) => Math.max(...hues.map((g) => Math.min(Math.abs(h - g), 360 - Math.abs(h - g))))));
    if (spread > 30) fail(`Stages (${mode}): hues span ${spread.toFixed(0)}°, should be a single hue (≤ 30°)`);
    const L = hs.map((x) => x.l);
    const mono = L.every((l, i) => i === 0 || (mode === "light" ? l < L[i - 1] : l > L[i - 1]));
    if (!mono) fail(`Stages (${mode}): should get steadily ${mode === "light" ? "darker" : "lighter"} from Building to Thriving`);
  }

  // Gambling is a real category colour (08/10/2026), but never red, orange or amber: it must not read as a warning.
  const gam = get("category", mode, "gambling");
  if (gam && hsl(gam).s > 0.22) {
    const h = hsl(gam).h;
    if (h < 60 || h > 330) fail(`Gambling (${mode}): hue ${h.toFixed(0)}° reads as a warning colour (red, orange or amber)`);
  }

  // Income and Centrelink look like equals.
  const inc = get("category", mode, "income"), cen = get("category", mode, "centrelink");
  if (inc && cen) {
    const lr = Math.max(lum(inc), lum(cen)) / Math.min(lum(inc), lum(cen));
    const sd = Math.abs(hsl(inc).s - hsl(cen).s);
    if (lr > 1.35 || sd > 0.2) fail(`Income vs Centrelink (${mode}): should have the same visual weight (luminance ratio ${lr.toFixed(2)}, saturation gap ${(sd * 100).toFixed(0)}%)`);
  }

  // Neutral-family categories must be distinguishable side by side; all categories should be distinct.
  const cats = Object.keys(C.category?.[mode] ?? {}).filter((k) => !k.startsWith("_"));
  const muted = ["loan_repayment", "gambling", "fees", "bnpl", "wage_advance", "cash"];
  for (let i = 0; i < cats.length; i++) for (let j = i + 1; j < cats.length; j++) {
    const a = get("category", mode, cats[i]), b = get("category", mode, cats[j]);
    if (!a || !b) continue;
    const d = deltaE(a, b);
    const bothMuted = muted.includes(cats[i]) && muted.includes(cats[j]);
    if (bothMuted && d < 10) fail(`Categories (${mode}): ${cats[i]} and ${cats[j]} are too similar (ΔE ${d.toFixed(1)}, needs ≥ 10)`);
    else if (d < 8) warn(`Categories (${mode}): ${cats[i]} and ${cats[j]} are close (ΔE ${d.toFixed(1)})`);
  }
}

// ---- Today redesign (07/10/2026): soft status tints, pastel spending groups, hero text ----------
// Red is allowed only as soft negative tints (negativeSoft behind negative text), never as a saturated fill.
for (const mode of ["light", "dark"]) {
  if (!C[mode]?.negative) continue;
  const s = (k) => get(null, mode, k);
  for (const [fg, bg] of [["textSecondary", "surface"], ["textSecondary", "surface2"], ["textSecondary", "bg"], ["textMuted", "chip"], ["textSecondary", "chip"],
    ["negative", "negativeSoft"], ["negative", "surface"], ["caution", "surface"], ["positive", "surface"], ["accentStrong", "accentSoft"], ["accent", "accentSoft"]])
    pair(mode, `${fg} on ${bg}`, s(fg), s(bg), 4.5);
  pair(mode, "iconMuted on surface", s("iconMuted"), s("surface"), 3);
  for (const k of ["negativeSoft", "cautionSoft", "positiveSoft"]) {
    const { l } = hsl(s(k));
    if (mode === "light" ? l < 0.88 : l > 0.25) fail(`Soft tints (${mode}): ${k} must be a soft tint (lightness ${(l * 100).toFixed(0)}%)`);
  }
  for (const k of Object.keys(C.spend?.[mode] ?? {}).filter((x) => !x.startsWith("_"))) {
    const c = get("spend", mode, k);
    if (c && hsl(c).l < 0.6) fail(`Spending groups (${mode}): ${k} must be a soft pastel (lightness ${(hsl(c).l * 100).toFixed(0)}%)`);
  }
  const g = C.spend?.[mode]?.gambling;
  if (g && [C[mode].negative, C[mode].destructive].some((x) => x?.toLowerCase() === g.toLowerCase())) fail(`Gambling (${mode}): must not use the warning text colour`);
}
// ---- UX round 2 (07/10/2026): no text below 13 px; muted text readable on every tinted card ----------
for (const [k, v] of Object.entries(tokens.type ?? {})) {
  if (k.startsWith("_")) continue;
  if (v.size < 13) fail(`Type: ${k} is ${v.size}px; nothing that holds a number or an action may be below 13px`);
}
for (const mode of ["light", "dark"]) {
  if (!C[mode]?.negative) continue;
  const s = (k) => get(null, mode, k);
  for (const bg of ["accentSoft", "accentTint2", "positiveSoft", "cautionSoft", "negativeSoft"])
    for (const fg of ["text", "textSecondary", "textMuted"]) pair(mode, `${fg} on ${bg}`, s(fg), s(bg), 4.5);
  pair(mode, "accent on chip", s("accent"), s("chip"), 4.5);
}

if (C.hero) {
  // Hero text sits on every part of the gradient: check each stop.
  for (const stop of ["from", "mid", "to"]) {
    pair("both", `hero.on on hero.${stop}`, parse(C.hero.on), parse(C.hero[stop]), 4.5);
    pair("both", `hero.onMuted on hero.${stop}`, parse(C.hero.onMuted), parse(C.hero[stop]), 4.5);
    pair("both", `hero.negativeMark on hero.${stop}`, parse(C.hero.negativeMark), parse(C.hero[stop]), 3);
  }
  for (const stop of ["ctaFrom", "ctaTo"]) pair("both", `white on hero.${stop}`, [255, 255, 255], parse(C.hero[stop]), 4.5);
}

// ---- report ---------------------------------------------------------------------------
console.log(`\nChecking ${path.relative(root, target)}\n`);
const bad = rows.filter((r) => !r.ok);
console.log(`Contrast pairs checked: ${rows.length}, failing: ${bad.length}`);
if (process.argv.includes("--table")) {
  console.log("\n| Theme | Pair | Ratio | Needs | |\n|---|---|---|---|---|");
  for (const r of rows) console.log(`| ${r.mode} | ${r.label} | ${r.ratio}:1 | ${r.min}:1 | ${r.ok ? "pass" : "FAIL"} |`);
}
if (warns.length) { console.log(`\nWarnings (${warns.length}):`); warns.forEach((w) => console.log(`  - ${w}`)); }
if (fails.length) { console.log(`\nFAILED (${fails.length}):`); fails.forEach((f) => console.log(`  ✗ ${f}`)); process.exit(1); }
console.log("\nAll token checks passed.");
