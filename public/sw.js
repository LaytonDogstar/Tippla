// Tippla service worker (spec 10): an offline shell, the last-known pages for when there's no connection,
// and push notifications. Network first for pages, so numbers are never stale while online.
const VERSION = "tippla-v2";
const SHELL = ["/offline.html", "/icons/icon-192.png", "/icons/badge-96.png"];
// Pages kept for offline use: Today and the main sections (personal data stays on this device only).
const KEEP = /^\/(|score|spending|calendar|subscriptions|loans|hardship|help|progress|notifications)$/;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Cached pages are kept per person (the x-tippla-who response header), and only the current person's pages
// are ever served offline, so a shared device never shows someone else's figures. The app clears them too
// when the person changes ("clear-pages" message).
const pageKey = (who, path) => `/__page/${encodeURIComponent(who)}${path}`;
const currentWho = async (cache) => (await (await cache.match("/__who"))?.text()) || null;

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      const who = res.headers.get("x-tippla-who");
      if (res.ok && who && KEEP.test(url.pathname)) {
        const copy = res.clone();
        caches.open(VERSION).then(async (c) => {
          if ((await currentWho(c)) !== who) await clearPages(c); // someone else: drop the last person's pages
          await c.put("/__who", new Response(who));
          await c.put(pageKey(who, url.pathname), copy);
        });
      }
      return res;
    } catch {
      // Offline: this person's last copy of the page (it shows when it was last updated), else the offline page.
      const c = await caches.open(VERSION);
      const who = await currentWho(c);
      return (who && (await c.match(pageKey(who, url.pathname)))) || (await c.match("/offline.html"));
    }
  })());
});

async function clearPages(c) {
  for (const k of await c.keys()) if (new URL(k.url).pathname.startsWith("/__page/") || new URL(k.url).pathname === "/__who") await c.delete(k);
}

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "clear-pages") e.waitUntil(caches.open(VERSION).then(clearPages));
});

self.addEventListener("push", (e) => {
  let data = { title: "Tippla", body: "You have an update from Tippla", url: "/", tag: "tippla" };
  try { data = { ...data, ...e.data.json() }; } catch { /* keep the generic text */ }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, tag: data.tag, data: { url: data.url, tag: data.tag },
    icon: "/icons/icon-192.png", badge: "/icons/badge-96.png",
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const { url = "/", tag = "" } = e.notification.data || {};
  e.waitUntil((async () => {
    fetch("/api/notify/opened", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tag }) }).catch(() => {});
    const target = new URL(url + (url.includes("?") ? "&" : "?") + "src=push", location.origin).href;
    // Only windows this worker controls can be navigated; otherwise open a new one at the right page.
    const open = await self.clients.matchAll({ type: "window" });
    for (const c of open) {
      if (!("focus" in c)) continue;
      const moved = await c.navigate(target).then(() => true, () => false);
      if (moved) return c.focus();
    }
    return self.clients.openWindow(target);
  })());
});
