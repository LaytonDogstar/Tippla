"use client";
// Component 17. Mobile: 44 px Hardship support row above a 64 px five-tab dock (links, aria-current=page).
// Desktop (≥1,024): 260 px grouped rail; Help group pinned so Hardship support is never below the fold.
// Sections (05/10): Today · Money · Score · Borrowing · Help. Badges count open "Needs a look" items.
import { ChartNoAxesColumn, CircleGauge, House, MessageCircle, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "@/content/components";
import { cx } from "@/components/ui/cx";
import type { FeedSection } from "@/lib/feed/types";

export type Badges = Partial<Record<FeedSection, number>>;

export const TABS: { section: FeedSection; href: string; label: string; icon: LucideIcon; match: string[] }[] = [
  { section: "today", href: "/", label: nav.home, icon: House, match: ["/", "/progress"] },
  { section: "money", href: "/spending", label: nav.spending, icon: ChartNoAxesColumn, match: ["/spending", "/calendar", "/subscriptions"] },
  { section: "score", href: "/score", label: nav.score, icon: CircleGauge, match: ["/score", "/savings"] },
  { section: "borrowing", href: "/loans", label: nav.loans, icon: Wallet, match: ["/loans", "/offers"] },
  { section: "help", href: "/help", label: nav.support, icon: MessageCircle, match: ["/help", "/hardship"] },
];

/**
 * The count, after the label in the markup, so the link's name is its visible text plus a hidden tail:
 * "Money 4 things to look at" (label in name, WCAG 2.5.3).
 */
function Badge({ n, className }: { n: number; className?: string }) {
  if (!n) return null;
  return (
    <>
      {" "}
      <span className={cx("tnum inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-accent px-[5px] text-[length:min(0.6875rem,13px)] leading-none text-on-accent", className)}>{n}</span>
      <span className="sr-only"> {nav.badgeTail(n)}</span>
    </>
  );
}

const isActive = (path: string, match: string[]) => match.some((m) => (m === "/" ? path === "/" : path === m || path.startsWith(m + "/")));

/** The dock reserves 44 + 64 + safe area; pages pad their bottom by this. */
export const DOCK_RESERVE = "calc(44px + var(--tab-bar-height) + env(safe-area-inset-bottom))";

export function MobileDock({ path: forced, preview, badges = {} }: { path?: string; preview?: string; badges?: Badges }) {
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
                  className={cx("group relative flex h-full flex-col items-center justify-center gap-t1 text-caption text-[length:min(0.75rem,14px)] leading-tight", active ? "text-accent" : "text-text-muted")}>
                  <span className={cx("relative inline-flex h-[32px] w-[52px] items-center justify-center rounded-sm transition-colors duration-fast ease-tippla",
                    active ? "bg-accent-soft" : "group-hover:bg-surface2")}>
                    <t.icon aria-hidden size={24} />
                    {active && <span aria-hidden className="absolute bottom-0 h-[2px] w-[20px] bg-accent" />}
                  </span>
                  {t.label}
                  <Badge n={badges[t.section] ?? 0} className="absolute left-[calc(50%+12px)] top-[6px]" />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

const GROUPS: { section: FeedSection; label?: string; items: { href: string; label: string }[] }[] = [
  { section: "today", items: [{ href: "/", label: nav.home }] },
  { section: "money", label: nav.groups.spending, items: [{ href: "/spending", label: nav.items.spending }, { href: "/calendar", label: nav.items.calendar }, { href: "/subscriptions", label: nav.items.subscriptions }] },
  { section: "score", label: nav.groups.score, items: [{ href: "/score", label: nav.items.smartscore }, { href: "/savings", label: nav.items.lift }] },
  { section: "borrowing", label: nav.groups.loans, items: [{ href: "/loans", label: nav.items.loans }, { href: "/offers", label: nav.items.offers }] },
];
const SUPPORT = { label: nav.groups.support, items: [{ href: "/hardship", label: nav.items.hardship }, { href: "/help", label: nav.items.help }] };
/** Account lives with the profile, not in the sections. */
const PROFILE = [{ href: "/account", label: nav.items.account }, { href: "/notifications", label: nav.items.notifications }];

function RailLink({ href, label, path, badge = 0 }: { href: string; label: string; path: string; badge?: number }) {
  const active = href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={cx("relative flex min-h-[48px] items-center rounded-sm px-t3 text-body",
        active ? "bg-accent-soft text-body-strong text-accent before:absolute before:inset-y-t2 before:left-0 before:w-[3px] before:rounded-pill before:bg-accent" : "text-text hover:bg-surface2")}>
      <span className="flex-1">{label}</span>
      <Badge n={badge} />
    </Link>
  );
}

export function DesktopSidebar({ path: forced, brand = "Tippla", preview, badges = {} }: { path?: string; brand?: string; preview?: string; badges?: Badges }) {
  const current = usePathname();
  const path = forced ?? current ?? "/";
  return (
    <nav aria-label={preview ? `${nav.label} (${preview})` : nav.label} className={preview ? "flex h-[780px] w-sidebar flex-col bg-surface p-t3" : "fixed inset-y-0 left-0 z-30 hidden w-sidebar flex-col bg-surface p-t3 desktop:flex"}>
      <p className="px-t3 pb-t6 pt-t3 text-h1 font-display text-text">{brand}</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {GROUPS.map((g, i) => (
          <div key={i} className={cx(i > 0 && "mt-t4")}>
            {g.label && <p className="px-t3 pb-t1 text-caption text-text-muted">{g.label}</p>}
            {g.items.map((it, j) => <RailLink key={it.href} {...it} path={path} badge={j === 0 ? badges[g.section] ?? 0 : 0} />)}
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-line pt-t3">
        <p className="px-t3 pb-t1 text-caption text-text-muted">{SUPPORT.label}</p>
        {SUPPORT.items.map((it) => <RailLink key={it.href} {...it} path={path} />)}
        <div className="mt-t2 border-t border-line pt-t2">{PROFILE.map((it) => <RailLink key={it.href} {...it} path={path} />)}</div>
      </div>
    </nav>
  );
}
