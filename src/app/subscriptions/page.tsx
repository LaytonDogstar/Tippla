// P6 Subscriptions: what each regular charge costs per pay cycle and per year, and how to cancel. No urgency.
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { subscriptions } from "@/lib/selectors";
import { formatUpdated } from "@/lib/format";
import { subscriptionsPage as t } from "@/content/spending";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { SubscriptionsView } from "./SubscriptionsView";

export const dynamic = "force-dynamic";

export default async function Subscriptions({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data } = await loadCustomer(persona);
  return (
    <PortalShell path="/subscriptions" persona={persona} present={presentationMode(searchParams.present)}
      header={<PageHeader title={t.title} sub={data.score?.scoredAt ? formatUpdated(data.score.scoredAt) : undefined} />}>
      <SubscriptionsView persona={persona} subs={subscriptions(data)} />
    </PortalShell>
  );
}
