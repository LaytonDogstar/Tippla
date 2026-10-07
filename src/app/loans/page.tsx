// P8 Loans & credit. Every balance is estimated from transactions; the pack's four tabs.
import { Search } from "lucide-react";
import Link from "next/link";
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { activeLoans, failedPayments, loanTotals, otherCredit, payCycleSummary, repaymentHistory, upcomingRepayments, visibleOffers, shouldShowLenderOffers } from "@/lib/selectors";
import { formatUpdated } from "@/lib/format";
import { loansPage as t } from "@/content/account";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { LoansView } from "./LoansView";
import { isOn } from "@/config/featureFlags";

export const dynamic = "force-dynamic";

export default async function Loans({ searchParams }: { searchParams: { persona?: string; present?: string; tab?: string; provider?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data, edits, account, goal } = await loadCustomer(persona);
  const pc = payCycleSummary(data, edits);
  return (
    <PortalShell path="/loans" persona={persona} present={presentationMode(searchParams.present)} wide
      header={<PageHeader title={t.title} sub={data.score?.scoredAt ? formatUpdated(data.score.scoredAt) : undefined}
        action={<Link href="/spending?category=loan_repayment&direction=out" aria-label={t.search} className="inline-flex h-tap w-tap shrink-0 items-center justify-center rounded-pill bg-surface text-text-secondary shadow-card hover:text-text desktop:h-[48px] desktop:w-[48px]"><Search aria-hidden size={20} strokeWidth={1.8} /></Link>} />}>
      <LoansView
        persona={persona}
        corrections={isOn("corrections_v1", persona)}
        initialTab={searchParams.tab}
        initialProvider={searchParams.provider ?? null}
        loans={activeLoans(data)}
        other={otherCredit(data)}
        totals={loanTotals(data)}
        advance={pc.payAdvances[0] ?? null}
        upcoming={{ 30: upcomingRepayments(data, 30), 60: upcomingRepayments(data, 60), 90: upcomingRepayments(data, 90) }}
        history={repaymentHistory(data)}
        failed={failedPayments(data)}
        offersCount={visibleOffers(data, account, goal).length}
        showOffers={shouldShowLenderOffers(data, account, goal)}
      />
    </PortalShell>
  );
}
