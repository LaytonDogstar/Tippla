"use client";
// "Notifications on this device" (spec 10): turn push on or off for this browser or installed app, and send
// a test. iPhone needs Tippla on the Home Screen first (iOS 16.4+), so it says how.
import { useEffect, useState } from "react";
import type { PersonaId } from "@/lib/api/types";
import { pushCopy as t } from "@/content/notify";
import { track } from "@/lib/analytics/client";
import { Button } from "@/components/ui/Button";

type State = "checking" | "unsupported" | "ios" | "denied" | "off" | "on";

const b64ToBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
const standalone = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function PushSetup({ persona }: { persona: PersonaId }) {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { setState(ios && !standalone() ? "ios" : "unsupported"); return; }
      if (Notification.permission === "denied") { setState("denied"); return; }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [persona]);

  const turnOn = async () => {
    setBusy(true); setMessage("");
    try {
      const permission = await Notification.requestPermission();
      track("push_permission", { granted: permission === "granted" });
      if (permission !== "granted") { setState(permission === "denied" ? "denied" : "off"); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const { publicKey } = (await (await fetch("/api/push/key")).json()) as { publicKey: string };
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), platform: standalone() ? "pwa" : "web" }) });
      setState(res.ok ? "on" : "off");
      if (!res.ok) setMessage(t.failed);
    } catch {
      setMessage(t.failed);
    } finally { setBusy(false); }
  };

  const turnOff = async () => {
    setBusy(true); setMessage("");
    try {
      const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("off");
    } catch { setMessage(t.failed); } finally { setBusy(false); }
  };

  const test = async () => {
    setBusy(true); setMessage("");
    try {
      const r = (await (await fetch("/api/notify/test", { method: "POST" })).json()) as { delivered: number };
      setMessage(r.delivered ? t.testSent(r.delivered) : t.testNoDevice);
    } catch { setMessage(t.failed); } finally { setBusy(false); }
  };

  if (state === "checking") return null;
  return (
    <div className="mt-t3 border-t border-line pt-t3">
      <h3 className="text-body-strong text-text">{t.heading}</h3>
      {state === "unsupported" && <p className="mt-t1 text-small text-text-muted">{t.unsupported}</p>}
      {state === "ios" && <p className="mt-t1 text-small text-text-muted">{t.ios}</p>}
      {state === "denied" && <p className="mt-t1 text-small text-text-muted">{t.denied}</p>}
      {state === "off" && <Button className="mt-t2" variant="secondary" disabled={busy} onClick={turnOn}>{busy ? t.working : t.off}</Button>}
      {state === "on" && (
        <div className="mt-t2 flex flex-wrap items-center gap-t2">
          <span className="text-small text-text">{t.on}</span>
          <Button variant="secondary" disabled={busy} onClick={test}>{t.test}</Button>
          <Button variant="tertiary" disabled={busy} onClick={turnOff}>{t.turnOff}</Button>
        </div>
      )}
      <p role="status" className="mt-t1 text-small text-text-muted">{message}</p>
    </div>
  );
}
