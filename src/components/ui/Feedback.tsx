"use client";
// Component 16: Toast (one at a time, polite), InlineAlert (info / caution — never a warning triangle),
// EmptyState (compact icon or 160×120 illustration), Skeleton (static, aria-hidden).
import { Check, Info, X, type LucideIcon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { emptyStates, ui, type EmptyVariant } from "@/content/components";
import { Button } from "./Button";
import { cx } from "./cx";
import { EmptyIllustration } from "./EmptyIllustration";
import { CalendarDays, CircleGauge, Landmark, Repeat, Search, Wallet } from "lucide-react";

// ---- Toast --------------------------------------------------------------------------------
interface ToastMsg { id: number; message: string; kind: "confirm" | "info"; onUndo?: () => void }
const ToastCtx = createContext<(t: Omit<ToastMsg, "id">) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const seq = useRef(0);
  const show = useCallback((t: Omit<ToastMsg, "id">) => setToast({ ...t, id: ++seq.current }), []);
  // A toast belongs to the screen that raised it: clear it when the customer moves to another page.
  const pathname = usePathname();
  useEffect(() => setToast(null), [pathname]);
  // Informational toasts dismiss after 6 s (paused on hover/focus); actionable ones persist.
  useEffect(() => {
    if (!toast || toast.onUndo || paused) return;
    const h = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(h);
  }, [toast, paused]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tab-bar-height)+44px+16px+env(safe-area-inset-bottom))] z-40 flex justify-center px-gutter desktop:bottom-t5">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
              onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
              className="pointer-events-auto flex w-full max-w-[350px] items-center gap-t3 rounded-sm border border-neutral bg-surface p-t4 shadow-e2"
            >
              {toast.kind === "confirm" ? <Check aria-hidden size={20} className="shrink-0 text-neutral" /> : <Info aria-hidden size={20} className="shrink-0 text-neutral" />}
              <p className="flex-1 text-small text-text">{toast.message}</p>
              {toast.onUndo && (
                <button type="button" className="min-h-tap min-w-tap rounded-sm px-t2 text-small text-accent hover:bg-surface2" onClick={() => { toast.onUndo?.(); setToast(null); }}>
                  {ui.undo}
                </button>
              )}
              <button type="button" aria-label={ui.closeShort} className="inline-flex h-tap w-tap items-center justify-center rounded-sm text-text-muted hover:bg-surface2" onClick={() => setToast(null)}>
                <X aria-hidden size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

// ---- InlineAlert ----------------------------------------------------------------------------
export function InlineAlert({ tone = "info", title, children, action }: {
  tone?: "info" | "caution"; title?: string; children?: ReactNode; action?: { label: string; onClick: () => void };
}) {
  return (
    <div className={cx("flex gap-t3 rounded-sm p-t4", tone === "info" ? "bg-info-soft text-info" : "bg-caution-soft text-caution")}>
      <Info aria-hidden size={20} className="mt-[2px] shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="text-h3">{title}</p>}
        {children && <div className={cx("text-small", title && "mt-t1")}>{children}</div>}
        {action && (
          <button type="button" onClick={action.onClick} className="-mx-t2 mt-t1 min-h-tap rounded-sm px-t2 text-small underline-offset-2 hover:underline">
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

// ---- EmptyState -----------------------------------------------------------------------------
const emptyIcons: Record<EmptyVariant, LucideIcon> = {
  noBankData: Landmark, noOffers: Wallet, noTransactions: CalendarDays, noSubscriptions: Repeat, noRecommendations: CircleGauge, noSearchResults: Search,
};

export function EmptyState({ variant, query = "", onAction, illustrated }: { variant: EmptyVariant; query?: string; onAction?: () => void; illustrated?: boolean }) {
  const c = emptyStates[variant];
  const Icon = emptyIcons[variant];
  const body = typeof c.body === "function" ? c.body(query) : c.body;
  return (
    <section className="rounded-md bg-surface p-t5">
      {illustrated ? (
        <EmptyIllustration variant={variant} />
      ) : (
        <div aria-hidden className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-md bg-accent-soft text-accent"><Icon size={24} /></div>
      )}
      <h2 className="mt-t6 text-h2 font-display text-text">{c.title}</h2>
      <p className="mt-t3 text-small text-text-muted">{body}</p>
      {onAction && <Button variant="secondary" className="mt-t5" onClick={onAction}>{c.action}</Button>}
    </section>
  );
}

// ---- Skeleton -------------------------------------------------------------------------------
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("rounded-xs bg-surface2", className)} />;
}

/** A busy region with one polite status; shows "Still loading" + Cancel after 8 s. */
export function LoadingRegion({ children, onCancel }: { children: ReactNode; onCancel?: () => void }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => { const h = setTimeout(() => setSlow(true), 8000); return () => clearTimeout(h); }, []);
  return (
    <div aria-busy="true">
      <span role="status" className="sr-only">{ui.loading}</span>
      {children}
      {slow && (
        <div className="mt-t3 flex items-center gap-t3">
          <p className="flex-1 text-h3 text-text">{ui.stillLoading}</p>
          {onCancel && <button type="button" className="min-h-tap rounded-sm px-t2 text-small text-accent hover:bg-surface2" onClick={onCancel}>{ui.cancel}</button>}
        </div>
      )}
    </div>
  );
}
