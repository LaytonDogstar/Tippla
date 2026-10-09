// Calendar, month first (09/10/2026). The server builds every day once (calendarDays: actual end-of-day balances up
// to today, the forecast after, pending listed but never counted) and the client moves between months and selections
// without a round trip. Links: ?month=YYYY-MM, ?day=YYYY-MM-DD (Home's "next bill" opens that day selected). Older
// links (?view=, ?offset=) land on the right month.
import { loadCustomer } from "@/lib/customer";
import { categoryEdits, currentPersona, presentationMode } from "@/lib/persona";
import { calendarDays, calendarNow, connectionHealth, currentCycle, isMonthKey, lastRefresh, monthKey, monthRange, payCycleRanges } from "@/lib/selectors";
import { addDays, formatUpdated } from "@/lib/format";
import { calendarPage as t } from "@/content/spending";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { CalendarView } from "./CalendarView";

export const dynamic = "force-dynamic";

type Search = { persona?: string; present?: string; view?: string; offset?: string; month?: string; day?: string };
const isDay = (v?: string): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
/** Calendar's "Updated" line warns once the bank data is more than a day old (the app-wide banner waits 48 hours). */
const STALE_AFTER_HOURS = 24;

export default async function Calendar({ searchParams }: { searchParams: Search }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data, account, states } = await loadCustomer(persona);
  const days = calendarDays(data, categoryEdits(persona));
  const range = monthRange(days);
  const clamp = (m: string) => (m < range.min ? range.min : m > range.max ? range.max : m);

  // Which month and selection to open on.
  const day = isDay(searchParams.day) && days.some((d) => d.date === searchParams.day) ? searchParams.day : null;
  const legacyOffset = !day && !isMonthKey(searchParams.month) && searchParams.offset ? addDays(currentCycle(data).start, 14 * (Number(searchParams.offset) || 0)) : null;
  const month = clamp(day ? monthKey(day) : isMonthKey(searchParams.month) ? searchParams.month : legacyOffset ? monthKey(legacyOffset) : monthKey(data.asOf));
  const inMonth = days.filter((d) => monthKey(d.date) === month);
  const initial = day ? { month, start: day, end: day }
    : monthKey(data.asOf) === month ? { month, start: data.asOf, end: data.asOf }
    : { month, start: inMonth[0]?.date ?? data.asOf, end: inMonth.at(-1)?.date ?? data.asOf };

  const refreshed = lastRefresh(data).at;
  const health = connectionHealth(data, account, states);
  const stale = health.hoursOld > STALE_AFTER_HOURS ? { when: formatUpdated(refreshed).replace(/^Updated /, "") } : null;
  return (
    <PortalShell path="/calendar" persona={persona} present={present} wide
      header={<PageHeader title={t.title} sub={formatUpdated(refreshed)} />}>
      <CalendarView days={days} now={calendarNow(data, days)} asOf={data.asOf} cycles={payCycleRanges(data)} initial={initial} range={range} stale={stale} />
    </PortalShell>
  );
}
