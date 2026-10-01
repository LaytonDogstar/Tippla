// P9 Early repayment calculator. TaleFin provides no rate or term (Q7): the customer confirms the details,
// prefilled with estimates from their transactions.
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { activeLoans, loanTotals } from "@/lib/selectors";
import { calculatorPage as t } from "@/content/account";
import { PortalShell } from "@/components/shell/Shells";
import { CalculatorView } from "./CalculatorView";

export const dynamic = "force-dynamic";

export default async function Repayment({ searchParams }: { searchParams: { persona?: string; present?: string; loan?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const present = presentationMode(searchParams.present);
  const { data } = await loadCustomer(persona);
  const loans = activeLoans(data);
  const totals = loanTotals(data);
  const saccs = loans.filter((l) => l.type === "SACC").length;
  return (
    <PortalShell path="/loans/repayment" title={t.title} backHref="/loans" persona={persona} present={present}>
      <CalculatorView present={present} asOf={data.asOf} pro={data.profile.tier === "pro"} initialLoan={searchParams.loan ?? null}
        loans={loans.map((l) => ({
          provider: l.provider, repayment: l.repayment, cadenceDays: l.cadenceDays ?? 14,
          estimatedBalance: l.estimatedBalance, sharedBalance: l.estimatedBalance === null && l.type === "SACC" && saccs > 1 ? totals.saccOutstanding : null,
        }))} />
    </PortalShell>
  );
}
