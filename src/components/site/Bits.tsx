// Small building blocks for the public site: page sections, a page heading, the phone-framed preview image (light and
// dark versions of a real portal screen, captured by scripts/capture-site-previews.mjs) and the Get started button.
import Link from "next/link";
import { cx } from "@/components/ui/cx";

export function Section({ id, children, className, tone = "plain", label }: { id?: string; children: React.ReactNode; className?: string; tone?: "plain" | "surface"; label?: string }) {
  return (
    <section id={id} aria-labelledby={label} className={cx("scroll-mt-[80px] px-t4 py-t7 min-[720px]:py-t8", tone === "surface" && "bg-surface", className)}>
      <div className="mx-auto max-w-[1120px]">{children}</div>
    </section>
  );
}

export function PageHead({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="flex max-w-[720px] flex-col gap-t3">
      <h1 className="text-[2rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-text min-[720px]:text-[2.75rem]">{title}</h1>
      {lead && <p className="text-[1.0625rem] leading-relaxed text-text-secondary">{lead}</p>}
    </div>
  );
}

export function StartButton({ children, size = "standard", className }: { children: React.ReactNode; size?: "standard" | "large"; className?: string }) {
  return (
    <Link href="/onboarding" className={cx("inline-flex min-h-tap items-center justify-center rounded-pill bg-cta font-bold text-on-accent shadow-cta",
      size === "large" ? "px-t6 py-t3 text-body" : "px-t5 text-body14", className)}>{children}</Link>
  );
}

/** A real portal screen in a phone frame; the dark version shows when the visitor's device is in dark mode. */
export function PhoneShot({ id, alt, priority = false, className }: { id: string; alt: string; priority?: boolean; className?: string }) {
  return (
    <div className={cx("overflow-hidden rounded-[28px] border-[6px] border-[color:var(--color-text)] bg-bg shadow-e3", className)}>
      <picture>
        <source media="(prefers-color-scheme: dark)" srcSet={`/site/preview-${id}-dark.jpg`} />
        {/* eslint-disable-next-line @next/next/no-img-element -- static screenshots, already sized */}
        <img src={`/site/preview-${id}-light.jpg`} alt={alt} width={390} height={780} loading={priority ? "eager" : "lazy"} className="block h-auto w-full" />
      </picture>
    </div>
  );
}
