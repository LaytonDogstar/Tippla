// O3 (before): what will happen, read-only, ~2 minutes, can disconnect any time.
import { Check } from "lucide-react";
import { onboarding } from "@/content/onboarding";
import { OnboardingShell } from "@/components/shell/Shells";
import { ButtonLink } from "@/components/ui/Button";

const t = onboarding.connect;

export default function ConnectBank() {
  return (
    <OnboardingShell step="connect_bank" backHref="/onboarding/consents" title={t.title}
      footer={<ButtonLink href="/onboarding/connect-bank/talefin" size="standard" full>{t.button}</ButtonLink>}>
      <p className="text-body text-text-muted">{t.intro}</p>
      <ul className="mt-t5 flex flex-col gap-t3">
        {t.points.map((p) => (
          <li key={p} className="flex gap-t3 rounded-card-s bg-surface shadow-card sm:rounded-card p-t4">
            <Check aria-hidden size={20} className="mt-[2px] shrink-0 text-accent" />
            <span className="text-small text-text">{p}</span>
          </li>
        ))}
      </ul>
    </OnboardingShell>
  );
}
