// P11 Hardship support: relief, not embarrassment. Every option is optional; nothing here tells a lender.
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { activeLoans, otherCredit } from "@/lib/selectors";
import { hardshipPage as t } from "@/content/account";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { HardshipInfoButton, HardshipView } from "./HardshipView";
import { isOn } from "@/config/featureFlags";
import { hardshipPrefill } from "@/lib/hardship/prefill";

export const dynamic = "force-dynamic";

export default async function Hardship({ searchParams }: { searchParams: { persona?: string; present?: string; followup?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data, account } = await loadCustomer(persona);
  const lenders = [...activeLoans(data).map((l) => l.provider), ...otherCredit(data).map((o) => o.provider)];
  // Spec 06: pre-fill the letter, soonest repayment first (Jess: Beforepay $315 due Wed 30/09).
  const autofill = isOn("hardship_autofill_v1", persona);
  const prefill = hardshipPrefill(data);
  const followup = searchParams.followup && account.hardshipLetters?.some((l) => l.lender === searchParams.followup) ? searchParams.followup : null;
  return (
    <PortalShell path="/hardship" persona={persona} present={present} header={<PageHeader title={t.title} sub={t.sub} action={<HardshipInfoButton />} />}>
      <HardshipView persona={persona} account={account} present={present} lenders={[...new Set(lenders)]} asOf={data.asOf}
        letter={autofill ? { prefill, name: data.profile.full_name } : null} followup={followup} />
    </PortalShell>
  );
}
