"use client";
// Progress page: goal (set, change, remove, with Undo), money left before each payday, positive streaks,
// the SmartScore next to what the customer did, and the value tally. Neutral colours throughout.
import { CircleCheck, Flag, PiggyBank } from "lucide-react";
import { useState } from "react";
import type { PersonaId } from "@/lib/api/types";
import { progressCopy as t } from "@/content/progress";
import { GOAL_PRESETS } from "@/config/flags";
import { addDays, formatDayMonth, formatShortDay, formatWhole } from "@/lib/format";
import { useAccount } from "@/lib/account/client";
import { GOAL_MAX, GOAL_MIN, type AccountState } from "@/lib/account/state";
import type { GoalPlan } from "@/lib/selectors/goal";
import type { progress as progressFn } from "@/lib/selectors/progress";
import type { SafeToSpend } from "@/lib/selectors/safeToSpend";
import { TallySheet } from "@/components/domain/LoopCards";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Feedback";
import { RadioGroup, TextInput } from "@/components/ui/Form";
import { SampleTag } from "@/components/ui/SampleTag";
import { Sheet } from "@/components/ui/Sheet";

type Progress = ReturnType<typeof progressFn>;
type Option = { by: string; payday: string; cycles: number };

export function ProgressView({ persona, account: initial, present, asOf, progress: p, plan, safe, options, defaultOption, nextPayday }: {
  persona: PersonaId; account: AccountState; present: boolean; asOf: string; progress: Progress; plan: GoalPlan | null;
  safe: SafeToSpend; options: Option[]; defaultOption: number; nextPayday: string;
}) {
  const toast = useToast();
  const { update } = useAccount(persona, initial);
  const [editing, setEditing] = useState(false);
  const [tally, setTally] = useState(false);

  const removeGoal = () => {
    const prev = initial.goal;
    update((l) => { const n = { ...l }; delete n.goal; return n; });
    toast({ kind: "confirm", message: t.goal.removed, onUndo: prev ? () => update((l) => ({ ...l, goal: prev })) : undefined });
  };

  // The score points and the things the customer did, newest first.
  const timeline = [
    ...p.score.slice(-6).map((s) => ({ date: s.date, key: `s-${s.date}`, text: t.timeline.score(s.score), score: true })),
    ...p.marks.map((m, i) => ({
      date: m.date, key: `m-${i}`, score: false,
      text: m.kind === "cancelled_subscription" ? t.timeline.cancelled_subscription(m.label ?? "") : m.kind === "skip_advance" ? t.timeline.skip_advance : t.timeline.acted_on_bill(m.label ?? ""),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date) || Number(a.score) - Number(b.score));
  // Bars only for money left (scaled to the best cycle); a cycle that ended below $0 gets words, not a bar.
  const maxLeft = Math.max(1, ...p.cycles.map((c) => Math.max(0, c.endBalance ?? 0)));

  return (
    <div className="flex flex-col gap-t4 pb-t6 desktop:grid desktop:grid-cols-2 desktop:items-start desktop:gap-t6">
      <div className="flex flex-col gap-t4">
        {/* Goal */}
        <section aria-labelledby="goal-h" className="rounded-lg bg-surface p-t4">
          <div className="flex flex-wrap items-center gap-t2">
            <Flag aria-hidden size={20} className="text-accent" />
            <h2 id="goal-h" className="text-h3 text-text">{t.goal.heading}</h2>
            <SampleTag q="Q22" present={present} />
          </div>
          {!plan ? (
            <>
              <p className="mt-t2 text-small text-text-muted">{t.goal.none}</p>
              <Button className="mt-t3" onClick={() => setEditing(true)}>{t.goal.set}</Button>
            </>
          ) : (
            <>
              <p className="mt-t2 text-body-strong text-text">{t.goal.target(formatWhole(plan.amount), formatShortDay(plan.by))}</p>
              <div className="mt-t3" role="img" aria-label={t.goal.progress(plan.percent)}>
                <div className="h-[8px] w-full overflow-hidden rounded-pill bg-surface2">
                  <div className="h-full rounded-pill bg-accent" style={{ width: `${plan.percent}%` }} />
                </div>
                <p aria-hidden className="mt-t1 text-caption text-text-muted">{t.goal.progress(plan.percent)}</p>
              </div>
              <ul className="mt-t2 flex flex-col gap-t1 text-small text-text">
                {plan.ended ? <li>{t.goal.ended(formatDayMonth(plan.by))}</li> : (
                  <li>{safe.goalOnHold ? t.goal.onHold : t.goal.thisCycle(formatWhole(plan.thisCycle), formatShortDay(addDays(nextPayday, -1)))}</li>
                )}
                <li>{plan.reached ? t.goal.reached(formatWhole(plan.amount))
                  : plan.latest ? (plan.latest.amount >= 0 ? t.goal.latest(formatWhole(plan.latest.amount), formatDayMonth(plan.latest.date)) : t.goal.latestBelow(formatDayMonth(plan.latest.date)))
                  : t.goal.noneYet(formatShortDay(nextPayday))}</li>
              </ul>
              <div className="mt-t2 flex flex-wrap gap-x-t2">
                <Button variant="tertiary" onClick={() => setEditing(true)}>{t.goal.edit}</Button>
                <Button variant="tertiary" onClick={removeGoal}>{t.goal.remove}</Button>
              </div>
            </>
          )}
        </section>

        {/* Going well */}
        <section aria-labelledby="streaks-h" className="rounded-lg bg-surface p-t4">
          <h2 id="streaks-h" className="text-h3 text-text">{t.streaks.heading}</h2>
          {p.streaks.length ? (
            <ul className="mt-t2 flex flex-col gap-t2">
              {p.streaks.map((s) => (
                <li key={s.kind} className="flex items-start gap-t2 text-small text-text">
                  <CircleCheck aria-hidden size={20} className="shrink-0 text-accent" />{t.streaks[s.kind](s.cycles)}
                </li>
              ))}
            </ul>
          ) : <p className="mt-t2 text-small text-text-muted">{t.streaks.none}</p>}
        </section>

        {/* Tally: only once something has been counted or is waiting to be confirmed. */}
        {(p.tally.items.length > 0 || p.tally.pending.length > 0) && <section aria-labelledby="ptally-h" className="flex items-start gap-t3 rounded-lg bg-surface p-t4">
          <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent"><PiggyBank size={24} /></span>
          <div className="min-w-0 flex-1">
            <h2 id="ptally-h" className="text-caption text-text-muted">{t.tally.heading}</h2>
            <p className="tnum text-h2 font-display text-text">{formatWhole(p.tally.total)}</p>
            <Button variant="tertiary" onClick={() => setTally(true)}>{t.tally.see}</Button>
          </div>
        </section>}
      </div>

      <div className="flex flex-col gap-t4">
        {/* Money left before each payday */}
        <section aria-labelledby="cycles-h" className="rounded-lg bg-surface p-t4">
          <h2 id="cycles-h" className="text-h3 text-text">{t.cycles.heading}</h2>
          <p className="mt-t1 text-small text-text-muted">{t.cycles.intro}</p>
          {p.cycles.length ? (
            <ul className="mt-t3 flex flex-col">
              {[...p.cycles].reverse().map((c) => {
                const bal = c.endBalance ?? 0;
                const w = Math.round((Math.max(0, bal) / maxLeft) * 100);
                const extras = [c.advances.count ? t.cycles.advance(c.advances.count) : null, c.fees.count ? t.cycles.fee(c.fees.count) : null].filter(Boolean);
                return (
                  <li key={c.cycle.start} className="border-t border-line py-t3">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-t3">
                      <span className="text-small text-text">{t.cycles.row(formatDayMonth(c.cycle.start), formatDayMonth(c.cycle.end))}</span>
                      <span className="tnum text-body-strong text-text">{bal >= 0 ? t.cycles.left(formatWhole(bal)) : `${t.cycles.below} (${formatWhole(bal)})`}</span>
                    </div>
                    {bal >= 0 && (
                      <div aria-hidden className="mt-t1 h-[6px] w-full rounded-pill bg-surface2">
                        <div className="h-full rounded-pill bg-accent" style={{ width: `${Math.max(2, w)}%` }} />
                      </div>
                    )}
                    {extras.length > 0 && <p className="mt-t1 text-caption text-text-muted">{extras.join(" · ")}</p>}
                  </li>
                );
              })}
            </ul>
          ) : <p className="mt-t3 text-small text-text-muted">{t.cycles.none}</p>}
        </section>

        {/* Score and what you did */}
        <section aria-labelledby="tl-h" className="rounded-lg bg-surface p-t4">
          <h2 id="tl-h" className="text-h3 text-text">{t.timeline.heading}</h2>
          {timeline.length ? (
            <ol className="mt-t3 flex flex-col">
              {timeline.map((e) => (
                <li key={e.key} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-t3 border-t border-line py-t2">
                  <span className="tnum text-caption text-text-muted">{formatDayMonth(e.date)}</span>
                  <span className={e.score ? "text-small text-text" : "text-small text-accent"}>{e.text}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {p.marks.length === 0 && <p className="mt-t2 text-caption text-text-muted">{t.timeline.none}</p>}
        </section>
      </div>

      <GoalSheet open={editing} onClose={() => setEditing(false)} options={options} defaultOption={defaultOption} initial={initial.goal}
        onSave={(amount, by) => {
          update((l) => ({ ...l, goal: { amount, by, setAt: asOf } }));
          toast({ kind: "confirm", message: t.goal.saved });
          setEditing(false);
        }} />
      <TallySheet tally={p.tally} open={tally} onClose={() => setTally(false)} present={present} />
    </div>
  );
}

function GoalSheet({ open, onClose, options, defaultOption, initial, onSave }: {
  open: boolean; onClose: () => void; options: Option[]; defaultOption: number; initial?: { amount: number; by: string };
  onSave: (amount: number, by: string) => void;
}) {
  const presets = GOAL_PRESETS.map(String);
  const startPreset = initial ? (presets.includes(String(initial.amount)) ? String(initial.amount) : "custom") : "200";
  const [choice, setChoice] = useState<string>(startPreset);
  const [custom, setCustom] = useState(initial && startPreset === "custom" ? String(initial.amount) : "");
  const [by, setBy] = useState<string>(options.find((o) => o.by === initial?.by)?.by ?? options[defaultOption]!.by);
  const [error, setError] = useState<string | undefined>();
  const amount = choice === "custom" ? Number(custom.replace(/[$,\s]/g, "")) : Number(choice);
  const opt = options.find((o) => o.by === by)!;
  const valid = Number.isFinite(amount) && amount >= GOAL_MIN && amount <= GOAL_MAX;

  return (
    <Sheet open={open} onClose={onClose} title={t.goal.sheetTitle}
      footer={<Button full onClick={() => { if (!valid) { setError(t.goal.invalidAmount(formatWhole(GOAL_MIN), formatWhole(GOAL_MAX))); return; } onSave(Math.round(amount), by); }}>{t.goal.save}</Button>}>
      <div className="flex flex-col gap-t4">
        <RadioGroup legend={t.goal.amountLegend} value={choice} onChange={(v) => { setChoice(v); setError(undefined); }}
          options={[...presets.map((v) => ({ value: v, label: formatWhole(Number(v)) })), { value: "custom", label: t.goal.custom }]} />
        {choice === "custom" && (
          <TextInput label={t.goal.customLabel} inputMode="numeric" value={custom} error={error}
            onChange={(e) => { setCustom(e.target.value); if (error) setError(undefined); }} />
        )}
        <RadioGroup legend={t.goal.byLabel} value={by} onChange={setBy}
          options={options.map((o) => ({ value: o.by, label: formatShortDay(o.by) }))} />
        {valid && <p role="status" className="text-small text-text-muted">{t.goal.perCycle(formatWhole(Math.round(amount / opt.cycles)), opt.cycles)}</p>}
      </div>
    </Sheet>
  );
}
