// Spec 04 step 3: the single most valuable finding, full screen, straight after the data loads.
import { redirect } from "next/navigation";
import { isOn } from "@/config/featureFlags";
import { loadPersona } from "@/lib/api/client";
import { currentPersona, presentationMode } from "@/lib/persona";
import { firstInsight } from "@/lib/selectors";
import { InsightView } from "./InsightView";

export const dynamic = "force-dynamic";

export default async function FirstInsight({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  if (!isOn("onboarding_v2", persona)) redirect("/onboarding/score-reveal");
  const { data } = await loadPersona(persona, { latencyMs: 0 });
  return <InsightView aha={firstInsight(data)} present={presentationMode(searchParams.present)} />;
}
