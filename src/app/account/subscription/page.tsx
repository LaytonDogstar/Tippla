import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { billing, currentCycle, payCycleSummary } from "@/lib/selectors";
import { logAlignment } from "@/lib/billing/log";
import { accountPage as t } from "@/content/account";
import { PortalShell } from "@/components/shell/Portal";
import { SubscriptionView } from "../AccountViews";

export const dynamic = "force-dynamic";

export default async function Subscription({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data, account, edits, states } = await loadCustomer(persona);
  const b = billing(data, account, { failedLast: states.includes("billing_failed") });
  // Log any move of the billing date once (spec 03), with its reason.
  if (b.alignment) await logAlignment(persona, b.alignment, b.nextCharge, { consent: account.analytics !== false });
  // Short before payday, or using hardship support this pay cycle: offer the pause openly.
  const tight = payCycleSummary(data, edits).isShort || !!account.hardshipSelfSelected || (account.hardshipVisitedAt ?? "") >= currentCycle(data).start;
  return (
    <PortalShell path="/account/subscription" title={t.subscription.title} backHref="/account" persona={persona} present={present}>
      <SubscriptionView persona={persona} present={present} account={account} billing={b} asOf={data.asOf} tight={tight} />
    </PortalShell>
  );
}
