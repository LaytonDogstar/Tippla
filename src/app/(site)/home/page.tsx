// The public home (14/10/2026). "/" shows this to visitors who aren't signed in (middleware rewrite); members get Today.
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Check, CircleGauge, Compass, HandHeart, Landmark, LayoutGrid, Phone, Repeat, ShieldCheck, Wallet } from "lucide-react";
import { site } from "@/content/site";
import { PhoneShot, Section, StartButton } from "@/components/site/Bits";

const t = site.home;
export const metadata: Metadata = { title: t.meta.title, description: t.meta.description };

const FEATURE_ICONS = [Wallet, CircleGauge, LayoutGrid, CalendarDays, Repeat, HandHeart];
const SIDE_ICONS = [Landmark, ShieldCheck, Compass];

export default function SiteHome() {
  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-h" className="overflow-hidden bg-hero px-t4 pb-t7 pt-t7 text-hero-on min-[720px]:pb-t8 min-[720px]:pt-t8">
        <div className="mx-auto grid max-w-[1120px] items-center gap-t7 min-[900px]:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col gap-t4">
            <p className="text-meta font-bold uppercase tracking-[.08em] text-hero-on-muted">{t.hero.eyebrow}</p>
            <h1 id="hero-h" className="text-[2.25rem] font-extrabold leading-[1.08] tracking-[-0.03em] min-[720px]:text-[3.25rem]">{t.hero.title}</h1>
            <p className="max-w-[46ch] text-[1.0625rem] leading-relaxed text-hero-on-muted min-[720px]:text-[1.1875rem]">{t.hero.body}</p>
            <div className="mt-t2 flex flex-wrap items-center gap-t3">
              <Link href="/onboarding" className="inline-flex min-h-tap items-center justify-center rounded-pill bg-surface px-t6 py-t3 text-body font-bold text-accent-strong shadow-e2">{t.hero.start}</Link>
              <Link href="/login" className="inline-flex min-h-tap items-center justify-center rounded-pill px-t5 py-t3 text-body font-bold text-hero-on ring-1 ring-inset ring-[color:var(--hero-outline)] hover:bg-hero-glass">{t.hero.login}</Link>
            </div>
            <p data-testid="hero-price" className="text-body14 font-semibold text-hero-on-muted">{t.hero.price}</p>
          </div>
          <div className="mx-auto w-full max-w-[300px] min-[900px]:max-w-[320px]">
            <PhoneShot id="today" alt={t.hero.previewAlt} priority />
          </div>
        </div>
      </section>

      {/* How it works */}
      <Section id="how" label="how-h">
        <h2 id="how-h" className="text-[1.75rem] font-extrabold tracking-[-0.02em] min-[720px]:text-[2.25rem]">{t.how.title}</h2>
        <ol className="mt-t6 grid gap-t4 min-[720px]:grid-cols-3">
          {t.how.steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-t2 rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
              <span aria-hidden className="grid h-[36px] w-[36px] place-items-center rounded-pill bg-accent-soft text-body14 font-extrabold text-accent-strong">{i + 1}</span>
              <h3 className="text-[1.125rem] font-extrabold">{s.title}</h3>
              <p className="text-body14 leading-relaxed text-text-secondary">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Real screens, example data */}
      <Section tone="surface" label="preview-h">
        <div className="flex flex-col gap-t2">
          <h2 id="preview-h" className="text-[1.75rem] font-extrabold tracking-[-0.02em] min-[720px]:text-[2.25rem]">{t.preview.title}</h2>
          <p className="text-body text-text-secondary">{t.preview.sub}</p>
        </div>
        <ul className="mt-t6 grid gap-t6 min-[720px]:grid-cols-2 min-[1040px]:grid-cols-4">
          {t.preview.items.map((p) => (
            <li key={p.id} className="flex flex-col gap-t3">
              <div className="relative mx-auto w-full max-w-[260px]">
                <span className="absolute right-t3 top-t3 z-[1] rounded-pill bg-surface px-t2 py-[2px] text-meta-s font-bold text-text-secondary shadow-e1">{t.preview.example}</span>
                <PhoneShot id={p.id} alt={p.alt} />
              </div>
              <h3 className="text-body font-extrabold">{p.title}</h3>
              <p className="text-body14 leading-relaxed text-text-secondary">{p.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* On your side */}
      <Section label="side-h">
        <h2 id="side-h" className="text-[1.75rem] font-extrabold tracking-[-0.02em] min-[720px]:text-[2.25rem]">{t.side.title}</h2>
        <ul className="mt-t6 grid gap-t4 min-[720px]:grid-cols-3">
          {t.side.items.map((s, i) => {
            const Icon = SIDE_ICONS[i]!;
            return (
              <li key={s.title} className="flex gap-t3 rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
                <span aria-hidden className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-[12px] bg-accent-soft text-accent-strong"><Icon size={20} /></span>
                <div className="flex flex-col gap-t1">
                  <h3 className="text-body font-extrabold">{s.title}</h3>
                  <p className="text-body14 leading-relaxed text-text-secondary">{s.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* What you get */}
      <Section tone="surface" label="features-h">
        <h2 id="features-h" className="text-[1.75rem] font-extrabold tracking-[-0.02em] min-[720px]:text-[2.25rem]">{t.features.title}</h2>
        <ul className="mt-t6 grid gap-x-t6 gap-y-t5 min-[560px]:grid-cols-2 min-[900px]:grid-cols-3">
          {t.features.items.map((f, i) => {
            const Icon = FEATURE_ICONS[i]!;
            return (
              <li key={f.title} className="flex gap-t3">
                <span aria-hidden className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent-strong"><Icon size={18} /></span>
                <div className="flex flex-col gap-[2px]">
                  <h3 className="text-body font-extrabold">{f.title}</h3>
                  <p className="text-body14 leading-relaxed text-text-secondary">{f.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Free help, for anyone */}
      <Section label="help-h">
        <div className="flex flex-col gap-t4 rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card min-[720px]:p-t6">
          <div className="flex flex-col gap-t1">
            <h2 id="help-h" className="text-[1.375rem] font-extrabold tracking-[-0.01em]">{t.help.title}</h2>
            <p className="text-body14 text-text-secondary">{t.help.body}</p>
          </div>
          <ul className="grid gap-t3 min-[720px]:grid-cols-2">
            {t.help.items.map((h) => (
              <li key={h.label} className="flex items-center gap-t3 rounded-[16px] bg-surface2 p-t4">
                <span aria-hidden className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-pill bg-surface text-accent-strong"><Phone size={18} /></span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body14 font-bold">{h.label}</span>
                  <span className="text-meta text-text-muted">{h.detail}</span>
                </span>
                <a href={h.href} className="inline-flex min-h-tap items-center whitespace-nowrap rounded-pill px-t3 text-body14 font-bold text-accent-strong underline-offset-2 hover:underline">{h.tel}</a>
              </li>
            ))}
          </ul>
          <Link href="/support" className="inline-flex min-h-tap items-center self-start text-body14 font-bold text-accent-strong underline-offset-2 hover:underline">{t.help.more}</Link>
        </div>
      </Section>

      {/* Final call to action */}
      <Section label="cta-h" className="pt-0">
        <div className="flex flex-col items-start gap-t4 rounded-card-s bg-accent-soft p-t6 sm:rounded-card min-[720px]:flex-row min-[720px]:items-center min-[720px]:justify-between">
          <div className="flex flex-col gap-t1">
            <h2 id="cta-h" className="text-[1.5rem] font-extrabold tracking-[-0.02em]">{t.cta.title}</h2>
            <p className="flex items-center gap-t2 text-body14 text-text-secondary"><Check aria-hidden size={16} className="text-accent-strong" />{t.cta.body}</p>
          </div>
          <StartButton size="large">{t.cta.start}</StartButton>
        </div>
      </Section>
    </>
  );
}
