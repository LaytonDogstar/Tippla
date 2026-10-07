// P5 Expense calendar: payday to payday at a glance. Navigation is in the URL (?view, ?offset, ?month,
// ?day) so links from Home ("next bill" → ?day=) land on the right fortnight with that day's sheet open.
import { loadCustomer } from "@/lib/customer";
import { categoryEdits, currentPersona, presentationMode } from "@/lib/persona";
import { currentCycle, dayTransactions, fortnight, fortnightBounds, isMonthKey, monthCalendar, payCycleSummary } from "@/lib/selectors";
import { daysBetween, formatShortDay, formatUpdated } from "@/lib/format";
import { calendarPage as t, monthLabel } from "@/content/spending";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { CalendarInfoButton, CalendarView } from "./CalendarView";

export const dynamic = "force-dynamic";

type Search = { persona?: string; present?: string; view?: string; offset?: string; month?: string; day?: string; focus?: string };
const isDay = (v?: string): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function Calendar({ searchParams }: { searchParams: Search }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data } = await loadCustomer(persona);
  const edits = categoryEdits(persona);
  const view = searchParams.view === "month" ? "month" : "fortnight";
  const day = isDay(searchParams.day) ? searchParams.day : null;

  const cycleStart = currentCycle(data).start;
  const offsetFromDay = day ? Math.floor(daysBetween(cycleStart, day) / 14) : null;
  const f = fortnight(data, offsetFromDay ?? Number(searchParams.offset ?? 0), edits);
  const m = monthCalendar(data, isMonthKey(searchParams.month) ? searchParams.month : (day ?? data.asOf).slice(0, 7), edits);
  const days = view === "month" ? m.days : f.days;
  const { min, max } = fortnightBounds(data);
  const nav = view === "month"
    ? { label: monthLabel(m.month), prev: m.prev && `?view=month&month=${m.prev}`, next: m.next && `?view=month&month=${m.next}`, prevLabel: t.prevMonth, nextLabel: t.nextMonth }
    : {
        label: t.range(formatShortDay(f.start), formatShortDay(f.end)),
        prev: f.offset > min ? `?offset=${f.offset - 1}` : null, next: f.offset < max ? `?offset=${f.offset + 1}` : null,
        prevLabel: t.prevFortnight, nextLabel: t.nextFortnight,
      };
  const txByDay = Object.fromEntries(days.map((d) => [d.date, dayTransactions(data, d.date, edits).map((x) => ({ id: x.id, merchant: x.merchant, amount: x.amount, category: x.category, status: x.status, subcategory: x.subcategory }))]));
  const selectedDay = day && days.some((d) => d.date === day) ? day : null;
  return (
    <PortalShell path="/calendar" persona={persona} present={present} wide
      header={<PageHeader title={t.title} sub={data.score?.scoredAt ? formatUpdated(data.score.scoredAt) : undefined} action={<CalendarInfoButton />} />}>
      <CalendarView
        key={`${view}-${days[0]?.date}-${selectedDay ?? ""}`}
        view={view}
        days={days}
        asOf={data.asOf}
        nav={nav}
        monthHref={`?view=month&month=${(selectedDay ?? (f.start <= data.asOf && f.end >= data.asOf ? data.asOf : f.start)).slice(0, 7)}`}
        fortnightHref={`?offset=${Math.floor(daysBetween(cycleStart, days.find((d) => d.isToday && !d.outside)?.date ?? days.find((d) => !d.outside)!.date) / 14)}`}
        nextPayday={view === "fortnight" ? f.nextPayday : null}
        nextPaydayHref={view === "fortnight" && f.offset < max ? `?offset=${f.offset + 1}&focus=${f.nextPayday}` : null}
        focus={isDay(searchParams.focus) ? searchParams.focus : null}
        txByDay={txByDay}
        openDay={selectedDay}
        isShort={payCycleSummary(data, edits).isShort}
      />
    </PortalShell>
  );
}
