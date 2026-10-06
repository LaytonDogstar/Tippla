// Dev-only (spec 06): the maintained directories, with "last verified" dates. Anything never verified or older
// than 6 months is flagged. Edit src/data/directories.ts after checking the official page, and set the date.
import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";
import { LENDER_DIRECTORY, MERCHANT_CANCEL_GUIDES, PROGRAMS, STATE_CONCESSIONS, VERIFY_MONTHS, isOfficial, needsVerifying } from "@/data/directories";
import { NDH } from "@/config/services";

export const dynamic = "force-dynamic";

function Status({ on, today }: { on: string | null; today: string }) {
  const stale = needsVerifying(on, today);
  const Icon = stale ? CircleAlert : CircleCheck;
  return (
    <span className="inline-flex items-center gap-t1 text-small">
      <Icon aria-hidden size={16} className={stale ? "text-caution" : "text-accent"} />
      {on ? `Verified ${on}` : "Never verified"}{stale ? " · check it" : ""}
    </span>
  );
}

export default function Directories() {
  const today = new Date().toISOString().slice(0, 10);
  const groups: { title: string; rows: { name: string; detail: string; verifiedOn: string | null }[] }[] = [
    { title: "Lender hardship contacts", rows: LENDER_DIRECTORY.map((l) => ({ name: l.name, detail: [l.hardship.email, l.hardship.phone, l.hardship.url].filter(Boolean).join(" · ") || "No contact yet (the letter says where to look)", verifiedOn: l.verifiedOn })) },
    { title: "Cancellation guides", rows: MERCHANT_CANCEL_GUIDES.map((g) => ({ name: g.merchant, detail: g.steps ? `${g.steps.length} steps${g.notes ? " · note" : ""}` : "Generic steps", verifiedOn: g.verifiedOn })) },
    { title: "Entitlement and comparison links (official sources only)", rows: [...Object.values(PROGRAMS).map((p) => ({ name: p.id, detail: `${p.url}${isOfficial(p.url) ? "" : " · NOT OFFICIAL"}`, verifiedOn: p.verifiedOn })), ...Object.entries(STATE_CONCESSIONS).map(([s, u]) => ({ name: `state_concessions (${s})`, detail: u, verifiedOn: null }))] },
    { title: "Support services", rows: [{ name: NDH.name, detail: `${NDH.phoneDisplay} · ${NDH.url}`, verifiedOn: "2026-09-30" }] },
  ];
  const due = groups.flatMap((g) => g.rows).filter((r) => needsVerifying(r.verifiedOn, today)).length;
  return (
    <main id="main" className="min-h-[100dvh] bg-bg px-gutter py-t6 text-text">
      <div className="mx-auto flex max-w-[960px] flex-col gap-t5">
        <header>
          <h1 className="text-h1 font-display">Directories</h1>
          <p className="mt-t1 text-small text-text-muted">{due} of {groups.flatMap((g) => g.rows).length} entries need checking (never verified, or older than {VERIFY_MONTHS} months). Source: src/data/directories.ts.</p>
        </header>
        {groups.map((g) => (
          <section key={g.title} aria-labelledby={g.title} className="rounded-lg bg-surface p-t5">
            <h2 id={g.title} className="text-h3">{g.title}</h2>
            <ul className="mt-t2 flex flex-col">
              {g.rows.map((r) => (
                <li key={r.name} className="grid gap-x-t3 border-t border-line py-t2 tablet:grid-cols-[200px_1fr_auto]">
                  <span className="text-body-strong">{r.name}</span>
                  <span className="break-all text-small text-text-muted">{r.detail}</span>
                  <Status on={r.verifiedOn} today={today} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        <Link href="/" className="inline-flex min-h-tap items-center text-small text-accent">Back to the app</Link>
      </div>
    </main>
  );
}
