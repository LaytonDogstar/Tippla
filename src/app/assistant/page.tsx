// Spec 08 "Ask Tippla" (flag assistant_v1; gates G1, G2, G3, G6: demo and internal only until sign-off).
import { redirect } from "next/navigation";
import { isOn } from "@/config/featureFlags";
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { feed } from "@/lib/feed";
import { assistantMode } from "@/lib/assistant/claude";
import { suggestedQuestions } from "@/lib/assistant/suggestions";
import { assistantCopy as t } from "@/content/assistant";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { AssistantView } from "./AssistantView";

export const dynamic = "force-dynamic";

export default async function Assistant({ searchParams }: { searchParams: { persona?: string; present?: string; q?: string; entry?: string } }) {
  const persona = currentPersona(searchParams.persona);
  if (!isOn("assistant_v1", persona)) redirect("/");
  const { data, edits, account, states } = await loadCustomer(persona);
  const f = feed({ d: data, edits, account, states }, account.feed);
  const mode = assistantMode();
  return (
    <PortalShell path="/assistant" persona={persona} present={presentationMode(searchParams.present)} header={<PageHeader title={t.title} sub={t.sub} />}>
      <AssistantView suggestions={suggestedQuestions(f.open)} initial={searchParams.q?.slice(0, 500) ?? null} entry={searchParams.entry === "contextual" ? "contextual" : "home"} modeLabel={t.mode[mode]!} present={presentationMode(searchParams.present)} />
    </PortalShell>
  );
}
