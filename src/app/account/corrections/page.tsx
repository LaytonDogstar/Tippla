// Spec 05: everything the member has told Tippla, in plain words, each removable.
import { redirect } from "next/navigation";
import { isOn } from "@/config/featureFlags";
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { correctionCopy as t } from "@/content/corrections";
import { categoryNames } from "@/content/en-AU";
import { formatDayMonth, formatWhole } from "@/lib/format";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { CorrectionsList, type CorrectionRow } from "./CorrectionsList";

export const dynamic = "force-dynamic";

const split = (key: string) => { const i = key.lastIndexOf(":"); return { merchant: key.slice(0, i), date: key.slice(i + 1) }; };

export default async function Corrections({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  if (!isOn("corrections_v1", persona)) redirect("/account");
  const { account } = await loadCustomer(persona);
  const k = t.page.kinds;
  const rows: CorrectionRow[] = [
    ...(account.rules ?? []).map((r) => ({
      id: r.id, type: "rule" as const,
      label: r.kind === "category" ? k.category(r.merchant, categoryNames[r.category!].toLowerCase()) : k[r.kind](r.merchant),
    })),
    ...(account.billAdjust?.paid ?? []).map((key) => { const b = split(key); return { id: key, type: "bill" as const, label: t.page.billPaid(b.merchant, formatDayMonth(b.date)) }; }),
    ...Object.entries(account.billAdjust?.amounts ?? {}).map(([key, v]) => { const b = split(key); return { id: key, type: "bill" as const, label: t.page.billAmount(b.merchant, formatDayMonth(b.date), formatWhole(v)) }; }),
    ...Object.entries(account.billAdjust?.moved ?? {}).map(([key, v]) => { const b = split(key); return { id: key, type: "bill" as const, label: t.page.billMoved(b.merchant, formatDayMonth(b.date), formatDayMonth(v)) }; }),
  ];
  return (
    <PortalShell path="/account" persona={persona} present={presentationMode(searchParams.present)} backHref="/account" header={<PageHeader title={t.page.title} sub={t.page.intro} />}>
      <CorrectionsList persona={persona} account={account} rows={rows} />
    </PortalShell>
  );
}
