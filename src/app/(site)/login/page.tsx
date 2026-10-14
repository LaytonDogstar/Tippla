// Log in (public). During the preview, logging in is the preview password (it sets the gate and member cookies via
// /api/gate). Without a preview password (local), it signs in to the demo straight away.
import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { safeNext } from "@/lib/gate";

const t = site.login;
export const metadata: Metadata = { title: t.meta.title, description: t.meta.description };
export const dynamic = "force-dynamic";

export default function LoginPage({ searchParams }: { searchParams: { error?: string; next?: string } }) {
  const needsPassword = !!process.env.SITE_PASSWORD;
  const next = safeNext(searchParams.next);
  return (
    <section aria-labelledby="login-h" className="px-t4 py-t8">
      <div className="mx-auto flex max-w-[420px] flex-col gap-t4 rounded-card-s bg-surface p-t6 shadow-card sm:rounded-card">
        <div className="flex flex-col gap-t1">
          <h1 id="login-h" className="text-[1.75rem] font-extrabold tracking-[-0.02em]">{t.title}</h1>
          <p className="text-body14 text-text-secondary">{t.lead}</p>
        </div>
        <form method="post" action="/api/gate" className="flex flex-col gap-t3">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="from" value="login" />
          {needsPassword && (
            <label className="flex flex-col gap-t1">
              <span className="text-body14 font-bold">{t.password}</span>
              <input type="password" name="password" required autoComplete="current-password" aria-describedby="login-help"
                className="min-h-tap rounded-[12px] border border-line bg-bg px-t3 text-body outline-none focus:border-accent" />
              <span id="login-help" className="text-meta text-text-muted">{t.passwordHelp}</span>
            </label>
          )}
          {searchParams.error && <p role="alert" className="rounded-[10px] bg-caution-soft px-t3 py-t2 text-body14 text-text">{t.error}</p>}
          <button type="submit" className="inline-flex min-h-tap items-center justify-center rounded-pill bg-cta px-t5 text-body font-bold text-on-accent shadow-cta">{t.submit}</button>
        </form>
        <p className="text-body14 text-text-secondary">{t.noAccount} <Link href="/onboarding" className="font-bold text-accent-strong underline-offset-2 hover:underline">{t.start}</Link></p>
      </div>
    </section>
  );
}
