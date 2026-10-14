"use client";
// The public site's header, on navy (homepage redesign 14/10/2026): wordmark, the five page links, Log in and the
// "See my SmartScore" pill. At 900px and below the links sit in a disclosure menu (Escape or a link closes it);
// the pill stays visible.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { site } from "@/content/site";
import { cx } from "@/components/ui/cx";

const t = site.nav;
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-navy-on";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const link = cx("inline-flex min-h-tap items-center rounded-pill px-t3 text-[0.9375rem] font-semibold text-site-navy-muted hover:bg-site-navy-chip hover:text-site-navy-on", focus);
  return (
    <header className="relative z-20 bg-site-navy text-site-navy-on">
      <div className="mx-auto flex h-[72px] max-w-[1180px] items-center gap-t2 px-t4 min-[480px]:px-t5">
        <Link href="/" aria-label={t.home} className={cx("mr-auto inline-flex min-h-tap items-center rounded-sm text-[1.375rem] font-extrabold tracking-[-0.02em]", focus)}>{site.name}</Link>
        <nav aria-label={t.label} className="hidden items-center gap-t1 min-[901px]:flex">
          {t.links.map((l) => <Link key={l.href} href={l.href} className={link}>{l.label}</Link>)}
        </nav>
        <Link href="/login" className={cx(link, "hidden text-site-navy-on min-[560px]:inline-flex min-[901px]:ml-t3")}>{t.login}</Link>
        <Link href="/onboarding" data-cta="nav" className={cx("inline-flex min-h-tap items-center whitespace-nowrap rounded-pill bg-site-navy-on px-t4 text-[0.9375rem] font-bold text-site-navy hover:bg-site-lilac min-[480px]:px-t5", focus)}>{t.start}</Link>
        <button type="button" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen((o) => !o)}
          className={cx("inline-flex h-tap w-tap shrink-0 items-center justify-center rounded-pill hover:bg-site-navy-chip min-[901px]:hidden", focus)}>
          {open ? <X aria-hidden size={22} /> : <Menu aria-hidden size={22} />}
          <span className="sr-only">{open ? t.close : t.menu}</span>
        </button>
      </div>
      {open && (
        <nav id="site-menu" aria-label={t.label} className="border-t border-site-navy-chip px-t4 pb-t4 pt-t2 min-[901px]:hidden">
          <ul className="flex flex-col">
            {t.links.map((l) => <li key={l.href}><Link href={l.href} onClick={() => setOpen(false)} className={cx("flex min-h-tap items-center rounded-sm text-body font-semibold", focus)}>{l.label}</Link></li>)}
            <li><Link href="/login" onClick={() => setOpen(false)} className={cx("flex min-h-tap items-center rounded-sm text-body font-semibold", focus)}>{t.login}</Link></li>
          </ul>
        </nav>
      )}
    </header>
  );
}
