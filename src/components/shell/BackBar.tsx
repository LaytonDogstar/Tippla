"use client";
// Back control and navigation memory (journeys brief A1, 12/10/2026).
// - NavMemory (once per page, in the frame): tags cross-page links with `origin` (the page they were tapped on),
//   keeps a short stack of visited URLs and each page's scroll position, and restores the scroll position when
//   the back control returns to a page. Sidebar and tab-bar links (data-nav-root) are top-level: never tagged.
// - BackBar: "← Back to Today" (the origin) or the page's logical parent. A real button in the page, so it works
//   with no browser chrome (the app added to the home screen).
import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { ORIGIN_PARAM, backTarget, originOf, withFrom } from "@/lib/nav/back";
import { ui } from "@/content/components";

const STACK = "tippla-nav";
const SCROLL = "tippla-scroll";
const RESTORE = "tippla-restore";

const read = <T,>(k: string, fallback: T): T => { try { return (JSON.parse(sessionStorage.getItem(k) ?? "null") as T) ?? fallback; } catch { return fallback; } };
const write = (k: string, v: unknown) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: no memory */ } };
const here = () => originOf(window.location.pathname, window.location.search);

/** Scroll to y once the page has stopped growing (data loaded, layout settled), or after ~2s. */
export function scrollWhenSettled(y: () => number | null, done?: () => void) {
  let last = -1, still = 0, frames = 0;
  const step = () => {
    const h = document.documentElement.scrollHeight;
    still = h === last ? still + 1 : 0;
    last = h;
    if (still >= 6 || ++frames > 120) {
      const target = y();
      if (target !== null) window.scrollTo({ top: target, behavior: "auto" });
      done?.();
      return;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function Memory() {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  // Visited stack (for "was the origin the page before this one?") and the scroll restore on return.
  useEffect(() => {
    const url = originOf(pathname, `?${search.toString()}`);
    const stack = read<string[]>(STACK, []);
    if (stack.at(-1) !== url) {
      if (stack.at(-2) === url) stack.pop(); else stack.push(url);
      write(STACK, stack.slice(-20));
    }
    if (read<string | null>(RESTORE, null) === url) {
      const saved = read<Record<string, number>>(SCROLL, {})[url];
      scrollWhenSettled(() => saved ?? null, () => write(RESTORE, null));
    } else if (window.location.hash.length > 1) {
      // A deep link to a section: scroll only once the page has finished laying out (sticky chips are 72px).
      const id = decodeURIComponent(window.location.hash.slice(1));
      scrollWhenSettled(() => { const el = document.getElementById(id); return el ? Math.max(0, el.getBoundingClientRect().top + window.scrollY - 72) : null; });
    }
  }, [pathname, search]);
  // Each page's scroll position.
  useEffect(() => {
    let t: number | undefined;
    const save = () => { window.clearTimeout(t); t = window.setTimeout(() => write(SCROLL, { ...read<Record<string, number>>(SCROLL, {}), [here()]: window.scrollY }), 120); };
    window.addEventListener("scroll", save, { passive: true });
    return () => { window.removeEventListener("scroll", save); window.clearTimeout(t); };
  }, []);
  // Cross-page links carry the page they were tapped on.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.closest("[data-nav-root]")) return;
      const raw = a.getAttribute("href") ?? "";
      if (!raw.startsWith("/") || raw.startsWith("//")) return;
      const next = withFrom(raw, here());
      if (next === raw) return;
      e.preventDefault();
      router.push(next);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);
  return null;
}

export function NavMemory() {
  return <Suspense fallback={null}><Memory /></Suspense>;
}

/** Where "Back" goes from here, and the click handler that gets there (restoring the origin's scroll position). */
export function useBack(fallback?: string) {
  const search = useSearchParams();
  const router = useRouter();
  const target = backTarget(search.get(ORIGIN_PARAM), fallback);
  const go = (e: React.MouseEvent) => {
    if (!target) return;
    e.preventDefault();
    write(RESTORE, target.href);
    // Straight back through history when the origin was the page before (keeps everything as it was).
    const stack = read<string[]>(STACK, []);
    if (stack.at(-2) === target.href && window.history.length > 1) router.back();
    else router.push(target.href);
  };
  return { target, go };
}

/** "← Back to Today" inline, where the customer landed deep in a page (only when there's an origin). */
export function BackInline({ className }: { className?: string }) {
  const { target, go } = useBack();
  if (!target) return null;
  return (
    <a href={target.href} onClick={go} data-nav-root data-testid="back-inline"
      className={className ?? "inline-flex min-h-tap items-center gap-t1 font-semibold text-accent hover:text-accent-strong"}>
      <ChevronLeft aria-hidden size={18} />{ui.backTo(target.label)}
    </a>
  );
}

function Bar({ fallback }: { fallback?: string }) {
  const { target, go } = useBack(fallback);
  if (!target) return null;
  return (
    <div className="px-gutter pt-t3 desktop:pt-t5">
      <a href={target.href} onClick={go} data-nav-root data-testid="back-control"
        className="inline-flex min-h-tap items-center gap-t1 rounded-pill pr-t3 text-body14 font-semibold text-accent hover:text-accent-strong">
        <ChevronLeft aria-hidden size={20} />{ui.backTo(target.label)}
      </a>
    </div>
  );
}

export function BackBar({ fallback }: { fallback?: string }) {
  return <Suspense fallback={null}><Bar fallback={fallback} /></Suspense>;
}
