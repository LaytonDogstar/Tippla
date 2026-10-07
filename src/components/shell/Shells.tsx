// Page chrome. Onboarding: Back + Support header, no tabs (they'd be consent-bypassing routes before setup),
// optional fixed footer with the primary action and a visible Hardship support link.
// Portal: header, content padded clear of the dock, mobile dock + desktop rail, dev persona pill.
import { OnboardingStep, type OnboardingStepId } from "@/components/analytics/OnboardingStep";
import { ChevronLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { onboarding as t } from "@/content/onboarding";
import { nav } from "@/content/components";
import { DesktopSidebar, MobileDock, type Badges } from "@/components/nav/Navigation";
import { PersonaSwitcher } from "@/components/dev/PersonaSwitcher";
import type { PersonaId } from "@/lib/api/types";

function Header({ backHref, title, titleLarge }: { backHref?: string; title?: string; titleLarge?: boolean }) {
  return (
    <header className="flex min-h-[64px] items-center gap-t2 px-gutter pt-t3">
      {backHref ? (
        <Link href={backHref} aria-label={t.shell.back} className="-ml-t3 inline-flex h-tap w-tap items-center justify-center rounded-sm text-text hover:bg-surface2">
          <ChevronLeft aria-hidden size={24} />
        </Link>
      ) : <span className="w-t2" />}
      {title && (titleLarge
        ? <h1 className="flex-1 text-h1 font-display text-text">{title}</h1>
        : <p className="flex-1 text-center text-h3 text-text">{title}</p>)}
      {!title && <span className="flex-1" />}
      <Link href="/help" aria-label={t.shell.support} className="-mr-t2 inline-flex h-tap w-tap items-center justify-center rounded-pill text-accent hover:bg-surface2">
        <MessageCircle aria-hidden size={24} />
      </Link>
    </header>
  );
}

export function OnboardingShell({ backHref, title, footer, children, step, connected }: { backHref?: string; title?: string; footer?: ReactNode; children: ReactNode; step?: OnboardingStepId; connected?: boolean }) {
  return (
    <div className="min-h-[100dvh] bg-bg text-text">
      {step && <OnboardingStep step={step} connected={connected} />}
      <div className="mx-auto max-w-[480px]">
        <Header backHref={backHref} title={title} titleLarge />
        <main id="main" className="px-gutter pb-[calc(160px+env(safe-area-inset-bottom))]">{children}</main>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg">
        <div className="mx-auto flex max-w-[480px] flex-col gap-t2 px-gutter pt-t3">
          {footer}
          <Link href="/hardship" className="flex min-h-tap items-center justify-center gap-t2 rounded-sm text-small text-text-muted hover:bg-surface2">
            <MessageCircle aria-hidden size={16} />
            {nav.hardship}
          </Link>
          <span className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </div>
  );
}

/** Large page header: "Hi Jess" / "SmartScore", a freshness line and one icon action (bell, info). */
export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <header className="flex items-start gap-t3 px-gutter pb-t2 pt-t5">
      <div className="min-w-0 flex-1">
        <h1 className="text-h1 font-display text-text">{title}</h1>
        {sub && <p className="mt-t1 text-small text-text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

/** The portal frame. Pages use PortalShell from ./Portal (server), which adds state notices and gates. */
export function PortalFrame({ path, title, backHref, persona, present, cta, header, wide, notice, badges, name, children }: {
  /** The member's first name, for the sidebar's account entry. */
  name?: string;
  path: string; title?: string; backHref?: string; persona: PersonaId; present: boolean;
  /** Open "Needs a look" items per nav section. */
  badges?: Badges;
  /** Above the content: offline / stale-data notices. */
  notice?: ReactNode;
  /** Replaces the default small header (dashboard, SmartScore). */
  header?: ReactNode;
  /** Desktop pages that use two columns. */
  wide?: boolean;
  /** Fixed call to action above the dock (reveal screens). */
  cta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-bg text-text desktop:pl-sidebar">
      <div className={wide ? "mx-auto max-w-[720px] desktop:max-w-[1240px]" : "mx-auto max-w-[720px]"}>
        {header ?? <Header backHref={backHref} title={title} />}
        {notice && <div className="px-gutter pb-t2">{notice}</div>}
        <main id="main" className={cta ? "px-gutter pb-[calc(var(--tab-bar-height)+80px+env(safe-area-inset-bottom)+16px)]" : "px-gutter pb-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom)+24px)]"}>
          {children}
        </main>
      </div>
      {cta && (
        <div className="fixed inset-x-0 bottom-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom))] z-20 border-t border-line bg-bg desktop:bottom-0 desktop:left-sidebar">
          <div className="mx-auto max-w-[720px] px-gutter py-t4">{cta}</div>
        </div>
      )}
      <MobileDock path={path} badges={badges} />
      <DesktopSidebar path={path} badges={badges} name={name} />
      {!present && <PersonaSwitcher current={persona} raised={!!cta} />}
    </div>
  );
}
