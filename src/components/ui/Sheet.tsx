"use client";
// Component 09: bottom sheet below 1,024 px, right drawer at ≥1,024 px. Modal dialog pattern:
// focus moves in, Tab is contained, Escape and scrim close, focus returns to the trigger.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ui } from "@/content/components";
import { cx } from "./cx";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return desktop;
}

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Shows a Back control in the header (replacing content instead of stacking sheets). */
  onBack?: () => void;
}

export function Sheet({ open, onClose, title, subtitle, children, footer, onBack }: SheetProps) {
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  // Remember the trigger, make the rest of the page inert, lock scroll, focus the heading.
  useEffect(() => {
    if (!open) return;
    trigger.current = document.activeElement as HTMLElement | null;
    const app = document.getElementById("app-root");
    app?.setAttribute("inert", "");
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => heading.current?.focus());
    return () => {
      app?.removeAttribute("inert");
      document.body.style.overflow = overflow;
      setExpanded(false);
      const t = trigger.current;
      if (t && document.contains(t)) t.focus();
    };
  }, [open]);

  // Content replaced in place (a related step, or Back): the control that had focus is gone, so move
  // focus to the new heading rather than letting it fall to the page and lose Escape and the Tab trap.
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      if (!panel.current?.contains(document.activeElement)) heading.current?.focus();
    });
  }, [open, title]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
    if (e.key !== "Tab" || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!items.length) return;
    const first = items[0]!, last = items[items.length - 1]!;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, [onClose]);

  if (!mounted) return null;
  const dur = (ms: number) => (reduce ? 0 : ms / 1000);
  const ease = [0.22, 1, 0.36, 1] as const;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" onKeyDown={onKeyDown}>
          <motion.div
            className="absolute inset-0"
            style={{ background: "var(--color-scrim)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: dur(180), ease } }} exit={{ opacity: 0, transition: { duration: dur(180), ease } }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cx(
              "absolute flex flex-col bg-surface text-text shadow-e3",
              desktop
                ? "right-0 top-0 h-[100dvh] w-drawer max-w-full rounded-l-xl"
                : "inset-x-0 bottom-0 mx-auto w-full max-w-drawer rounded-t-xl",
              !desktop && (expanded ? "max-h-[calc(100dvh-20px)] h-[calc(100dvh-20px)]" : "max-h-[85dvh]"),
            )}
            initial={desktop ? { x: "100%" } : { y: "100%" }}
            animate={desktop ? { x: 0, transition: { duration: dur(260), ease } } : { y: 0, transition: { duration: dur(260), ease } }}
            exit={desktop ? { x: "100%", transition: { duration: dur(180), ease } } : { y: "100%", transition: { duration: dur(180), ease } }}
          >
            {!desktop && (
              <button
                type="button"
                className="mx-auto flex h-tap w-full items-center justify-center"
                aria-label={expanded ? ui.sheetHandleCollapse : ui.sheetHandleExpand}
                onClick={() => setExpanded((v) => !v)}
              >
                <span aria-hidden className="h-t1 w-t8 rounded-pill bg-neutral" />
              </button>
            )}
            <div className={cx("flex items-start gap-t3 px-t5", desktop ? "pt-t5" : "pt-t1")}>
              {onBack && (
                <button type="button" onClick={onBack} className="-ml-t3 min-h-tap min-w-tap rounded-sm px-t3 text-small text-accent hover:bg-surface2">
                  {ui.back}
                </button>
              )}
              <div className="min-w-0 flex-1 py-t2">
                <h2 id={titleId} ref={heading} tabIndex={-1} className="text-h2 font-display outline-none">{title}</h2>
                {subtitle && <p className="mt-t1 text-small text-text-muted">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={ui.close(title)}
                className="-mr-t3 inline-flex h-tap w-tap shrink-0 items-center justify-center rounded-sm text-text-muted hover:bg-surface2"
              >
                <X aria-hidden size={24} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-t5 pb-t5 pt-t3">{children}</div>
            {footer && (
              <div className="flex flex-col gap-t2 border-t border-line px-t5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-t3">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
