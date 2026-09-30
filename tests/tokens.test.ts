import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.join(__dirname, "..");
const run = (file: string) => spawnSync("node", [path.join(root, "scripts/check-tokens.mjs"), file], { encoding: "utf8" });

describe("token checker", () => {
  it("passes the template", () => {
    const r = run(path.join(root, "design/tokens.template.json"));
    expect(r.status, r.stdout).toBe(0);
  });

  it("fails red stages, colourful gambling and low contrast", () => {
    const t = JSON.parse(fs.readFileSync(path.join(root, "design/tokens.template.json"), "utf8"));
    t.color.stage.light.building = "#D32F2F";
    t.color.category.light.gambling = "#E0A000";
    t.color.light.textMuted = "#CCCCCC";
    delete t.color.chart;
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "tok-")), "tokens.json");
    fs.writeFileSync(f, JSON.stringify(t));
    const r = run(f);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("stage.building reads as red");
    expect(r.stdout).toContain("Gambling (light)");
    expect(r.stdout).toContain("textMuted on surface");
    expect(r.stdout).toContain("Schema: missing key color.chart");
  });

  it("generates CSS variables for both themes", () => {
    execFileSync("node", [path.join(root, "scripts/tokens-to-css.mjs")]);
    const css = fs.readFileSync(path.join(root, "src/styles/tokens.css"), "utf8");
    expect(css).toContain("--color-bg:");
    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).toContain("--cat-gambling:");
    expect(css).toContain("--stage-steadying:");
  });
});
