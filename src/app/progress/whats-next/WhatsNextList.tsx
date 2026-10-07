"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { whatsNextCopy as t } from "@/content/plans";
import { track } from "@/lib/analytics/client";
import { Sheet } from "@/components/ui/Sheet";

export function WhatsNextList({ items }: { items: { id: string; title: string; body: string; href: string | null; prototype: boolean }[] }) {
  const [soon, setSoon] = useState<string | null>(null);
  useEffect(() => { track("whats_next_viewed", {}); }, []);
  const row = (i: (typeof items)[number]) => (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-body-strong text-text">{i.title}{i.prototype ? <span className="ml-t2 rounded-xs bg-neutral-soft px-t1 text-caption text-neutral">{t.prototype}</span> : null}</span>
        <span className="block text-small text-text-muted">{i.body}</span>
      </span>
      <ChevronRight aria-hidden size={20} className="text-accent" />
    </>
  );
  return (
    <>
      <ul className="mt-t2 flex flex-col gap-t2 pb-t6">
        {items.map((i) => (
          <li key={i.id}>
            {i.href
              ? <Link href={i.href} className="flex min-h-[64px] items-center gap-t3 rounded-card-s bg-surface shadow-card sm:rounded-card p-t4 hover:bg-surface2">{row(i)}</Link>
              : <button type="button" onClick={() => setSoon(i.title)} className="flex min-h-[64px] w-full items-center gap-t3 rounded-md bg-surface p-t4 text-left hover:bg-surface2">{row(i)}</button>}
          </li>
        ))}
      </ul>
      <Sheet open={!!soon} onClose={() => setSoon(null)} title={soon ?? ""}><p className="text-body text-text-muted">{t.soon}.</p></Sheet>
    </>
  );
}
