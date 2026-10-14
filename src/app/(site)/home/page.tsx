// The public home (redesign 14/10/2026, from tippla-homepage-mockup.html). "/" shows this to visitors who aren't
// signed in (middleware rewrite); members get Today. Feature visuals are markup with example figures
// (content/siteExamples), not screenshots. Every "See my SmartScore" goes to /onboarding.
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Landmark, LockKeyhole, Phone, ShieldCheck, SquareStack } from "lucide-react";
import { PRICE, site } from "@/content/site";
import { siteExamples as ex } from "@/content/siteExamples";
import { CycleCard, PlanCard, TrendCard } from "@/components/site/ExampleCards";
import { HeroPhone } from "@/components/site/HeroPhone";
import { cx } from "@/components/ui/cx";
import { daysBetween, formatShortDay } from "@/lib/format/dates";
import { formatCents, formatWhole } from "@/lib/format/money";

const t = site.home;
export const metadata: Metadata = { title: t.meta.title, description: t.meta.description };

const TRUST_ICONS = { lock: LockKeyhole, shield: ShieldCheck, bank: Landmark, accounts: SquareStack } as const;
const ROW_STYLE = {
  cycle: { panel: "bg-site-lilac", kicker: "text-site-indigo", tick: "text-site-indigo", visual: <CycleCard /> },
  plan: { panel: "bg-site-pink-tint", kicker: "text-site-magenta", tick: "text-site-magenta", visual: <PlanCard /> },
  score: { panel: "bg-site-teal-tint", kicker: "text-site-teal", tick: "text-site-teal", visual: <TrendCard /> },
} as const;

const wrap = "mx-auto w-full max-w-[1180px] px-t4 min-[480px]:px-t5";
const h2 = "text-[2rem] font-extrabold leading-[1.1] tracking-[-0.03em] min-[900px]:text-[2.5rem]";
const kicker = "text-[0.875rem] font-extrabold uppercase tracking-[0.08em]";
const focusDark = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-navy-on";

function Tick({ className }: { className?: string }) {
  return <Check aria-hidden size={20} strokeWidth={2.5} className={cx("shrink-0", className)} />;
}

export default function SiteHome() {
  const c = ex.cycle;
  return (
    <div className="bg-site-page text-site-text">
      {/* Hero */}
      <section aria-labelledby="hero-h" className="overflow-hidden bg-site-navy pb-t8 pt-t6 text-site-navy-on min-[900px]:pb-[96px] min-[900px]:pt-[56px]">
        <div className={cx(wrap, "grid items-center gap-t7 min-[901px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] min-[901px]:gap-[56px]")}>
          <div className="flex flex-col gap-t5">
            <p className="self-start rounded-pill bg-site-navy-chip px-[14px] py-t2 text-[0.8125rem] font-bold uppercase tracking-[0.06em] text-site-navy-muted">{t.hero.eyebrow}</p>
            <h1 id="hero-h" className="text-[2.5rem] font-extrabold leading-[1.04] tracking-[-0.03em] min-[901px]:text-[3.75rem]">
              {t.hero.title[0]}<br />{t.hero.title[1]}
            </h1>
            <p className="max-w-[520px] text-[1.125rem] leading-[1.55] text-site-navy-muted min-[901px]:text-[1.25rem]">{t.hero.body}</p>
            <div className="flex flex-wrap items-center gap-t3 pt-t2">
              <Link href="/onboarding" data-cta="hero" className={cx("inline-flex min-h-tap items-center gap-[10px] rounded-pill bg-site-navy-on px-[28px] py-[18px] text-[1.0625rem] font-extrabold text-site-navy hover:bg-site-lilac", focusDark)}>
                {t.start}<ArrowRight aria-hidden size={18} strokeWidth={2.5} />
              </Link>
              <Link href="/#how" className={cx("inline-flex min-h-tap items-center rounded-pill px-t5 py-[18px] text-body font-bold text-site-navy-on underline-offset-4 hover:underline", focusDark)}>{t.hero.how}</Link>
            </div>
            <ul data-testid="hero-ticks" className="flex flex-wrap gap-x-t5 gap-y-t2 pt-t1 text-[0.875rem] text-site-navy-muted">
              {t.hero.ticks.map((x) => <li key={x} className="inline-flex items-center gap-t2"><Check aria-hidden size={16} strokeWidth={2.5} className="text-site-navy-tick" />{x}</li>)}
            </ul>
          </div>

          <div className="relative flex justify-center py-t5">
            <div aria-hidden className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-site-navy-glow min-[901px]:h-[520px] min-[901px]:w-[520px]" />
            <HeroPhone data={ex.score} example={t.example} />
            {/* Callouts: hidden at 900px and below. */}
            <div className="absolute left-[-10px] top-[90px] hidden w-[190px] rotate-[-2deg] rounded-[18px] bg-site-surface px-t4 py-[14px] text-site-text shadow-[0_20px_40px_rgba(8,10,40,0.3)] motion-reduce:rotate-0 min-[901px]:block">
              <p className="flex items-center gap-t2 text-[0.75rem] font-bold text-site-magenta"><span aria-hidden className="h-[8px] w-[8px] rounded-full bg-site-magenta" />{t.hero.shortCallout.label(daysBetween(c.asOf, c.payday))}</p>
              <p className="mt-t1 text-[1.625rem] font-extrabold tracking-[-0.02em]">{t.hero.shortCallout.value(formatWhole(c.short))}</p>
              <p className="mt-[2px] text-[0.75rem] text-site-muted">{t.hero.shortCallout.detail(formatShortDay(c.payday))}</p>
            </div>
            <div className="absolute bottom-[24px] right-[-6px] hidden w-[200px] rotate-[2deg] rounded-[18px] bg-site-surface px-t4 py-[14px] text-site-text shadow-[0_20px_40px_rgba(8,10,40,0.3)] motion-reduce:rotate-0 min-[901px]:block">
              <p className="text-[0.75rem] font-bold text-site-teal">{t.hero.subsCallout.label}</p>
              <p className="mt-t1 text-[1.125rem] font-extrabold leading-snug">{t.hero.subsCallout.value(ex.streaming.count, formatCents(ex.streaming.monthly))}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section aria-label={t.trustLabel} className="border-b border-site-line bg-site-surface">
        <ul className={cx(wrap, "grid gap-t5 py-t6 min-[600px]:grid-cols-2 min-[901px]:grid-cols-4")}>
          {t.trust.map((x) => {
            const Icon = TRUST_ICONS[x.icon];
            return (
              <li key={x.title} className="flex items-center gap-[14px]">
                <span aria-hidden className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-[12px] bg-site-lilac text-site-indigo"><Icon size={22} /></span>
                <span><span className="block text-[0.9375rem] font-extrabold">{x.title}</span><span className="block text-[0.8125rem] text-site-muted">{x.body}</span></span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Features */}
      <section id="features" aria-labelledby="features-h" className="scroll-mt-t6 pb-t6 pt-t8 min-[901px]:pb-t7 min-[901px]:pt-[112px]">
        <div className={cx(wrap, "mb-t7 flex flex-col items-center gap-t4 text-center min-[901px]:mb-[72px]")}>
          <p className={cx(kicker, "text-site-indigo")}>{t.features.kicker}</p>
          <h2 id="features-h" className={cx(h2, "max-w-[720px] min-[901px]:text-[2.75rem]")}>{t.features.title}</h2>
        </div>
        {t.features.rows.map((r, i) => {
          const s = ROW_STYLE[r.id];
          return (
            <div key={r.id} id={r.id === "score" ? "score" : undefined}
              className={cx(wrap, "grid items-center gap-t6 min-[901px]:grid-cols-2 min-[901px]:gap-[72px]", i < t.features.rows.length - 1 && "mb-t8 min-[901px]:mb-[120px]")}>
              <div className={cx("flex justify-center rounded-[32px] px-t4 py-t6 min-[480px]:px-[40px] min-[480px]:py-[48px]", s.panel, i % 2 === 1 && "min-[901px]:order-2")}>{s.visual}</div>
              <div className="flex flex-col gap-[18px]">
                <p className={cx(kicker, s.kicker)}>{r.kicker}</p>
                <h3 className="text-[1.75rem] font-extrabold leading-[1.12] tracking-[-0.03em] min-[901px]:text-[2.375rem]">{r.title}</h3>
                <p className="text-[1.0625rem] leading-[1.6] text-site-muted min-[901px]:text-[1.125rem]">{r.body}</p>
                <ul className="flex flex-col gap-[10px] pt-[6px]">
                  {r.points.map((p) => <li key={p} className="flex gap-[10px] text-body font-semibold"><Tick className={s.tick} />{p}</li>)}
                </ul>
              </div>
            </div>
          );
        })}
      </section>

      {/* How it works */}
      <section id="how" aria-labelledby="how-h" className="scroll-mt-t6 py-t8 min-[901px]:py-[112px]">
        <div className={wrap}>
          <h2 id="how-h" className={cx(h2, "mb-t7")}>{t.how.title}</h2>
          <ol className="grid gap-t5 min-[901px]:grid-cols-3">
            {t.how.steps.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-t3 rounded-[24px] bg-site-surface p-t6 min-[901px]:p-[32px]">
                <span aria-hidden className="grid h-[44px] w-[44px] place-items-center rounded-full bg-site-navy text-[1.125rem] font-extrabold text-site-navy-on">{i + 1}</span>
                <h3 className="text-[1.3125rem] font-extrabold">{s.title}</h3>
                <p className="text-body leading-[1.6] text-site-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* On your side */}
      <section aria-labelledby="side-h" className="bg-site-ink py-t8 text-site-ink-on min-[901px]:py-[104px]">
        <div className={wrap}>
          <h2 id="side-h" className={cx(h2, "mb-t3")}>{t.side.title}</h2>
          <p className="mb-t7 max-w-[620px] text-[1.125rem] leading-[1.6] text-site-ink-muted">{t.side.body}</p>
          <ul className="grid gap-t5 min-[901px]:grid-cols-3">
            {t.side.items.map((s) => (
              <li key={s.title} className="rounded-[22px] border border-site-ink-line p-[28px]">
                <h3 className="text-[1.1875rem] font-extrabold">{s.title}</h3>
                <p className="mt-t2 text-[0.9375rem] leading-[1.6] text-site-ink-muted">{s.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing and FAQ */}
      <section id="pricing" aria-label={site.nav.links[2]!.label} className="scroll-mt-t6 py-t8 min-[901px]:py-[112px]">
        <div className={cx(wrap, "grid items-start gap-t7 min-[901px]:grid-cols-2 min-[901px]:gap-[72px]")}>
          <div data-testid="home-price-card" className="rounded-[28px] bg-site-surface p-t6 shadow-[0_20px_50px_rgba(39,47,126,0.08)] min-[480px]:p-[40px]">
            <h2 className={cx(kicker, "text-site-indigo")}>{t.pricing.kicker}</h2>
            <p className="mt-[14px] flex items-baseline gap-t2"><span className="text-[4rem] font-extrabold leading-none tracking-[-0.04em]">{PRICE}</span><span className="text-[1.125rem] font-semibold text-site-muted">{t.pricing.per}</span></p>
            <p className="mt-t1 text-[0.9375rem] text-site-muted">{t.pricing.terms}</p>
            <ul className="my-[28px] flex flex-col gap-t3">
              {t.pricing.includes.map((x) => <li key={x} className="flex gap-[10px] text-body font-semibold"><Tick className="text-site-indigo" />{x}</li>)}
            </ul>
            <Link href="/onboarding" data-cta="pricing" className="flex min-h-tap items-center justify-center rounded-pill bg-site-navy px-[28px] py-[18px] text-[1.0625rem] font-extrabold text-site-navy-on hover:bg-site-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-navy">{t.start}</Link>
            <Link href="/pricing" className="mt-t3 flex min-h-tap items-center justify-center text-body14 font-bold text-site-indigo underline-offset-2 hover:underline">{t.pricing.more}</Link>
          </div>

          <div id="faq" className="flex scroll-mt-t6 flex-col gap-t3">
            <h2 className={cx(h2, "mb-t3 min-[901px]:text-[2.25rem]")}>{t.faq.title}</h2>
            {t.faq.items.map((f, i) => (
              <details key={f.q} open={i === 0} className="group rounded-[18px] bg-site-surface px-t5 py-t2">
                <summary className="flex min-h-tap cursor-pointer list-none items-center justify-between gap-t3 rounded-sm text-[1.0625rem] font-extrabold [&::-webkit-details-marker]:hidden">
                  {f.q}<span aria-hidden className="text-[1.25rem] font-bold text-site-indigo transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
                </summary>
                <p className="pb-t3 text-[0.9375rem] leading-[1.6] text-site-muted">{f.a}</p>
              </details>
            ))}
            <Link href="/faq" className="inline-flex min-h-tap items-center self-start text-body14 font-bold text-site-indigo underline-offset-2 hover:underline">{t.faq.more}</Link>
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section aria-labelledby="cta-h" className="pb-t8 min-[901px]:pb-[96px]">
        <div className={wrap}>
          <div className="flex flex-wrap items-center justify-between gap-t6 rounded-[32px] bg-site-navy px-t6 py-t7 text-site-navy-on min-[901px]:px-[48px] min-[901px]:py-[64px]">
            <div className="max-w-[600px]">
              <h2 id="cta-h" className="text-[2rem] font-extrabold leading-[1.1] tracking-[-0.03em] min-[901px]:text-[2.625rem]">{t.cta.title}</h2>
              <p className="mt-[14px] text-[1.125rem] text-site-navy-muted">{t.cta.body}</p>
            </div>
            <Link href="/onboarding" data-cta="final" className={cx("inline-flex min-h-tap items-center rounded-pill bg-site-navy-on px-[32px] py-[20px] text-[1.125rem] font-extrabold text-site-navy hover:bg-site-lilac", focusDark)}>{t.start}</Link>
          </div>
        </div>
      </section>

      {/* Free help, for anyone */}
      <section aria-labelledby="help-h" className="pb-t8 min-[901px]:pb-[96px]">
        <div className={wrap}>
          <div className="flex flex-wrap items-center justify-between gap-t5 rounded-[24px] border border-site-line bg-site-surface p-t6 min-[901px]:p-[32px]">
            <div className="max-w-[420px]">
              <h2 id="help-h" className="text-[1.25rem] font-extrabold">{t.help.title}</h2>
              <p className="mt-[6px] text-[0.9375rem] leading-[1.6] text-site-muted">{t.help.body} <Link href="/support" className="font-bold text-site-indigo underline underline-offset-2">{t.help.more}</Link></p>
            </div>
            <ul className="flex flex-wrap gap-t3">
              {t.help.items.map((h) => (
                <li key={h.href}>
                  <a href={h.href} className="flex min-h-tap items-center gap-t3 rounded-[16px] bg-site-page px-t5 py-[14px] hover:bg-site-lilac focus-visible:outline focus-visible:outline-2 focus-visible:outline-site-indigo">
                    <Phone aria-hidden size={18} className="shrink-0 text-site-indigo" />
                    <span className="flex flex-col"><span className="text-[0.875rem] font-extrabold">{h.label}</span><span className="text-body font-extrabold text-site-indigo">{h.tel}</span></span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
