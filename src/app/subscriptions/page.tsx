// Subscriptions (redesign 12/10/2026; reference: subscriptions-mockup.dc.html): one centred column like Spending,
// with the same header (Updated line, bell, Ask Tippla). The server detects the subscriptions and works out the pay
// cycle; the client keeps the member's answers and reminders.
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { currentCycle, cycleLength, lastRefresh, notifications, perCycle, subscriptions, unreadCount, valueTally } from "@/lib/selectors";
import { formatUpdated } from "@/lib/format";
import { subscriptionsPage as t } from "@/content/spending";
import { PortalShell } from "@/components/shell/Portal";
import { TodayHeader } from "@/components/today/TodayHeader";
import { SubscriptionsView } from "./SubscriptionsView";
import { isOn } from "@/config/featureFlags";

export const dynamic = "force-dynamic";

export default async function Subscriptions({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data, account, edits } = await loadCustomer(persona);
  const tally = valueTally(data, account);
  // When each cancellation marked in the app can be confirmed (or has been) in the bank data.
  const confirm = Object.fromEntries([...tally.pending.filter((p) => p.kind === "subscription").map((p) => [p.key.slice(4), p.confirmAfter]), ...tally.items.filter((i) => i.kind === "subscription").map((i) => [i.label.merchant!, i.date])]);
  const cycle = currentCycle(data);
  const cycleDays = cycleLength(cycle.start, cycle.end);
  const subs = subscriptions(data, edits);
  const rows = subs.rows.map((r) => ({ ...r, perPayCycle: perCycle(r.amount, cycleDays) }));
  return (
    <PortalShell path="/subscriptions" persona={persona} present={present} wide
      header={<TodayHeader title={t.title} sub={formatUpdated(lastRefresh(data).at)} unread={unreadCount(notifications(data, account))}
        ask={isOn("assistant_v1", persona) ? { placeholder: t.askPlaceholder } : null} />}>
      <SubscriptionsView persona={persona} rows={rows} account={account} asOf={data.asOf} nextPayday={data.derived.pay_cycle.next_payday} cycleDays={cycleDays}
        confirm={confirm} chargedAgain={tally.chargedAgain} cancelHelper={isOn("cancel_helper_v1", persona)} corrections={isOn("corrections_v1", persona)} present={present} />
    </PortalShell>
  );
}
