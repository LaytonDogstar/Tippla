// P12 Help: search first, seeded with what a stressed customer asks.
import { currentPersona, presentationMode } from "@/lib/persona";
import { helpPage as t } from "@/content/account";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { HelpView } from "./HelpView";
import { isOn } from "@/config/featureFlags";

export const dynamic = "force-dynamic";

export default function Help({ searchParams }: { searchParams: { persona?: string; present?: string; q?: string; open?: string } }) {
  const persona = currentPersona(searchParams.persona);
  return (
    <PortalShell path="/help" persona={persona} present={presentationMode(searchParams.present)} header={<PageHeader title={t.title} />}>
      <HelpView initialQ={searchParams.q ?? ""} initialOpen={searchParams.open ?? null} entitlements={isOn("entitlements_v1", persona)} />
    </PortalShell>
  );
}
