// Spec 09 in the browser: real usage reaches /api/events, unregistered events are refused, consent is
// respected, and the dashboards render accessibly.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Request } from "@playwright/test";

const axe = (page: Page) =>
  new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
async function expectNoAxe(page: Page) {
  const r = await axe(page);
  const s = r.violations.map((v) => `${page.url()} ${v.id}: ${v.nodes[0]?.target.join(" ")} — ${v.help}`);
  expect(s, s.join("\n")).toEqual([]);
}
const eventsIn = (req: Request) => ((req.postDataJSON() as { events: { event: string; props: Record<string, unknown> }[] }).events);

test("Today reports session, page view, feed and safe-to-spend events; nothing sensitive", async ({ page }) => {
  const batches: { event: string; props: Record<string, unknown> }[][] = [];
  page.on("request", (r) => { if (r.url().endsWith("/api/events") && r.method() === "POST") batches.push(eventsIn(r)); });
  const stored = page.waitForResponse((r) => r.url().endsWith("/api/events") && r.status() === 200);
  await page.goto("/?persona=jess&present=1&state=none");
  expect((await (await stored).json()).stored).toBeGreaterThan(0);
  const all = batches.flat();
  const names = all.map((e) => e.event);
  expect(names).toEqual(expect.arrayContaining(["session_started", "page_viewed", "feed_viewed", "sts_viewed"]));
  expect(all.find((e) => e.event === "feed_viewed")!.props).toEqual({ item_count: 3, rule_ids: "shortfall,bill_over_balance,unusual_spend" });
  expect(JSON.stringify(all)).not.toMatch(/gambl|Jess|Taylor|@/i);

  // Acting on a card and opening a section are recorded too.
  const acted = page.waitForRequest((r) => r.url().endsWith("/api/events") && eventsIn(r).some((e) => e.event === "nav_section_opened"));
  await page.getByRole("navigation", { name: "Main" }).first().getByRole("link", { name: /^Money/ }).click();
  const nav = eventsIn(await acted).find((e) => e.event === "nav_section_opened")!;
  expect(nav.props).toEqual({ section: "money", had_badge: true });
});

test("the server never stores unregistered events or sensitive props (production build: dropped, not stored)", async ({ request }) => {
  // In development these fail loudly (422, and track() throws at the call site; see tests/analytics.test.ts).
  const bad = await request.post("/api/events", { data: { events: [{ event: "made_up_event" }] } });
  expect(await bad.json()).toEqual({ stored: 0, dropped: 1 });
  const free = await request.post("/api/events", { data: { events: [{ event: "cancel_guide_opened", props: { merchant: "Sportsbet" } }] } });
  expect(await free.json()).toEqual({ stored: 0, dropped: 1 });
  const ok = await request.post("/api/events", { data: { events: [{ event: "sts_breakdown_opened", props: {} }] } });
  expect((await ok.json()).stored).toBe(1);
});

test("turning off usage data in Profile stops anything being stored", async ({ page, request }) => {
  await page.goto("/account/profile?persona=marcus&present=1");
  await page.getByText("Share anonymous usage data to help improve Tippla").click();
  await expect(page.getByRole("status").filter({ hasText: "Usage data off" })).toBeVisible();
  const cookies = await page.context().cookies();
  const res = await request.post("/api/events", {
    data: { events: [{ event: "sts_breakdown_opened", props: {} }] },
    headers: { cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; ") },
  });
  expect((await res.json()).stored).toBe(0);
});

for (const scheme of ["light", "dark"] as const) {
  test(`dashboards render with the guardrail at 0, accessibly (${scheme})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/dev/analytics", { timeout: 90_000 });
    await expect(page.getByRole("heading", { name: "North star" })).toBeVisible();
    await expect(page.getByRole("region", { name: /Guardrails/ })).toContainText(/0 of \d+ offer views/);
    await expect(page.getByRole("table", { name: /Retention by signup week/ })).toBeVisible();
    await expect(page.getByRole("table", { name: /by rule/ })).toContainText("shortfall");
    await expectNoAxe(page);
  });
}
