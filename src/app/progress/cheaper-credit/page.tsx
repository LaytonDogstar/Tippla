// Spec 07 §5 (gates G1, G4): cheaper-credit check, design prototype. Only for Healthy or Thriving, nothing
// short before payday, no hardship tools in the last 3 pay cycles. General information: the member's own
// credit costs, no lenders, no offers, no comparison.
import { redirect } from "next/navigation";
import { isOn } from "@/config/featureFlags";
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { activeLoans, otherCredit, refinanceEligible } from "@/lib/selectors";
import { formatWhole } from "@/lib/format";
import { refinanceCopy as t } from "@/content/plans";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function CheaperCredit({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  if (!isOn("refinance_step_v1", persona)) redirect("/progress");
  const { data, account } = await loadCustomer(persona);
  const eligible = refinanceEligible(data, account);
  const rows = [...activeLoans(data).map((l) => ({ p: l.provider, r: l.repayment })), ...otherCredit(data).filter((o) => o.kind === "bnpl").map((o) => ({ p: o.provider, r: o.repayment }))];
  return (
    <PortalShell path="/progress/cheaper-credit" backHref="/progress/whats-next" persona={persona} present={presentationMode(searchParams.present)} header={<PageHeader title={t.title} />}>
      <p role="note" className="mt-t2 rounded-md bg-neutral-soft p-t4 text-small text-text">{t.prototypeBanner}</p>
      {!eligible ? <p className="mt-t4 text-body text-text">{t.notEligible}</p> : (
        <>
          <p className="mt-t4 text-body text-text">{t.intro}</p>
          <ul className="mt-t3 flex flex-col gap-t2">{rows.map((x) => <li key={x.p} className="rounded-md bg-surface p-t4 text-body text-text">{t.row(x.p, formatWhole(x.r))}</li>)}</ul>
          <p className="mt-t3 text-small text-text-muted">{t.tip}</p>
          <Button full className="mt-t5" disabled>{t.notYet}</Button>
        </>
      )}
    </PortalShell>
  );
}
