// Browser side of turning push on (spec 10), shared by Profile and the onboarding opt-in (spec 04): ask
// permission, register the service worker, subscribe with the VAPID key and save the subscription.
import { track } from "@/lib/analytics/client";

export type EnableResult = "on" | "denied" | "off" | "unsupported" | "failed";

const b64ToBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
export const standalone = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export async function enablePush(): Promise<EnableResult> {
  if (!pushSupported()) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    track("push_permission", { granted: permission === "granted" });
    if (permission !== "granted") return permission === "denied" ? "denied" : "off";
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const { publicKey } = (await (await fetch("/api/push/key")).json()) as { publicKey: string };
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
    const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), platform: standalone() ? "pwa" : "web" }) });
    return res.ok ? "on" : "failed";
  } catch {
    return "failed";
  }
}
