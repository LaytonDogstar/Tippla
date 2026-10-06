"use client";
// Spec 05: correct one predicted bill: already paid, different amount, moved to another day, not a bill,
// or ended. Shown inside a sheet (replacing its content, with Back) so sheets never stack.
import { useState } from "react";
import { correctionCopy as t } from "@/content/corrections";
import type { PersonaId, UpcomingBill } from "@/lib/api/types";
import { billId } from "@/lib/account/state";
import { useCorrections } from "@/lib/account/useCorrections";
import { addDays } from "@/lib/format/dates";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Form";

type Mode = null | "amount" | "moved";

export function BillCorrect({ persona, bill, asOf, onDone }: { persona: PersonaId; bill: UpcomingBill; asOf: string; onDone: () => void }) {
  const { adjustBill, addRule } = useCorrections(persona);
  const key = bill.origin ?? billId(bill);
  const [mode, setMode] = useState<Mode>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const finish = (fn: () => void) => { fn(); onDone(); };
  const saveAmount = () => {
    const n = Number(value.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(n) || n < 1 || n > 20000) { setError(t.bill.invalidAmount); return; }
    finish(() => adjustBill(key, { amount: Math.round(n * 100) / 100 }));
  };
  const saveDate = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value <= asOf) { setError(t.bill.invalidDate); return; }
    finish(() => adjustBill(key, { moved: value }));
  };
  if (mode === "amount") return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); saveAmount(); }} className="flex flex-col gap-t4">
      <TextInput label={t.bill.amountLabel} inputMode="decimal" value={value} error={error ?? undefined} onChange={(e) => { setValue(e.target.value); setError(null); }} />
      <Button type="submit" full>{t.bill.save}</Button>
    </form>
  );
  if (mode === "moved") return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); saveDate(); }} className="flex flex-col gap-t4">
      <TextInput label={t.bill.movedLabel} type="date" min={addDays(asOf, 1)} value={value} error={error ?? undefined} onChange={(e) => { setValue(e.target.value); setError(null); }} />
      <Button type="submit" full>{t.bill.save}</Button>
    </form>
  );
  return (
    <div className="flex flex-col gap-t2">
      <p className="text-body text-text-muted">{t.bill.intro}</p>
      <Button full variant="secondary" onClick={() => finish(() => adjustBill(key, { paid: true }))}>{t.bill.paid}</Button>
      <Button full variant="secondary" onClick={() => { setMode("amount"); setValue(String(bill.expected_amount)); }}>{t.bill.amount}</Button>
      <Button full variant="secondary" onClick={() => { setMode("moved"); setValue(addDays(bill.date, 1)); }}>{t.bill.moved}</Button>
      <Button full variant="tertiary" onClick={() => finish(() => addRule({ kind: "not_bill", merchant: bill.merchant }))}>{t.bill.notBill}</Button>
      <Button full variant="tertiary" onClick={() => finish(() => addRule({ kind: "bill_ended", merchant: bill.merchant }))}>{t.bill.ended}</Button>
    </div>
  );
}
