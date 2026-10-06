// Spec 10: the service worker's behaviour, run in a sandbox with fake browser APIs (Playwright can't take a
// service worker offline). Offline pages, push display (generic by default) and tapping a notification.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

type Handler = (e: any) => void;
function loadWorker(opts: { online: boolean }) {
  const handlers: Record<string, Handler> = {};
  const store = new Map<string, Response>();
  const shown: { title: string; options: any }[] = [];
  const posted: { url: string; body: string }[] = [];
  const opened: string[] = [];
  const cache = {
    addAll: async (urls: string[]) => { for (const u of urls) store.set(u, new Response(`cached ${u}`)); },
    put: async (key: string, res: Response) => { store.set(key, res); },
    keys: async () => [...store.keys()],
  };
  const sandbox: any = {
    console, URL, Response, Promise,
    location: { origin: "https://tippla.example" },
    self: {
      addEventListener: (type: string, h: Handler) => { handlers[type] = h; },
      skipWaiting: async () => {},
      clients: { claim: async () => {}, matchAll: async () => [], openWindow: async (u: string) => { opened.push(u); } },
      registration: { showNotification: async (title: string, options: any) => { shown.push({ title, options }); } },
    },
    caches: {
      open: async () => cache,
      keys: async () => ["tippla-v1"],
      delete: async () => true,
      match: async (key: string) => store.get(key),
    },
    fetch: async (req: any, init?: any) => {
      if (typeof req === "string" && init) { posted.push({ url: req, body: init.body }); return new Response("{}"); }
      if (!opts.online) throw new TypeError("Failed to fetch");
      return new Response(`live ${new URL(req.url).pathname}`, { status: 200 });
    },
  };
  sandbox.self.location = sandbox.location;
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, "../public/sw.js"), "utf8"), sandbox);
  const run = async (type: string, e: any) => {
    let p: Promise<any> | undefined;
    handlers[type]!({ ...e, waitUntil: (x: Promise<any>) => { p = x; }, respondWith: (x: Promise<any>) => { p = x; } });
    return p;
  };
  return { run, store, shown, posted, opened };
}
const nav = (url: string) => ({ request: { method: "GET", mode: "navigate", url } });

describe("service worker", () => {
  it("installs the offline shell", async () => {
    const w = loadWorker({ online: true });
    await w.run("install", {});
    expect([...w.store.keys()]).toEqual(["/offline.html", "/icons/icon-192.png", "/icons/badge-96.png"]);
  });

  it("online: always the network (never stale numbers), keeping a copy of Today and main sections", async () => {
    const w = loadWorker({ online: true });
    const res: Response = await w.run("fetch", nav("https://tippla.example/?persona=jess"));
    expect(await res.text()).toBe("live /");
    await new Promise((r) => setTimeout(r, 0));
    expect(w.store.has("/")).toBe(true);
    await w.run("fetch", nav("https://tippla.example/account/profile"));
    await new Promise((r) => setTimeout(r, 0));
    expect(w.store.has("/account/profile")).toBe(false); // account pages aren't kept
  });

  it("offline: the last copy of the page, else the offline page", async () => {
    const w = loadWorker({ online: false });
    await w.run("install", {});
    w.store.set("/", new Response("cached Today, Updated Fri 25/09, 9:14am"));
    expect(await ((await w.run("fetch", nav("https://tippla.example/"))) as Response).text()).toContain("Updated Fri 25/09");
    expect(await ((await w.run("fetch", nav("https://tippla.example/calendar?view=month"))) as Response).text()).toBe("cached /offline.html");
  });

  it("ignores everything that isn't a page visit (data and API requests go straight to the network)", async () => {
    const w = loadWorker({ online: true });
    expect(await w.run("fetch", { request: { method: "POST", mode: "cors", url: "https://tippla.example/api/events" } })).toBeUndefined();
  });

  it("push: shows what the server sent (generic by default), and a generic message if the payload is unreadable", async () => {
    const w = loadWorker({ online: true });
    await w.run("push", { data: { json: () => ({ title: "Tippla", body: "You have an update from Tippla", url: "/hardship", tag: "shortfall-2026-09-17" }) } });
    await w.run("push", { data: { json: () => { throw new Error("bad"); } } });
    expect(w.shown.map((s) => [s.title, s.options.body, s.options.tag, s.options.data.url])).toEqual([
      ["Tippla", "You have an update from Tippla", "shortfall-2026-09-17", "/hardship"],
      ["Tippla", "You have an update from Tippla", "tippla", "/"],
    ]);
  });

  it("tapping a notification opens the right page and reports it", async () => {
    const w = loadWorker({ online: true });
    await w.run("notificationclick", { notification: { close: () => {}, data: { url: "/hardship", tag: "shortfall-2026-09-17" } } });
    expect(w.opened).toEqual(["https://tippla.example/hardship?src=push"]);
    expect(w.posted).toEqual([{ url: "/api/notify/opened", body: JSON.stringify({ tag: "shortfall-2026-09-17" }) }]);
  });
});
