// Spec 05 connection health surfaces: safe to spend paused on old data, and the "Based on data from" stamp.
import Link from "next/link";
import { Wallet } from "lucide-react";
import { healthCopy as t } from "@/content/corrections";
import { safeCopy } from "@/content/loop";
import { formatShortDay } from "@/lib/format";

export function SafeToSpendPaused({ dataFrom }: { dataFrom: string }) {
  return (
    <section aria-label={safeCopy.label} className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t4">
      <div className="flex items-start gap-t3">
        <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-surface2 text-neutral"><Wallet size={24} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-caption text-text-muted">{safeCopy.label}</h2>
          <p className="text-h3 text-text">{t.paused}</p>
          <p className="mt-t1 text-small text-text-muted">{t.pausedBody(formatShortDay(dataFrom))}</p>
          <Link href="/account/bank/reconnect?return=/" className="mt-t2 inline-flex min-h-tap items-center text-body-strong text-accent underline-offset-2 hover:underline">{t.reconnect}</Link>
        </div>
      </div>
    </section>
  );
}

export function DataStamp({ dataFrom, returnTo }: { dataFrom: string; returnTo: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-t2 rounded-sm bg-neutral-soft px-t3 py-t2 text-small text-text">
      <span>{t.basedOn(formatShortDay(dataFrom))}</span>
      <Link href={`/account/bank/reconnect?return=${encodeURIComponent(returnTo)}`} className="inline-flex min-h-tap items-center text-accent underline-offset-2 hover:underline">{t.reconnect}</Link>
    </p>
  );
}
