import type { Config } from "tailwindcss";
import fs from "node:fs";
import path from "node:path";

// Token source: design/tokens.json when Astra delivers it, otherwise the placeholder template.
const real = path.join(__dirname, "design/tokens.json");
const tokens = JSON.parse(
  fs.readFileSync(fs.existsSync(real) ? real : path.join(__dirname, "design/tokens.template.json"), "utf8"),
);

const kebab = (s: string) => s.replace(/_/g, "-").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const toVars = (obj: Record<string, unknown>, prefix: string) =>
  Object.fromEntries(
    Object.keys(obj)
      .filter((k) => !k.startsWith("_"))
      .map((k) => [kebab(k), `var(--${prefix}-${kebab(k)})`]),
  );

type TypeToken = { size: number; lineHeight: number; weight: number; letterSpacing: number };
const fontSize = Object.fromEntries(
  Object.entries(tokens.type as Record<string, TypeToken | string>)
    .filter(([k]) => !k.startsWith("_"))
    .map(([k, v]) => {
      const t = v as TypeToken;
      const entry: [string, { lineHeight: string; fontWeight: string; letterSpacing: string }] = [
        `${t.size}px`,
        { lineHeight: `${t.lineHeight}px`, fontWeight: String(t.weight), letterSpacing: `${t.letterSpacing}em` },
      ];
      return [kebab(k), entry];
    }),
);

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ...toVars(tokens.color.light, "color"),
        stage: toVars(tokens.color.stage.light, "stage"),
        cat: toVars(tokens.color.category.light, "cat"),
        "cat-dim": toVars(tokens.color.category.light, "cat-dim"),
        brand: { from: "var(--brand-from)", to: "var(--brand-to)", on: "var(--brand-on)", track: "var(--brand-track)" },
        chart: toVars(tokens.color.chart?.light ?? {}, "chart"),
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        numeric: "var(--font-numeric)",
      },
      fontSize,
      spacing: { ...Object.fromEntries((tokens.space as number[]).map((v, i) => [`t${i}`, `${v}px`])), sidebar: "var(--sidebar-width)", drawer: "var(--drawer-width)" },
      borderRadius: Object.fromEntries(Object.entries(tokens.radius).map(([k, v]) => [k, `${v}px`])),
      boxShadow: { e1: "var(--elev-1)", e2: "var(--elev-2)", e3: "var(--elev-3)" },
      transitionDuration: { fast: "var(--motion-fast)", base: "var(--motion-base)", slow: "var(--motion-slow)" },
      transitionTimingFunction: { tippla: "var(--motion-easing)" },
      minHeight: { tap: `${tokens.layout.minTap}px` },
      height: { tap: `${tokens.layout.minTap}px`, tab: "var(--tab-bar-height)" },
      width: { sidebar: "var(--sidebar-width)", drawer: "var(--drawer-width)" },
      padding: { gutter: "var(--gutter)" },
      screens: { tablet: `${tokens.layout.breakpoints?.tablet ?? 768}px`, desktop: `${tokens.layout.breakpoints?.desktop ?? 1024}px` },
      minWidth: { tap: `${tokens.layout.minTap}px` },
    },
  },
  plugins: [],
};
export default config;
