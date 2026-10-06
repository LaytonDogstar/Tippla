// Spec 07 §4 "What's next": the options for the member's stage. Gated items are prototypes behind flags.
import { isOn } from "@/config/featureFlags";
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { scoreState, whatsNext, type NextOption } from "@/lib/selectors";
import { whatsNextCopy as t } from "@/content/plans";
import { stageNames } from "@/content/en-AU";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { WhatsNextList } from "./WhatsNextList";

export const dynamic = "force-dynamic";

const HREF: Record<NextOption, string | null> = {
  plans: "/savings", emergency: "/progress#buffer", goals: "/progress#savings", multi: "/progress#savings",
  review: null, creditFile: "/progress/credit-file", refinance: "/progress/cheaper-credit",
};

export default async function WhatsNext({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data } = await loadCustomer(persona);
  const s = scoreState(data);
  const stage = s.kind === "scored" ? s.stage.stage.id : "building";
  const gated: Partial<Record<NextOption, boolean>> = { creditFile: isOn("credit_file_v1", persona), refinance: isOn("refinance_step_v1", persona) };
  const items = whatsNext(stage).filter((o) => gated[o] !== false).map((o) => ({ id: o, ...t.options[o]!, href: HREF[o], prototype: o in gated }));
  return (
    <PortalShell path="/progress/whats-next" backHref="/progress" persona={persona} present={presentationMode(searchParams.present)} header={<PageHeader title={t.title} sub={t.intro(stageNames[stage])} />}>
      <WhatsNextList items={items} />
    </PortalShell>
  );
}
