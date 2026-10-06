// P13 Account: the avatar menu's destinations.
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { billing, lenderMatchingOn, valueTally } from "@/lib/selectors";
import { tallyCopy } from "@/content/loop";
import { formatDollars } from "@/lib/format";
import { formatShortDay, formatUpdated } from "@/lib/format";
import { accountPage as t, notificationsCopy } from "@/content/account";
import { PageHeader } from "@/components/shell/Shells";
import { PortalShell } from "@/components/shell/Portal";
import { isOn } from "@/config/featureFlags";
import { correctionCopy } from "@/content/corrections";

export const dynamic = "force-dynamic";

export default async function Account({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data, account } = await loadCustomer(persona);
  const b = billing(data, account);
  const accounts = data.bankStatement.profiles[0]?.accounts ?? [];
  const rows = [
    { href: "/account/profile", label: t.sections.profile, sub: data.profile.full_name },
    { href: "/account/subscription", label: t.sections.subscription, sub: `${t.subscription.plan(b.planName)}${b.nextCharge ? ` · ${b.alignment?.pref.mode === "after_payday" ? t.subscription.nextChargeAfterPayday(formatShortDay(b.nextCharge)) : t.subscription.nextCharge(formatShortDay(b.nextCharge))}` : ""}` },
    { href: "/account/consents", label: t.sections.consents, sub: lenderMatchingOn(data) ? t.consents.matchingOn.split(".")[0]! : t.consents.matchingPaused.split(".")[0]! },
    { href: "/account/bank", label: t.sections.bank, sub: account.bank?.disconnected ? t.bank.disconnectedNote.split(".")[0]! : `${accounts.map((a) => t.bank.account(a.nickname, a.last4)).join(", ")}${data.score?.scoredAt ? ` · ${formatUpdated(data.score.scoredAt).replace(/^Updated /, "")}` : ""}` },
    { href: "/notifications", label: notificationsCopy.title, sub: "" },
    // Spec 05: what the member has corrected, with remove.
    ...(isOn("corrections_v1", persona) ? [{ href: "/account/corrections", label: correctionCopy.page.title, sub: correctionCopy.page.count((account.rules?.length ?? 0) + (account.billAdjust?.paid.length ?? 0) + Object.keys(account.billAdjust?.amounts ?? {}).length + Object.keys(account.billAdjust?.moved ?? {}).length) }] : []),
    // Spec 02: the value tally on Account, with the ledger on Your progress.
    (() => { const v = valueTally(data, account); return { href: "/progress", label: tallyCopy.label, sub: v.items.length ? `${formatDollars(v.total)} · ${tallyCopy.since}` : tallyCopy.none }; })(),
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
