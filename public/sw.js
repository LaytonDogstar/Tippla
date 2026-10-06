// Tippla service worker (spec 10): an offline shell, the last-known pages for when there's no connection,
// and push notifications. Network first for pages, so numbers are never stale while online.
const VERSION = "tippla-v1";
const SHELL = ["/offline.html", "/icons/icon-192.png", "/icons/badge-96.png"];
// Pages kept for offline use: Today and the main sections (personal data stays on this device only).
const KEEP = /^\/(|score|spending|calendar|subscriptions|loans|hardship|help|progress|notifications)$/;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok && KEEP.test(url.pathname)) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(url.pathname, copy));
      }
      return res;
    } catch {
      // Offline: the last copy of this page (it shows when it was last updated), else the offline page.
      return (await caches.match(url.pathname)) || (await caches.match("/offline.html"));
    }
  })());
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
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of open) if ("focus" in c) { await c.navigate(target).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(target);
  })());
});
