// Spec 07 §5 (gates G1, G3, G4): a design prototype only. No bureau partner, no real or sample credit file.
import { redirect } from "next/navigation";
import { isOn } from "@/config/featureFlags";
import { currentPersona, presentationMode } from "@/lib/persona";
import { creditFileCopy as t } from "@/content/plans";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default function CreditFile({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  if (!isOn("credit_file_v1", persona)) redirect("/progress");
  return (
    <PortalShell path="/progress/credit-file" backHref="/progress/whats-next" persona={persona} present={presentationMode(searchParams.present)} header={<PageHeader title={t.title} />}>
      <p role="note" className="mt-t2 rounded-md bg-neutral-soft p-t4 text-small text-text">{t.prototypeBanner}</p>
      <p className="mt-t4 text-body text-text">{t.body}</p>
      <ul className="mt-t3 flex list-disc flex-col gap-t2 pl-t5 text-body text-text-muted">{t.how.map((x) => <li key={x}>{x}</li>)}</ul>
      <Button full className="mt-t5" disabled>{t.notYet}</Button>
    </PortalShell>
  );
}
