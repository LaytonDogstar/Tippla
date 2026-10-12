// Calendar, month first (09/10/2026). The server builds every day once (calendarDays: actual end-of-day balances up
// to today, the forecast after, pending listed but never counted) and the client moves between months and selections
// without a round trip. Links: ?month=YYYY-MM, ?day=YYYY-MM-DD (Home's "next bill" opens that day selected). Older
// links (?view=, ?offset=) land on the right month. ?from=&to= opens with that range selected.
import { loadCustomer } from "@/lib/customer";
import { categoryEdits, currentPersona, presentationMode } from "@/lib/persona";
import { calendarDays, calendarNow, connectionHealth, currentCycle, usualEverydayPerDay, panelData, lastRefresh, monthRange, payCycleRanges } from "@/lib/selectors";
import { formatUpdated } from "@/lib/format";
import { calendarPage as t } from "@/content/spending";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { CalendarView } from "./CalendarView";
import { calendarInitial } from "@/lib/calendar/selection";
import { hardshipModeOn } from "@/lib/hardshipMode";
import { isOn } from "@/config/featureFlags";

export const dynamic = "force-dynamic";

type Search = { persona?: string; present?: string; view?: string; offset?: string; month?: string; day?: string; from?: string; to?: string; forecast?: string };
/** Calendar's "Updated" line warns once the bank data is more than a day old (the app-wide banner waits 48 hours). */
const STALE_AFTER_HOURS = 24;

export default async function Calendar({ searchParams }: { searchParams: Search }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data, account, states } = await loadCustomer(persona);
  const days = calendarDays(data, categoryEdits(persona));
  const range = monthRange(days);
  // Which month and selection to open on (pure, so the URL round-trip is unit-tested).
  const initial = calendarInitial(searchParams, days.map((d) => d.date), data.asOf, currentCycle(data).start);

  const refreshed = lastRefresh(data).at;
  const health = connectionHealth(data, account, states);
  const stale = health.hoursOld > STALE_AFTER_HOURS ? { when: formatUpdated(refreshed).replace(/^Updated /, "") } : null;
  return (
    <PortalShell path="/calendar" persona={persona} present={present} wide
      header={<PageHeader title={t.title} sub={formatUpdated(refreshed)} />}>
      <CalendarView initialForecast={searchParams.forecast === "bills" ? "bills" : "usual"} panels={panelData(data, account, categoryEdits(persona), { letter: isOn("hardship_autofill_v1", persona), hardshipMode: hardshipModeOn(persona, states) })} persona={persona} account={account} usualPerDay={usualEverydayPerDay(data, days)} days={days} now={calendarNow(data, days)} asOf={data.asOf} cycles={payCycleRanges(data)} initial={initial} range={range} stale={stale} />
    </PortalShell>
  );
}
