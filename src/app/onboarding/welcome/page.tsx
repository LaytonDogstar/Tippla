// Spec 04 step 1: what Tippla does, in one sentence, then straight into setup.
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { isOn } from "@/config/featureFlags";
import { currentPersona } from "@/lib/persona";
import { welcomeCopy as t } from "@/content/firstValue";
import { OnboardingShell } from "@/components/shell/Shells";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default function Welcome({ searchParams }: { searchParams: { persona?: string } }) {
  if (!isOn("onboarding_v2", currentPersona(searchParams.persona))) redirect("/onboarding/create-account");
  return (
    <OnboardingShell step="welcome" title={t.title} footer={<ButtonLink href="/onboarding/create-account" size="standard" full>{t.start}</ButtonLink>}>
      <p className="mt-t2 text-body text-text">{t.line}</p>
      <ul className="mt-t6 flex flex-col gap-t3">
        {t.points.map((p) => (
          <li key={p} className="flex items-start gap-t3 text-body text-text-muted">
            <Check aria-hidden size={20} className="mt-[2px] shrink-0 text-accent" />{p}
          </li>
        ))}
      </ul>
    </OnboardingShell>
  );
}
