// Page chrome. Onboarding: Back + Support header, no tabs (they'd be consent-bypassing routes before setup),
// optional fixed footer with the primary action and a visible Hardship support link.
// Portal: header, content padded clear of the dock, mobile dock + desktop rail, dev persona pill.
import { ChevronLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { onboarding as t } from "@/content/onboarding";
import { nav } from "@/content/components";
import { DesktopSidebar, MobileDock } from "@/components/nav/Navigation";
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

export function OnboardingShell({ backHref, title, footer, children }: { backHref?: string; title?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-bg text-text">
      <div className="mx-auto max-w-[480px]">
        <Header backHref={backHref} title={title} titleLarge />
        <main id="main" className="px-gutter pb-[calc(160px+env(safe-area-inset-bottom))]">{children}</main>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg">
        <div className="mx-auto flex max-w-[480px] flex-col gap-t2 px-gutter pt-t3">
          {footer}
          <Link href="/hardship" className="flex h-tap items-center justify-center gap-t2 rounded-sm text-small text-text-muted hover:bg-surface2">
            <MessageCircle aria-hidden size={16} />
            {nav.hardship}
          </Link>
          <span className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </div>
  );
}

export function PortalShell({ path, title, backHref, persona, present, cta, children }: {
  path: string; title?: string; backHref?: string; persona: PersonaId; present: boolean;
  /** Fixed call to action above the dock (reveal screens). */
  cta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-bg text-text desktop:pl-sidebar">
      <div className="mx-auto max-w-[720px]">
        <Header backHref={backHref} title={title} />
        <main id="main" className={cta ? "px-gutter pb-[calc(44px+var(--tab-bar-height)+80px+env(safe-area-inset-bottom)+16px)]" : "px-gutter pb-[calc(44px+var(--tab-bar-height)+env(safe-area-inset-bottom)+24px)]"}>
          {children}
        </main>
      </div>
      {cta && (
        <div className="fixed inset-x-0 bottom-[calc(44px+var(--tab-bar-height)+env(safe-area-inset-bottom))] z-20 border-t border-line bg-bg desktop:bottom-0 desktop:left-sidebar">
          <div className="mx-auto max-w-[720px] px-gutter py-t4">{cta}</div>
        </div>
      )}
      <MobileDock path={path} />
      <DesktopSidebar path={path} />
      {!present && <PersonaSwitcher current={persona} raised={!!cta} />}
    </div>
  );
}
