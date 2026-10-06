"use client";
// Spec 07 §3 named savings goals: a name, an amount and a date; progress from a linked savings account's
// balance; the amount to put aside each pay cycle. One goal at Healthy, up to three at Thriving.
import { useState } from "react";
import { savingsCopy as t } from "@/content/plans";
import { formatDayMonth, formatWhole } from "@/lib/format";
import { addDays } from "@/lib/format/dates";
import type { PersonaId } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import type { GoalStatus } from "@/lib/selectors/progression";
import { useAccount } from "@/lib/account/client";
import { track } from "@/lib/analytics/client";
import { Button } from "@/components/ui/Button";
import { SelectInput, TextInput } from "@/components/ui/Form";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Feedback";

export function SavingsGoals({ persona, account, asOf, goals, limit, savingsAccounts }: {
  persona: PersonaId; account: AccountState; asOf: string; goals: GoalStatus[]; limit: number; savingsAccounts: { id: number; label: string }[];
}) {
  const { update } = useAccount(persona, account);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [by, setBy] = useState(addDays(asOf, 84));
  const [acct, setAcct] = useState(savingsAccounts[0] ? String(savingsAccounts[0].id) : "none");
  const [error, setError] = useState<string | null>(null);
  const save = () => {
    const n = Number(target.replace(/[$,\s]/g, ""));
    if (!name.trim() || name.length > 30 || !Number.isFinite(n) || n < 10 || n > 50000 || !/^\d{4}-\d{2}-\d{2}$/.test(by) || by <= asOf) { setError(t.invalid); return; }
    const cycles = Math.max(1, Math.ceil((Date.parse(by) - Date.parse(asOf)) / (14 * 864e5)));
    track("goal_created", { target_cents: Math.round(n * 100), cycles });
    update((l) => ({ ...l, savingsGoals: [...(l.savingsGoals ?? []), { id: `g${Date.now().toString(36)}`, name: name.trim(), target: Math.round(n), by, createdAt: asOf, ...(acct !== "none" ? { accountId: Number(acct) } : {}) }] }));
    toast({ kind: "confirm", message: t.created });
    setOpen(false); setName(""); setTarget("");
  };
  return (
    <section id="savings" aria-labelledby="savings-h" className="mt-t3 rounded-lg bg-surface p-t4">
      <h2 id="savings-h" className="text-h3 text-text">{t.heading}</h2>
      {limit === 0 ? <p className="mt-t1 text-small text-text-muted">{t.locked}</p> : (
        <>
          <p className="mt-t1 text-small text-text-muted">{t.intro}{limit > 1 ? ` ${t.max(limit)}` : ""}</p>
          <ul className="mt-t3 flex flex-col gap-t3">
            {goals.map((g) => (
              <li key={g.goal.id} className="rounded-md bg-surface2 p-t3">
                <p className="text-body-strong text-text">{t.line(g.goal.name, formatWhole(g.goal.target), formatDayMonth(g.goal.by))}</p>
                <p className="text-small text-text">{g.reached ? t.reached : g.saved !== null ? t.saved(formatWhole(g.saved), g.percent!) : t.notTracked}</p>
                {!g.reached && <p className="text-small text-text-muted">{t.perCycle(formatWhole(g.perCycle))}</p>}
                <Button variant="tertiary" onClick={() => update((l) => ({ ...l, savingsGoals: (l.savingsGoals ?? []).filter((x) => x.id !== g.goal.id) }))}>{t.remove(g.goal.name)}</Button>
              </li>
            ))}
          </ul>
          {goals.length < limit && <Button variant="secondary" className="mt-t3" onClick={() => { setError(null); setOpen(true); }}>{t.add}</Button>}
        </>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={t.addTitle} footer={<Button full onClick={save}>{t.save}</Button>}>
        <form noValidate className="flex flex-col gap-t4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <TextInput label={t.name} maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
          <TextInput label={t.target} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
          <TextInput label={t.by} type="date" min={addDays(asOf, 1)} value={by} onChange={(e) => setBy(e.target.value)} />
          {savingsAccounts.length > 0
            ? <SelectInput label={t.account} value={acct} options={[...savingsAccounts.map((a) => ({ value: String(a.id), label: a.label })), { value: "none", label: t.notTracked }]} onChange={setAcct} />
            : <p className="text-small text-text-muted">{t.noAccount}</p>}
          {error && <p role="alert" className="text-small text-text">{error}</p>}
        </form>
      </Sheet>
    </section>
  );
}
