"use client";
// Dev-only persona pill, bottom-left above the dock. Hidden in presentation mode (?present=1).
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DEV_COOKIE, DEV_STATES, parseDevStates, type DevState } from "@/lib/dev/states";
import { statesCopy } from "@/content/states";
import type { PersonaId } from "@/lib/api/types";
import { cx } from "@/components/ui/cx";

const PERSONAS: PersonaId[] = ["jess", "marcus", "priya"];

export function PersonaSwitcher({ current, raised }: { current: PersonaId; raised?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [states, setStates] = useState<DevState[]>([]);
  useEffect(() => {
    const raw = document.cookie.split("; ").find((c) => c.startsWith(`${DEV_COOKIE}=`))?.slice(DEV_COOKIE.length + 1);
    setStates(parseDevStates(raw));
  }, [open]);
  const toggleState = (s: DevState) => {
    const next = states.includes(s) ? states.filter((x) => x !== s) : [...states, s];
    setStates(next);
    document.cookie = next.length ? `${DEV_COOKIE}=${next.join(",")}; path=/; samesite=lax` : `${DEV_COOKIE}=; path=/; max-age=0`;
    router.refresh();
  };
  const pick = (p: PersonaId) => {
    document.cookie = `tippla-persona=${p}; path=/; samesite=lax`;
    // A different person: drop the offline copies of the last one's pages (spec 10).
    try { navigator.serviceWorker?.controller?.postMessage({ type: "clear-pages" }); } catch { /* no service worker */ }
    setOpen(false);
    router.refresh();
  };
  return (
    <div className={cx("fixed left-t2 z-40 desktop:left-[calc(var(--sidebar-width)+8px)]",
      raised ? "bottom-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom)+88px)] desktop:bottom-[96px]" : "bottom-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom)+8px)] desktop:bottom-t4")}>
      {open && (
        <div role="menu" aria-label="Persona" className="mb-t2 flex flex-col rounded-md border border-line bg-surface p-t1 shadow-e2">
          {PERSONAS.map((p) => (
            <button key={p} role="menuitemradio" aria-checked={p === current} type="button" onClick={() => pick(p)}
              className={cx("min-h-tap rounded-sm px-t4 text-left text-small capitalize", p === current ? "bg-accent-soft text-accent" : "text-text hover:bg-surface2")}>
              {p}
            </button>
          ))}
          <p className="mt-t2 border-t border-line px-t4 pb-t1 pt-t2 text-caption text-text-muted">{statesCopy.devMenu}</p>
          {DEV_STATES.map((st) => (
            <button key={st} role="menuitemcheckbox" aria-checked={states.includes(st)} type="button" onClick={() => toggleState(st)}
              className={cx("min-h-tap rounded-sm px-t4 text-left text-small", states.includes(st) ? "bg-accent-soft text-accent" : "text-text hover:bg-surface2")}>
              {states.includes(st) ? "✓ " : ""}{statesCopy.devStates[st]}
            </button>
          ))}
        </div>
      )}
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((v) => !v)}
        className="min-h-tap rounded-pill border border-line bg-surface px-t4 text-caption capitalize text-text-muted shadow-e1">
        Dev · {current}{states.length ? ` · ${states.length} state${states.length > 1 ? "s" : ""}` : ""}
      </button>
    </div>
  );
}
