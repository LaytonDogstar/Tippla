"use client";
// Browser side of analytics (spec 09): typed `track()`, validated against the registry before anything is
// queued, batched to /api/events, kept in localStorage while offline (for the installable app) and retried.
import { cleanProps, isEventName, type EventName, type EventProps } from "./registry";

type Queued = { event: EventName; props: Record<string, unknown>; ts: string; platform: string; session_id: string };
const QUEUE_KEY = "tippla-analytics-queue";
const MAX_QUEUE = 200;
let queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let loaded = false;

function sessionId(): string {
  try {
    let id = sessionStorage.getItem("tippla-sid");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("tippla-sid", id);
    }
    document.cookie = `tippla-sid=${id}; path=/; samesite=lax`;
    return id;
  } catch {
    return "no-storage-session";
  }
}

const platform = () => (typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches ? "pwa" : "web");

function persist() { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE))); } catch { /* memory only */ } }
function load() {
  if (loaded) return;
  loaded = true;
  try { queue = [...(JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as Queued[]), ...queue]; } catch { /* start empty */ }
}

async function flush() {
  timer = null;
  load();
  if (!queue.length || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
  const batch = queue.slice(0, 50);
  try {
    const res = await fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ events: batch }), keepalive: true });
    if (res.ok || res.status === 422) {
      queue = queue.slice(batch.length);
      if (res.status === 422 && process.env.NODE_ENV !== "production") console.error("[analytics]", (await res.json()).error);
    }
  } catch { /* offline: keep for later */ }
  persist();
  if (queue.length) schedule(5000);
}

function schedule(ms = 1500) { if (!timer) timer = setTimeout(flush, ms); }

/**
 * Record an analytics event. In development an unregistered event throws right here, at the call site; a
 * prop that fails validation (e.g. an unusual merchant name) is logged and dropped, so it can't break the
 * button that sent it. Production drops both silently.
 */
export function track<E extends EventName>(event: E, props: EventProps<E>) {
  if (typeof window === "undefined") return;
  if (!isEventName(event)) {
    if (process.env.NODE_ENV !== "production") throw new Error(`Unregistered analytics event "${String(event)}". Add it to src/lib/analytics/registry.ts.`);
    return;
  }
  try {
    cleanProps(event, props as Record<string, unknown>);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[analytics]", (e as Error).message);
    return;
  }
  queue.push({ event, props: props as Record<string, unknown>, ts: new Date().toISOString(), platform: platform(), session_id: sessionId() });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  persist();
  schedule();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => schedule(0));
  window.addEventListener("pagehide", () => { if (queue.length) void flush(); });
}
