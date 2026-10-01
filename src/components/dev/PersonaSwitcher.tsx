"use client";
// Dev-only persona pill, bottom-left above the dock. Hidden in presentation mode (?present=1).
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PersonaId } from "@/lib/api/types";
import { cx } from "@/components/ui/cx";

const PERSONAS: PersonaId[] = ["jess", "marcus", "priya"];

export function PersonaSwitcher({ current, raised }: { current: PersonaId; raised?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const pick = (p: PersonaId) => {
    document.cookie = `tippla-persona=${p}; path=/; samesite=lax`;
    setOpen(false);
    router.refresh();
  };
  return (
    <div className={cx("fixed left-t2 z-40 desktop:left-[calc(var(--sidebar-width)+8px)]",
      raised ? "bottom-[calc(44px+var(--tab-bar-height)+env(safe-area-inset-bottom)+88px)] desktop:bottom-[96px]" : "bottom-[calc(44px+var(--tab-bar-height)+env(safe-area-inset-bottom)+8px)] desktop:bottom-t4")}>
      {open && (
        <div role="menu" aria-label="Persona" className="mb-t2 flex flex-col rounded-md border border-line bg-surface p-t1 shadow-e2">
          {PERSONAS.map((p) => (
            <button key={p} role="menuitemradio" aria-checked={p === current} type="button" onClick={() => pick(p)}
              className={cx("min-h-tap rounded-sm px-t4 text-left text-small capitalize", p === current ? "bg-accent-soft text-accent" : "text-text hover:bg-surface2")}>
              {p}
            </button>
          ))}
        </div>
      )}
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((v) => !v)}
        className="min-h-tap rounded-pill border border-line bg-surface px-t4 text-caption capitalize text-text-muted shadow-e1">
        Dev · {current}
      </button>
    </div>
  );
}
