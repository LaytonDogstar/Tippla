"use client";
// Component 17. Mobile: 44 px Hardship support row above a 64 px five-tab dock (links, aria-current=page).
// Desktop (≥1,024): 260 px grouped rail; Support group pinned so Hardship support is never below the fold.
import { ChartNoAxesColumn, CircleGauge, House, MessageCircle, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "@/content/components";
import { cx } from "@/components/ui/cx";

export const TABS: { href: string; label: string; icon: LucideIcon; match: string[] }[] = [
  { href: "/", label: nav.home, icon: House, match: ["/"] },
  { href: "/score", label: nav.score, icon: CircleGauge, match: ["/score", "/savings"] },
  { href: "/spending", label: nav.spending, icon: ChartNoAxesColumn, match: ["/spending", "/calendar", "/subscriptions"] },
  { href: "/loans", label: nav.loans, icon: Wallet, match: ["/loans", "/offers"] },
  { href: "/help", label: nav.support, icon: MessageCircle, match: ["/help", "/hardship"] },
];

const isActive = (path: string, match: string[]) => match.some((m) => (m === "/" ? path === "/" : path === m || path.startsWith(m + "/")));

/** The dock reserves 44 + 64 + safe area; pages pad their bottom by this. */
export const DOCK_RESERVE = "calc(44px + var(--tab-bar-height) + env(safe-area-inset-bottom))";

export function MobileDock({ path: forced, preview }: { path?: string; preview?: string }) {
  const current = usePathname();
  const path = forced ?? current ?? "/";
  return (
    <div className={preview ? "w-full" : "fixed inset-x-0 bottom-0 z-30 desktop:hidden"}>
      <Link href="/hardship" className="flex min-h-tap w-full items-center justify-center gap-t2 border-t border-line bg-surface text-small text-text-muted hover:bg-surface2"
        aria-current={path === "/hardship" ? "page" : undefined}>
        <MessageCircle aria-hidden size={16} />
        {nav.hardship}
      </Link>
      <nav aria-label={preview ? `${nav.label} (${preview})` : nav.label} className="border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <ul className="grid h-tab grid-cols-5">
          {TABS.map((t) => {
            const active = isActive(path, t.match);
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={active ? "page" : undefined}
                  className={cx("group flex h-full flex-col items-center justify-center gap-t1 text-caption text-[length:min(0.75rem,14px)] leading-tight", active ? "text-accent" : "text-text-muted")}>
                  <span className={cx("relative inline-flex h-[32px] w-[52px] items-center justify-center rounded-sm transition-colors duration-fast ease-tippla",
                    active ? "bg-accent-soft" : "group-hover:bg-surface2")}>
                    <t.icon aria-hidden size={24} />
                    {active && <span aria-hidden className="absolute bottom-0 h-[2px] w-[20px] bg-accent" />}
                  </span>
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

const GROUPS: { label?: string; items: { href: string; label: string }[] }[] = [
  { items: [{ href: "/", label: nav.home }] },
  { label: nav.groups.score, items: [{ href: "/score", label: nav.items.smartscore }, { href: "/savings", label: nav.items.lift }] },
  { label: nav.groups.spending, items: [{ href: "/spending", label: nav.items.spending }, { href: "/calendar", label: nav.items.calendar }, { href: "/subscriptions", label: nav.items.subscriptions }] },
  { label: nav.groups.loans, items: [{ href: "/loans", label: nav.items.loans }, { href: "/offers", label: nav.items.offers }] },
  { label: nav.groups.account, items: [{ href: "/account", label: nav.items.account }, { href: "/notifications", label: nav.items.notifications }] },
];
const SUPPORT = { label: nav.groups.support, items: [{ href: "/hardship", label: nav.items.hardship }, { href: "/help", label: nav.items.help }] };

function RailLink({ href, label, path }: { href: string; label: string; path: string }) {
  const active = href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={cx("relative flex min-h-[48px] items-center rounded-sm px-t3 text-body",
        active ? "bg-accent-soft text-body-strong text-accent before:absolute before:inset-y-t2 before:left-0 before:w-[3px] before:rounded-pill before:bg-accent" : "text-text hover:bg-surface2")}>
      {label}
    </Link>
  );
}

export function DesktopSidebar({ path: forced, brand = "Tippla", preview }: { path?: string; brand?: string; preview?: string }) {
  const current = usePathname();
  const path = forced ?? current ?? "/";
  return (
    <nav aria-label={preview ? `${nav.label} (${preview})` : nav.label} className={preview ? "flex h-[780px] w-sidebar flex-col bg-surface p-t3" : "fixed inset-y-0 left-0 z-30 hidden w-sidebar flex-col bg-surface p-t3 desktop:flex"}>
      <p className="px-t3 pb-t6 pt-t3 text-h1 font-display text-text">{brand}</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {GROUPS.map((g, i) => (
          <div key={i} className={cx(i > 0 && "mt-t4")}>
            {g.label && <p className="px-t3 pb-t1 text-caption text-text-muted">{g.label}</p>}
            {g.items.map((it) => <RailLink key={it.href} {...it} path={path} />)}
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-line pt-t3">
        <p className="px-t3 pb-t1 text-caption text-text-muted">{SUPPORT.label}</p>
        {SUPPORT.items.map((it) => <RailLink key={it.href} {...it} path={path} />)}
      </div>
    </nav>
  );
}
