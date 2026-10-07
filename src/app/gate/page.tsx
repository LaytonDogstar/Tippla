// Password screen for a hosted preview (only reachable when SITE_PASSWORD is set). Plain form POST, so it
// works before any JavaScript loads.
import { gateCopy as t } from "@/content/gate";
import { safeNext } from "@/lib/gate";

export const dynamic = "force-dynamic";

export default function Gate({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next = safeNext(searchParams.next);
  const error = searchParams.error === "1";
  return (
    <main id="main" className="flex min-h-[100dvh] items-center justify-center bg-bg px-gutter text-text">
      <form method="post" action="/api/gate" className="w-full max-w-[400px] rounded-card-s bg-surface shadow-card sm:rounded-card p-t6">
        <h1 className="text-h1 font-display text-text">{t.title}</h1>
        <p className="mt-t2 text-body text-text-muted">{t.intro}</p>
        <input type="hidden" name="next" value={next} />
        <label htmlFor="gate-password" className="mt-t5 block text-small text-text">{t.label}</label>
        <input id="gate-password" name="password" type="password" autoComplete="current-password" required autoFocus
          aria-invalid={error || undefined} aria-describedby={error ? "gate-error" : undefined}
          className={`mt-t2 block min-h-[52px] w-full rounded-sm border bg-surface px-t4 text-body text-text outline-none focus:border-accent focus:outline focus:outline-[length:var(--focus-width)] focus:outline-offset-[var(--focus-offset)] focus:outline-focus ${error ? "border-2 border-destructive" : "border-neutral"}`} />
        {error && <p id="gate-error" role="alert" className="mt-t2 text-caption text-destructive">{t.error}</p>}
        <button type="submit" className="mt-t5 inline-flex min-h-[48px] w-full items-center justify-center rounded-sm bg-accent px-t4 text-body-strong text-on-accent">{t.submit}</button>
      </form>
    </main>
  );
}
