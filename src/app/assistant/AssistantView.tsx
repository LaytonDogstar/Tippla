"use client";
import Link from "next/link";
import { ExternalLink, LifeBuoy, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { assistantCopy as t } from "@/content/assistant";
import { track } from "@/lib/analytics/client";
import type { Reply } from "@/lib/assistant/service";
import { Button } from "@/components/ui/Button";
import { SampleTag } from "@/components/ui/SampleTag";
import { cx } from "@/components/ui/cx";

type Turn = { q: string; r: Reply | null; error?: boolean; rated?: boolean };

function Answer({ r, onRate, rated }: { r: Reply; onRate: (helpful: boolean) => void; rated: boolean }) {
  // Distress: the support links lead, before anything else.
  const support = r.escalation === "distress";
  return (
    <div className={cx("rounded-md p-t4", support ? "bg-accent-soft" : "bg-surface")}>
      {support && <LifeBuoy aria-hidden size={20} className="mb-t2 text-accent" />}
      <p className="text-body text-text">{r.text}</p>
      {r.points.length > 0 && <ul className="mt-t2 flex list-disc flex-col gap-t1 pl-t5 text-body text-text">{r.points.map((p) => <li key={p}>{p}</li>)}</ul>}
      {r.links.length > 0 && (
        <ul className="mt-t3 flex flex-col gap-t1">
          {r.links.map((l) => (
            <li key={l.href}>
              {l.external
                ? <a href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => track("assistant_link_followed", { route: l.href.startsWith("tel:") ? "tel" : "external" })}
                    className="inline-flex min-h-tap items-center gap-t2 text-body-strong text-accent underline-offset-2 hover:underline">{l.label}{l.href.startsWith("http") && <ExternalLink aria-hidden size={16} />}</a>
                : <Link href={l.href} onClick={() => track("assistant_link_followed", { route: l.href.replace(/^\//, "").replace(/\W+/g, "_") || "home" })}
                    className="inline-flex min-h-tap items-center text-body-strong text-accent underline-offset-2 hover:underline">{l.label}</Link>}
            </li>
          ))}
        </ul>
      )}
      {r.id !== null && (
        rated ? <p role="status" className="mt-t2 text-caption text-text-muted">{t.thanks}</p> : (
          <div className="mt-t2 flex items-center gap-t2 text-caption text-text-muted">
            <span>{t.helpful}</span>
            <Button variant="tertiary" onClick={() => onRate(true)} aria-label={`${t.yes}: ${t.helpful}`}>{t.yes}</Button>
            <Button variant="tertiary" onClick={() => onRate(false)} aria-label={`${t.no}: ${t.helpful}`}>{t.no}</Button>
          </div>
        )
      )}
    </div>
  );
}

export function AssistantView({ suggestions, initial, entry, modeLabel, present }: { suggestions: string[]; initial: string | null; entry: "home" | "contextual"; modeLabel: string; present: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const asked = useRef(false);
  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true); setQ("");
    setTurns((ts) => [...ts, { q: text, r: null }]);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: text }) });
      if (!res.ok) throw new Error(String(res.status));
      const r = (await res.json()) as Reply;
      track("assistant_question", { intent: r.intent });
      if (r.escalation) track("assistant_escalated", { type: r.escalation });
      setTurns((ts) => ts.map((x, i) => (i === ts.length - 1 ? { ...x, r } : x)));
    } catch {
      setTurns((ts) => ts.map((x, i) => (i === ts.length - 1 ? { ...x, error: true } : x)));
    } finally { setBusy(false); }
  };
  useEffect(() => {
    track("assistant_opened", { entry });
    if (initial && !asked.current) { asked.current = true; void ask(initial); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const rate = async (i: number, helpful: boolean) => {
    const id = turns[i]?.r?.id;
    track("assistant_answer_rated", { helpful });
    setTurns((ts) => ts.map((x, j) => (j === i ? { ...x, rated: true } : x)));
    if (id) await fetch("/api/assistant/rate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, helpful }) }).catch(() => {});
  };
  return (
    <div className="flex flex-col gap-t4 pb-t6">
      <p className="mt-t2 text-caption text-text-muted">{modeLabel} <SampleTag q="Q40" present={present} /></p>
      <ol aria-live="polite" className="flex flex-col gap-t4">
        {turns.map((x, i) => (
          <li key={i} className="flex flex-col gap-t2">
            <p className="self-end rounded-md bg-surface2 px-t4 py-t2 text-body text-text"><span className="sr-only">{t.you}: </span>{x.q}</p>
            <div><span className="sr-only">{t.tippla}: </span>
              {x.r ? <Answer r={x.r} rated={!!x.rated} onRate={(h) => rate(i, h)} /> : x.error ? <p role="alert" className="text-body text-text">{t.error}</p> : <p className="text-body text-text-muted">{t.thinking}…</p>}
            </div>
          </li>
        ))}
      </ol>
      {turns.length === 0 && (
        <section aria-labelledby="sugg-h">
          <h2 id="sugg-h" className="text-caption text-text-muted">{t.suggested}</h2>
          <ul className="mt-t2 flex flex-wrap gap-t2">
            {suggestions.map((s) => <li key={s}><button type="button" onClick={() => ask(s)} className="min-h-tap rounded-pill border border-divider bg-surface px-t4 text-small text-text hover:bg-surface2">{s}</button></li>)}
          </ul>
        </section>
      )}
      <form className="flex items-end gap-t2" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
        <label className="flex-1">
          <span className="text-small text-text">{t.label}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} placeholder={t.placeholder}
            className="mt-t1 block h-[48px] w-full rounded-sm border border-neutral bg-surface px-t3 text-body text-text placeholder:text-text-muted focus:border-accent focus:outline focus:outline-[length:var(--focus-width)] focus:outline-offset-[var(--focus-offset)] focus:outline-focus" />
        </label>
        <Button type="submit" size="standard" icon={Send} disabled={busy || !q.trim()}>{t.send}</Button>
      </form>
      <p className="text-caption text-text-muted">{t.general}</p>
    </div>
  );
}
