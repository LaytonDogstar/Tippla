"use client";
import { entitlementsCopy } from "@/content/actions";
import { ChevronDown, ChevronRight, ChevronUp, Search } from "lucide-react";
import Link from "next/link";
import { PageColumns } from "@/components/shell/PageColumns";
import { useEffect, useState } from "react";
import { helpPage as t } from "@/content/account";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'");

export function HelpView({ initialQ, initialOpen, entitlements = false }: { initialQ: string; initialOpen: string | null; entitlements?: boolean }) {
  const [q, setQ] = useState(initialQ);
  const [open, setOpen] = useState<Set<string>>(new Set(initialOpen ? [initialOpen] : []));
  const [contact, setContact] = useState(false);
  useEffect(() => {
    const u = new URL(window.location.href);
    if (q.trim()) u.searchParams.set("q", q.trim()); else u.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", u.toString());
  }, [q]);
  const words = norm(q).split(/\s+/).filter(Boolean);
  const results = t.faqs.filter((f) => words.every((w) => norm(`${f.q} ${f.a}`).includes(w)));
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="pb-t6">
      <PageColumns railLabel={t.railLabel} main={<>
      <label className="mt-t2 flex min-h-[52px] items-center gap-t2 rounded-sm border border-neutral bg-surface px-t3 focus-within:border-accent focus-within:outline focus-within:outline-[length:var(--focus-width)] focus-within:outline-offset-[var(--focus-offset)] focus-within:outline-focus">
        <Search aria-hidden size={20} className="text-text-muted" />
        <span className="sr-only">{t.searchLabel}</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-body text-text outline-none placeholder:text-text-muted" />
      </label>
      <p role="status" className="mt-t2 text-caption text-text-muted">{q.trim() ? t.results(results.length) : ""}</p>

      {results.length ? (
        <ul className="mt-t2 flex flex-col gap-t2">
          {results.map((f) => {
            const isOpen = open.has(f.id);
            return (
              <li key={f.id} className="rounded-card-s bg-surface shadow-card sm:rounded-card">
                <h2>
                  <button type="button" aria-expanded={isOpen} aria-controls={`faq-${f.id}`} onClick={() => toggle(f.id)}
                    className="flex min-h-[56px] w-full items-center justify-between gap-t3 rounded-md p-t4 text-left text-h3 text-text hover:bg-surface2">
                    {f.q}{isOpen ? <ChevronUp aria-hidden size={20} className="shrink-0 text-accent" /> : <ChevronDown aria-hidden size={20} className="shrink-0 text-accent" />}
                  </button>
                </h2>
                <div id={`faq-${f.id}`} hidden={!isOpen} className="px-t4 pb-t4">
                  <p className="text-body text-text-muted">{f.a}</p>
                  {f.links.map((l) => (
                    <Link key={l.href} href={l.href} className="mt-t2 flex min-h-tap items-center justify-between rounded-sm text-small text-accent hover:bg-surface2">{l.label}<ChevronRight aria-hidden size={20} /></Link>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-t2 rounded-card-s bg-surface shadow-card sm:rounded-card p-t5 text-small text-text">{t.empty(q.trim())}</p>
      )}

      </>} rail={<>
        {/* Rail (UX round 2, 4.1): ways to get help and account links, beside the questions. */}
        <section className="flex flex-col gap-t2 rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card">
          <Button variant="secondary" full onClick={() => setContact(true)}>{t.contact}</Button>
          <Link href="/hardship" className="flex min-h-tap items-center justify-between rounded-sm px-t1 text-body14 font-semibold text-accent hover:bg-surface2">{t.hardshipLink}<ChevronRight aria-hidden size={20} /></Link>
          {entitlements && <Link href="/help/entitlements" className="flex min-h-tap items-center justify-between rounded-sm px-t1 text-body14 font-semibold text-accent hover:bg-surface2">{entitlementsCopy.title}<ChevronRight aria-hidden size={20} /></Link>}
        </section>
        <section aria-labelledby="acct-h" className="rounded-card-s bg-surface shadow-card sm:rounded-card">
          <h2 id="acct-h" className="p-t5 pb-t2 text-card text-text sm:text-card-l">{t.accountHeading}</h2>
          {(Object.keys(t.accountLinks) as (keyof typeof t.accountLinks)[]).map((k) => (
            <Link key={k} href={`/account/${k}`} className="flex min-h-[52px] items-center justify-between border-t border-divider px-t5 text-body14 font-semibold text-accent hover:bg-surface2">{t.accountLinks[k]}<ChevronRight aria-hidden size={20} /></Link>
          ))}
        </section>
      </>} />

      <Sheet open={contact} onClose={() => setContact(false)} title={t.contactTitle}>
        <p className="text-body text-text-muted">{t.contactBody}</p>
      </Sheet>
    </div>
  );
}
