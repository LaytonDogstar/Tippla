// Spec 10: installable app (manifest, icons, service worker, offline page), push setup on Profile, and the
// push and email endpoints.
import { expect, test } from "@playwright/test";

test("the manifest makes Tippla installable", async ({ request }) => {
  const m = await (await request.get("/manifest.webmanifest")).json();
  expect(m).toMatchObject({ name: "Tippla", display: "standalone", start_url: "/?src=install", lang: "en-AU" });
  expect(m.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes} ${i.purpose}`)).toEqual(["192x192 any", "512x512 any", "512x512 maskable"]);
  for (const i of m.icons) expect((await request.get(i.src)).headers()["content-type"]).toBe("image/png");
  expect((await request.get("/offline.html")).status()).toBe(200);
});

test("the service worker registers and keeps Today for offline use", async ({ page }) => {
  await page.goto("/?persona=jess&present=1&state=none");
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.active, null, { timeout: 15_000 });
  await page.goto("/help");
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  // Visits once the worker is in charge go through it and are kept (Playwright's reload() skips the worker).
  const kept = () => page.evaluate(async () => (await (await caches.open("tippla-v2")).keys()).map((r) => new URL(r.url).pathname));
  await expect.poll(async () => { await page.goto("/"); return kept(); }, { timeout: 15_000 }).toEqual(expect.arrayContaining(["/offline.html", "/__who", "/__page/jess/"])); // kept per person
  await expect(page.getByText(/Checked \d+ new transactions/)).toBeVisible();
  // Serving those copies offline is covered in tests/serviceWorker.test.ts: Playwright's offline switch and
  // request blocking don't reach service-worker requests.
});



test("Profile: notifications on this device, with a way to turn them on", async ({ page, context }) => {
  await context.grantPermissions(["notifications"]);
  await page.goto("/account/profile?persona=jess&present=1&state=none");
  await expect(page.getByRole("heading", { name: "Notifications on this device" })).toBeVisible();
  // Headless Chromium always reports notifications as blocked, so accept either state.
  await expect(page.getByRole("button", { name: "Turn on notifications on this device" }).or(page.getByText("Notifications are blocked for Tippla in your browser settings."))).toBeVisible();
});

test("push and email endpoints: VAPID key, subscription validation, test send, signed unsubscribe", async ({ request }) => {
  const { publicKey } = await (await request.get("/api/push/key")).json();
  expect(publicKey).toMatch(/^[A-Za-z0-9_-]{80,}$/);
  expect((await request.post("/api/push/subscribe", { data: { subscription: { endpoint: "http://not-https" } } })).status()).toBe(400);
  // No device subscribed for this member: the test send reaches nobody, and says so.
  expect(await (await request.post("/api/notify/test")).json()).toEqual({ devices: 0, delivered: 0 });
  const bad = await request.get("/api/email/unsubscribe?m=jess&k=weekly_digest&t=nope");
  expect(bad.status()).toBe(400);
  expect(await bad.text()).toContain("isn't valid");
  // Dispatch is refused in production without the cron secret.
  expect((await request.post("/api/notify/dispatch")).status()).toBe(401);
});
