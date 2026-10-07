// Why the SmartScore moved, from the attribution selector. Points are estimates (Q3) and always labelled.
import { attributionCopy as t } from "@/content/feed";
import { copy } from "@/content/en-AU";
import { formatDayMonth } from "@/lib/format";
import type { ScoreAttribution } from "@/lib/selectors/scoreAttribution";
import { SampleTag } from "@/components/ui/SampleTag";
import { projectionCopy } from "@/content/loop";
import type { ScoreProjection } from "@/lib/scoring/estimate";

const EstimateTag = () => <span className="inline-flex min-h-[20px] items-center rounded-xs bg-neutral-soft px-t2 text-caption text-neutral">{t.estimate}</span>;

/** One line for Home: "Down 17 since 11/09: new pay advance −9, gambling deposits −6". */
export function ScoreChangeLine({ change, attribution }: { change: { delta: number; since: string } | null; attribution: ScoreAttribution | null }) {
  if (!change) return null;
  const head = copy.score.change(change.delta, formatDayMonth(change.since));
  if (!attribution || !attribution.parts.length) return <p className="mt-t2 text-caption text-text-muted">{head}</p>;
  return (
    <p className="mt-t2 text-caption text-text-muted">
      {head}: {attribution.summary} <EstimateTag />
    </p>
  );
}

/** The full breakdown on /score: each factor that moved, its estimated points and the reason. */
export function ScoreChangeDetail({ attribution, present }: { attribution: ScoreAttribution; present: boolean }) {
  return (
    <section aria-labelledby="what-changed" className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card sm:p-t6">
      <div className="flex flex-wrap items-center gap-t2">
        <h2 id="what-changed" className="text-card text-text sm:text-card-l">{t.heading}</h2>
        <EstimateTag />
        <SampleTag q="Q3" present={present} />
      </div>
      <p className="mt-t1 text-small text-text-muted">
        {t.since(formatDayMonth(attribution.from.date))} · {attribution.from.score} → {attribution.to.score}
      </p>
      {attribution.parts.length ? (
        <ul className="mt-t3 flex flex-col">
          {attribution.parts.map((p) => (
            <li key={p.factor + p.name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-t3 border-t border-divider py-t3">
              <span className="text-body-strong text-text">{p.factor === "GOVERNMENT_RELIANCE" ? p.name : t.factorMove(p.name, p.from.toFixed(1), p.to.toFixed(1))}</span>
              <span className="tnum text-body-strong text-text">{t.points(p.points)}</span>
              {p.reason && <span className="col-span-2 text-small text-text-muted">{p.reason}</span>}
            </li>
          ))}
        </ul>
      ) : <p className="mt-t3 text-small text-text-muted">{t.noChange}</p>}
      <p className="mt-t2 text-caption text-text-muted">{t.estimateNote}</p>
    </section>
  );
}

/** "Skip the next pay advance: about 490 by 23/10". Q3 sample logic, always labelled as an estimate. */
export function ScoreProjectionCard({ projection, present }: { projection: ScoreProjection; present: boolean }) {
  const p = projectionCopy;
  const action = p.actions[projection.liftKey] ?? projection.factor;
  return (
    <section aria-labelledby="projection" className="rounded-card-s bg-surface p-t5 shadow-card sm:rounded-card sm:p-t6">
      <div className="flex flex-wrap items-center gap-t2">
        <h2 id="projection" className="text-card text-text sm:text-card-l">{p.heading}</h2>
        <EstimateTag />
        <SampleTag q="Q3" present={present} />
      </div>
      <p className="tnum mt-t2 text-body-strong text-text">{p.line(action, projection.to, formatDayMonth(projection.by))}</p>
      <p className="mt-t1 text-caption text-text-muted">{p.note}</p>
    </section>
  );
}
