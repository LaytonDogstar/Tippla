"use client";
// The public site's header: wordmark, the five page links, Log in and Get started. On a phone the links sit in a
// disclosure menu (Escape or a link closes it); Get started stays visible.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { site } from "@/content/site";
import { cx } from "@/components/ui/cx";

const t = site.nav;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const link = "inline-flex min-h-tap items-center rounded-pill px-t3 text-body14 font-semibold text-text-secondary hover:bg-surface2 hover:text-text";
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-[color:color-mix(in_srgb,var(--color-bg)_88%,transparent)] backdrop-blur">
      <div className="mx-auto flex h-[64px] max-w-[1120px] items-center gap-t3 px-t4">
        <Link href="/" aria-label={t.home} className="mr-auto inline-flex min-h-tap items-center text-[1.375rem] font-extrabold tracking-[-0.02em] text-text">{site.name}</Link>
        <nav aria-label={t.label} className="hidden items-center gap-[2px] min-[900px]:flex">
          {t.links.map((l) => <Link key={l.href} href={l.href} className={link}>{l.label}</Link>)}
        </nav>
        <Link href="/login" className={cx(link, "hidden min-[560px]:inline-flex")}>{t.login}</Link>
        <Link href="/onboarding" className="inline-flex min-h-tap items-center rounded-pill bg-cta px-t4 text-body14 font-bold text-on-accent shadow-cta">{t.start}</Link>
        <button type="button" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen((o) => !o)}
          className="inline-flex h-tap w-tap items-center justify-center rounded-pill text-text hover:bg-surface2 min-[900px]:hidden">
          {open ? <X aria-hidden size={22} /> : <Menu aria-hidden size={22} />}
          <span className="sr-only">{open ? t.close : t.menu}</span>
        </button>
      </div>
      {open && (
        <nav id="site-menu" aria-label={t.label} className="border-t border-line bg-bg px-t4 pb-t4 pt-t2 min-[900px]:hidden">
          <ul className="flex flex-col">
            {t.links.map((l) => <li key={l.href}><Link href={l.href} onClick={() => setOpen(false)} className="flex min-h-tap items-center text-body font-semibold text-text">{l.label}</Link></li>)}
            <li><Link href="/login" onClick={() => setOpen(false)} className="flex min-h-tap items-center text-body font-semibold text-text">{t.login}</Link></li>
          </ul>
        </nav>
      )}
    </header>
  );
}
