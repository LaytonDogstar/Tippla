"use client";
// Install prompt (spec 10): offered after the first-value moment (the member has acted on something, or
// it's at least their second visit), never on first load. Android and desktop use the browser's own prompt;
// iPhone gets the "Add to Home Screen" steps. "Not now" is remembered on this device.
import { Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { installCopy as t } from "@/content/notify";
import { track } from "@/lib/analytics/client";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const DISMISSED = "tippla-install-dismissed";
const VISITS = "tippla-visits";

export function InstallPrompt({ hadValue }: { hadValue: boolean }) {
  const [deferred, setDeferred] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);
  const [steps, setSteps] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let visits = 0, dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED) === "1";
      if (!sessionStorage.getItem(VISITS)) { sessionStorage.setItem(VISITS, "1"); localStorage.setItem(VISITS, String(Number(localStorage.getItem(VISITS) ?? 0) + 1)); }
      visits = Number(localStorage.getItem(VISITS) ?? 0);
    } catch { /* no storage: treat as a first visit */ }
    if (standalone || dismissed || (!hadValue && visits < 2)) return;
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent);
    if (isIos) { setIos(true); setShow(true); return; }
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BIP); setShow(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [hadValue]);

  useEffect(() => { if (show) track("pwa_install_prompted", {}); }, [show]);
  if (!show) return null;

  const notNow = () => { try { localStorage.setItem(DISMISSED, "1"); } catch { /* session only */ } setShow(false); };
  const add = async () => {
    if (ios) { setSteps(true); return; }
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setShow(false);
  };

  return (
    // Today (09/10/2026): housekeeping, an outlined strip with the actions on the right.
    <section aria-labelledby="install-h" className="rounded-card-s border border-line px-t4 py-t3 sm:rounded-card sm:px-t5">
      <div className="flex flex-wrap items-center gap-x-t3 gap-y-t2">
        <span aria-hidden className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent"><Smartphone size={20} /></span>
        <div className="min-w-0 flex-[1_1_180px]">
          <h2 id="install-h" className="text-body14 font-bold text-text">{t.title}</h2>
          <p className="text-meta text-text-muted">{t.body}</p>
        </div>
        <div className="flex shrink-0 gap-t1">
          <Button variant="secondary" onClick={add}>{ios ? t.how : t.add}</Button>
          <Button variant="link" onClick={notNow}>{t.notNow}</Button>
        </div>
      </div>
      <Sheet open={steps} onClose={() => setSteps(false)} title={t.iosTitle}>
        <ol className="flex list-decimal flex-col gap-t2 pl-t5 text-body text-text">{t.iosSteps.map((s) => <li key={s}>{s}</li>)}</ol>
      </Sheet>
    </section>
  );
}
