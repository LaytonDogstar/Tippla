// P14 Notifications inbox, grouped today / this week / earlier, generated from the same selectors.
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { notifications } from "@/lib/selectors";
import { notificationsCopy as t } from "@/content/account";
import { PortalShell } from "@/components/shell/Shells";
import { NotificationsView } from "./NotificationsView";

export const dynamic = "force-dynamic";

export default async function Notifications({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data, account } = await loadCustomer(persona);
  return (
    <PortalShell path="/notifications" title={t.title} backHref="/" persona={persona} present={presentationMode(searchParams.present)}>
      <NotificationsView persona={persona} account={account} asOf={data.asOf} items={notifications(data, account)} />
    </PortalShell>
  );
}
