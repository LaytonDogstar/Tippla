// P13 Account: the avatar menu's destinations.
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { billing, lenderMatchingOn } from "@/lib/selectors";
import { formatShortDay, formatUpdated } from "@/lib/format";
import { accountPage as t, notificationsCopy } from "@/content/account";
import { PageHeader, PortalShell } from "@/components/shell/Shells";

export const dynamic = "force-dynamic";

export default async function Account({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data, account } = await loadCustomer(persona);
  const b = billing(data, account);
  const accounts = data.bankStatement.profiles[0]?.accounts ?? [];
  const rows = [
    { href: "/account/profile", label: t.sections.profile, sub: data.profile.full_name },
    { href: "/account/subscription", label: t.sections.subscription, sub: `${t.subscription.plan(b.planName)}${b.nextCharge ? ` · ${t.subscription.nextCharge(formatShortDay(b.nextCharge))}` : ""}` },
    { href: "/account/consents", label: t.sections.consents, sub: lenderMatchingOn(data) ? t.consents.matchingOn.split(".")[0]! : t.consents.matchingPaused.split(".")[0]! },
    { href: "/account/bank", label: t.sections.bank, sub: account.bank?.disconnected ? t.bank.disconnectedNote.split(".")[0]! : `${accounts.map((a) => t.bank.account(a.nickname, a.last4)).join(", ")}${data.score?.scoredAt ? ` · ${formatUpdated(data.score.scoredAt).replace(/^Updated /, "")}` : ""}` },
    { href: "/notifications", label: notificationsCopy.title, sub: "" },
  ];
  return (
    <PortalShell path="/account" persona={persona} present={presentationMode(searchParams.present)} header={<PageHeader title={t.title} sub={data.profile.email} />}>
      <ul className="mt-t2 overflow-hidden rounded-md bg-surface">
        {rows.map((r) => (
          <li key={r.href} className="border-b border-line last:border-b-0">
            <Link href={r.href} className="flex min-h-[64px] items-center gap-t3 px-t4 py-t2 hover:bg-surface2">
              <span className="min-w-0 flex-1"><span className="block text-body-strong text-text">{r.label}</span>{r.sub && <span className="block text-caption text-text-muted">{r.sub}</span>}</span>
              <ChevronRight aria-hidden size={20} className="text-text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </PortalShell>
  );
}
