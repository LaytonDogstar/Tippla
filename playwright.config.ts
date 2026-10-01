import { defineConfig, devices } from "@playwright/test";

// Uses the preinstalled Chromium (PLAYWRIGHT_BROWSERS_PATH). Runs against a production build.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:3200", ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
  webServer: { command: "npx next start -p 3200", url: "http://localhost:3200/dev/components", reuseExistingServer: true, env: { MOCK_LATENCY: "0" } },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
