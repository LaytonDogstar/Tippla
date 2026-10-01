// Home placeholder until Phase 3 builds the dashboard.
import Link from "next/link";
import { PortalShell } from "@/components/shell/Shells";
import { devLinks, placeholderNote, placeholders } from "@/content/placeholders";
import { currentPersona, presentationMode } from "@/lib/persona";

export default function Home({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const p = placeholders[""]!;
  const present = presentationMode(searchParams.present);
  return (
    <PortalShell path="/" title={p.title} persona={currentPersona(searchParams.persona)} present={present}>
      <section className="mt-t4 rounded-lg bg-surface p-t5">
        <h1 className="text-h2 font-display text-text">{p.title}</h1>
        <p className="mt-t3 text-body text-text-muted">{p.body}</p>
        <p className="mt-t4 text-caption text-text-muted">{placeholderNote(p.phase)}</p>
      </section>
      {!present && (
        <nav aria-label="Dev" className="mt-t4 flex flex-col gap-t2">
          <Link href="/onboarding" className="min-h-tap rounded-sm bg-accent-soft px-t4 py-t3 text-small text-accent">{devLinks.onboarding}</Link>
          <Link href="/dev/components" className="min-h-tap rounded-sm bg-accent-soft px-t4 py-t3 text-small text-accent">{devLinks.components}</Link>
          <Link href="/dev/selectors" className="min-h-tap rounded-sm bg-accent-soft px-t4 py-t3 text-small text-accent">{devLinks.selectors}</Link>
        </nav>
      )}
    </PortalShell>
  );
}
