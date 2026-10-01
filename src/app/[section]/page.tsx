// Placeholder for portal screens not yet built, inside the real shell so navigation works end to end.
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/shell/Shells";
import { placeholderNote, placeholders } from "@/content/placeholders";
import { currentPersona, presentationMode } from "@/lib/persona";

export default function Section({ params, searchParams }: { params: { section: string }; searchParams: { persona?: string; present?: string } }) {
  const p = placeholders[params.section];
  if (!p) notFound();
  return (
    <PortalShell path={`/${params.section}`} title={p.title} persona={currentPersona(searchParams.persona)} present={presentationMode(searchParams.present)}>
      <section className="mt-t4 rounded-lg bg-surface p-t5">
        <h1 className="text-h2 font-display text-text">{p.title}</h1>
        <p className="mt-t3 text-body text-text-muted">{p.body}</p>
        <p className="mt-t4 text-caption text-text-muted">{placeholderNote(p.phase)}</p>
      </section>
    </PortalShell>
  );
}
