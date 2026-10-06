import { redirect } from "next/navigation";
import { isOn } from "@/config/featureFlags";
import { currentPersona } from "@/lib/persona";

// Spec 04 (onboarding_v2) starts with a one-sentence welcome; without it, straight to the account form.
export default function Onboarding({ searchParams }: { searchParams: { persona?: string } }) {
  redirect(isOn("onboarding_v2", currentPersona(searchParams.persona)) ? "/onboarding/welcome" : "/onboarding/create-account");
}
