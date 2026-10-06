// Spec 04 step 5: "What would help most right now?" One choice, changeable later.
import { redirect } from "next/navigation";
import { isOn } from "@/config/featureFlags";
import { loadCustomer } from "@/lib/customer";
import { currentPersona } from "@/lib/persona";
import { goalLabel, goalOptions } from "@/lib/selectors";
import { GoalStep } from "./GoalStep";

export const dynamic = "force-dynamic";

export default async function Goal({ searchParams }: { searchParams: { persona?: string } }) {
  const persona = currentPersona(searchParams.persona);
  if (!isOn("onboarding_v2", persona)) redirect("/");
  const { raw, account } = await loadCustomer(persona);
  return <GoalStep persona={persona} account={account} asOf={raw.asOf} options={goalOptions(raw).map((type) => ({ type, label: goalLabel(raw, type) }))} />;
}
