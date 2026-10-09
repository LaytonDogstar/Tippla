"use client";
import { useRouter } from "next/navigation";
import { statesCopy as t } from "@/content/states";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Feedback";
import { Sheet } from "@/components/ui/Sheet";

/** Brand new: bank connected, analysis in progress. Static skeleton (no spinner theatre) + plain copy. */
export function AnalysingState({ home }: { home: boolean }) {
  return (
    <section aria-busy="true" aria-labelledby="an-h" className="mt-t2 flex flex-col gap-t3">
      <div className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t5">
        <h2 id="an-h" className="text-card text-text sm:text-card-l">{t.analysing.title}</h2>
        <p className="mt-t2 text-body text-text-muted">{t.analysing.body}</p>
        <ol className="mt-t4 flex list-decimal flex-col gap-t1 pl-t5 text-small text-text">{t.analysing.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        <p role="status" className="mt-t3 text-caption text-text-muted">{t.analysing.loading}</p>
      </div>
      <div aria-hidden className="flex flex-col gap-t3">
        <div className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t5"><Skeleton className="h-t5 w-1/2" /><Skeleton className="mt-t4 h-[96px] w-full" /></div>
        {home && <div className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t5"><Skeleton className="h-t3 w-1/3" /><Skeleton className="mt-t4 h-t5 w-3/4" /><Skeleton className="mt-t3 h-t3 w-full" /></div>}
        <div className="rounded-card-s bg-surface shadow-card sm:rounded-card p-t5"><Skeleton className="h-t3 w-1/4" /><Skeleton className="mt-t4 h-[120px] w-full" /></div>
      </div>
    </section>
  );
}

/** Lapsed subscription on a drill-down: one sheet, reactivate or go back to Home. */
export function LapsedSheet() {
  const router = useRouter();
  return (
    <Sheet open onClose={() => router.push("/")} title={t.lapsed.title}
      footer={<>
        <Button full onClick={() => router.push("/account/subscription")}>{t.lapsed.reactivate}</Button>
        <Button full variant="link" onClick={() => router.push("/")}>{t.lapsed.home}</Button>
      </>}>
      <p className="text-body text-text-muted">{t.lapsed.body}</p>
    </Sheet>
  );
}
