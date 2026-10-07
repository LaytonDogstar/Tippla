"use client";
// App navigation (Today redesign, 07/10/2026; reference/today-desktop-mockup.html).
// Desktop (≥1,024): sidebar with five sections (Today · Money · Score & plan · Borrowing · Help & hardship) and the
// account entry at the bottom; the active section's own pages are listed under it, so every page stays reachable.
// Phones and tablets: fixed tab bar (Today · Money · Ask · Score · More). Ask is a raised circle; More opens a sheet
// with Borrowing, Help & hardship and Account (Hardship support: two taps from anywhere, one tap on Today).
// Badges count open "Needs a look" items per section, as pale tints.
import { CircleGauge, CreditCard, Ellipsis, House, LifeBuoy, Sparkles, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { nav } from "@/content/components";
import { cx } from "@/components/ui/cx";
import { Sheet } from "@/components/ui/Sheet";
import type { FeedSection } from "@/lib/feed/types";
import { track } from "@/lib/analytics/client";

export type Badges = Partial<Record<FeedSection, number>>;

type Section = { section: FeedSection; href: string; label: string; icon: LucideIcon; pages: { href: string; label: string }[] };

export const SECTIONS: Section[] = [
  { section: "today", href: "/", label: nav.sections.today, icon: House, pages: [{ href: "/", label: nav.home }, { href: "/progress", label: nav.items.lift }] },
  { section: "money", href: "/spending", label: nav.sections.money, icon: Wallet,
    pages: [{ href: "/spending", label: nav.items.spending }, { href: "/calendar", label: nav.items.calendar }, { href: "/subscriptions", label: nav.items.subscriptions }] },
  { section: "score", href: "/score", label: nav.sections.score, icon: CircleGauge, pages: [{ href: "/score", label: nav.items.smartscore }, { href: "/savings", label: nav.items.lift }] },
  { section: "borrowing", href: "/loans", label: nav.sections.borrowing, icon: CreditCard, pages: [{ href: "/loans", label: nav.items.loans }, { href: "/offers", label: nav.items.offers }] },
  { section: "help", href: "/hardship", label: nav.sections.help, icon: LifeBuoy, pages: [{ href: "/hardship", label: nav.items.hardship }, { href: "/help", label: nav.items.help }] },
];
const ACCOUNT_PAGES = [{ href: "/account", label: nav.items.account }, { href: "/notifications", label: nav.items.notifications }];

/** Without the Offers page when lender offers are off (UX round 2, 2.2). */
const withoutOffers = (pages: { href: string; label: string }[], hide?: boolean) => (hide ? pages.filter((p) => p.href !== "/offers") : pages);

const under = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
const sectionOf = (path: string): FeedSection | "account" | null => {
  if (ACCOUNT_PAGES.some((p) => under(path, p.href))) return "account";
  // "/" matches only Today itself; "/progress" belongs to Today too.
  return SECTIONS.find((s) => s.pages.some((p) => under(path, p.href)))?.section ?? null;
};

/**
 * The count after the label, so the link's name is its visible text plus a hidden tail:
 * "Money 4 things to look at" (label in name, WCAG 2.5.3). Pale tint, never a solid fill.
 */
function Badge({ n, className }: { n: number; className?: string }) {
  if (!n) return null;
  return (
    <>
      {" "}
      <span className={cx("inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-pill bg-accent-soft px-[6px] text-meta-s font-bold text-accent-strong", className)}>{n}</span>
      <span className="sr-only"> {nav.badgeTail(n)}</span>
    </>
  );
}

/** The tab bar reserves 64 px plus the safe area; pages pad their bottom by this. */
export const DOCK_RESERVE = "calc(var(--tab-bar-height) + env(safe-area-inset-bottom))";

const MORE: { label: string; pages: { href: string; label: string }[] }[] = [
  { label: nav.sections.help, pages: SECTIONS[4]!.pages },
  { label: nav.sections.borrowing, pages: SECTIONS[3]!.pages },
  { label: nav.groups.account, pages: ACCOUNT_PAGES },
];

export function MobileDock({ path: forced, preview, badges = {}, hideOffers }: { path?: string; preview?: string; badges?: Badges; hideOffers?: boolean }) {
  const current = usePathname();
  const path = forced ?? current ?? "/";
  const [more, setMore] = useState(false);
  const at = sectionOf(path);
  const tab = (t: { key: string; href: string; label: string; icon: LucideIcon; active: boolean; badge?: number; section?: FeedSection }) => (
    <li key={t.key}>
      <Link href={t.href} aria-current={t.active ? "page" : undefined}
        onClick={preview || !t.section ? undefined : () => track("nav_section_opened", { section: t.section!, had_badge: (t.badge ?? 0) > 0 })}
        className={cx("relative flex h-full min-h-tap flex-col items-center justify-center gap-[2px] text-meta-s font-semibold", t.active ? "text-accent" : "text-text-muted")}>
        <t.icon aria-hidden size={22} strokeWidth={1.8} />
        {t.label}
        <Badge n={t.badge ?? 0} className="absolute left-[calc(50%+6px)] top-[4px] min-h-[18px] min-w-[18px] px-[4px]" />
      </Link>
    </li>
  );
  const moreActive = at === "borrowing" || at === "help" || at === "account";
  const moreBadge = (badges.borrowing ?? 0) + (badges.help ?? 0);
  return (
    <div className={preview ? "w-full" : "fixed inset-x-0 bottom-0 z-30 desktop:hidden"}>
      <nav aria-label={preview ? `${nav.label} (${preview})` : nav.label} className="border-t border-divider bg-surface pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid h-tab max-w-[720px] grid-cols-5">
          {tab({ key: "today", href: "/", label: nav.tabs.today, icon: House, active: at === "today", badge: badges.today, section: "today" })}
          {tab({ key: "money", href: "/spending", label: nav.tabs.money, icon: Wallet, active: at === "money", badge: badges.money, section: "money" })}
          <li className="flex justify-center">
            <Link href="/assistant" aria-current={under(path, "/assistant") ? "page" : undefined} aria-label={nav.askLabel}
              className="pressable relative -top-[14px] flex h-[56px] w-[56px] flex-col items-center justify-center rounded-pill bg-cta text-hero-on shadow-cta">
              <Sparkles aria-hidden size={22} strokeWidth={1.8} />
              <span className="sr-only">{nav.tabs.ask}</span>
            </Link>
          </li>
          {tab({ key: "score", href: "/score", label: nav.tabs.score, icon: CircleGauge, active: at === "score", badge: badges.score, section: "score" })}
          <li>
            <button type="button" aria-haspopup="dialog" aria-expanded={more} onClick={() => setMore(true)}
              className={cx("relative flex h-full min-h-tap w-full flex-col items-center justify-center gap-[2px] text-meta-s font-semibold", moreActive ? "text-accent" : "text-text-muted")}>
              <Ellipsis aria-hidden size={22} strokeWidth={1.8} />
              {nav.tabs.more}
              <Badge n={moreBadge} className="absolute left-[calc(50%+6px)] top-[4px] min-h-[18px] min-w-[18px] px-[4px]" />
            </button>
          </li>
        </ul>
      </nav>
      {!preview && (
        <Sheet open={more} onClose={() => setMore(false)} title={nav.moreTitle}>
          <div className="flex flex-col gap-t5">
            {MORE.map((g) => (
              <div key={g.label}>
                <p className="pb-t1 text-meta text-text-muted">{g.label}</p>
                <ul className="flex flex-col">
                  {withoutOffers(g.pages, hideOffers).map((p) => (
                    <li key={p.href}>
                      <Link href={p.href} onClick={() => setMore(false)} aria-current={under(path, p.href) ? "page" : undefined}
                        className="flex min-h-[48px] items-center rounded-md px-t2 text-row text-text hover:bg-surface2">{p.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function SideLink({ href, label, icon: Icon, active, badge = 0, onClick, children }: {
  href: string; label: string; icon?: LucideIcon; active: boolean; badge?: number; onClick?: () => void; children?: React.ReactNode;
}) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} onClick={onClick}
      className={cx("flex min-h-[48px] items-center gap-t3 rounded-md px-t3 text-[0.9375rem] leading-5",
        active ? "bg-accent-soft font-bold text-accent-strong" : "font-semibold text-text-secondary hover:bg-surface2")}>
      {children ?? (Icon && <Icon aria-hidden size={20} strokeWidth={1.8} />)}
      <span className="flex-1">{label}</span>
      <Badge n={badge} />
    </Link>
  );
}

export function DesktopSidebar({ path: forced, brand = "Tippla", preview, badges = {}, name, hideOffers }: { path?: string; brand?: string; preview?: string; badges?: Badges; name?: string; hideOffers?: boolean }) {
  const current = usePathname();
  const path = forced ?? current ?? "/";
  const at = sectionOf(path);
  const subLinks = (pages: { href: string; label: string }[]) => (
    <ul className="mb-t2 ml-[44px] mt-t1 flex flex-col">
      {pages.map((p) => (
        <li key={p.href}>
          <Link href={p.href} aria-current={under(path, p.href) && (p.href !== "/" || path === "/") ? "page" : undefined}
            className={cx("flex min-h-tap items-center rounded-md px-t3 text-body14", under(path, p.href) ? "font-bold text-accent-strong" : "text-text-secondary hover:bg-surface2")}>{p.label}</Link>
        </li>
      ))}
    </ul>
  );
  return (
    <nav aria-label={preview ? `${nav.label} (${preview})` : nav.label}
      className={cx(preview ? "flex h-[780px]" : "fixed inset-y-0 left-0 z-30 hidden desktop:flex", "w-sidebar flex-col gap-t1 bg-surface px-t4 py-[28px] shadow-[1px_0_0_var(--color-divider)]")}>
      <p className="px-t3 pb-t6 text-wordmark text-text">{brand}</p>
      <div className="flex min-h-0 flex-1 flex-col gap-t1 overflow-y-auto">
        {SECTIONS.map((s) => (
          <div key={s.section}>
            <SideLink href={s.href} label={s.label} icon={s.icon} active={at === s.section} badge={badges[s.section] ?? 0}
              onClick={preview ? undefined : () => track("nav_section_opened", { section: s.section, had_badge: (badges[s.section] ?? 0) > 0 })} />
            {/* The section's own pages, when it's open (Today has none worth listing besides the plan). */}
            {at === s.section && withoutOffers(s.pages, hideOffers).length > 1 && s.section !== "today" && subLinks(withoutOffers(s.pages, hideOffers))}
          </div>
        ))}
      </div>
      <div className="shrink-0 pt-t4">
        <SideLink href="/account" label={name ? nav.accountEntry(name) : nav.items.account} active={at === "account"}>
          <span aria-hidden className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-pill bg-accent-tint2 text-body14 font-bold text-accent-strong">
            {(name ?? nav.items.account).slice(0, 1).toUpperCase()}
          </span>
        </SideLink>
        {at === "account" && subLinks(ACCOUNT_PAGES)}
      </div>
    </nav>
  );
}
