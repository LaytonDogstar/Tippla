// Spec 04 step 6: notification opt-in, asked after the first insight and framed by its value.
import { redirect } from "next/navigation";
import { isOn } from "@/config/featureFlags";
import { loadCustomer } from "@/lib/customer";
import { currentPersona } from "@/lib/persona";
import { AlertsStep } from "./AlertsStep";

export const dynamic = "force-dynamic";

export default async function Alerts({ searchParams }: { searchParams: { persona?: string } }) {
  const persona = currentPersona(searchParams.persona);
  if (!isOn("onboarding_v2", persona)) redirect("/");
  const { raw, account } = await loadCustomer(persona);
  return <AlertsStep persona={persona} account={account} asOf={raw.asOf} />;
}
