"use client";
// Cross-page panels (journeys brief A1/A2, 12/10/2026): gambling, one lender, money's tight and the hardship
// letter, all in the existing Sheet (bottom sheet on phones, right drawer on desktop). The open panel lives in the
// URL as `?panel=` (gambling · lender:<name> · tight · letter[:<name>]), so the browser or phone back button
// closes it and returns to exactly where the customer was; ✕ and Esc do the same.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { ExternalLink, Phone } from "lucide-react";
import { panels as t } from "@/content/panels";
import { moneyPlan as mp } from "@/content/moneyPlan";
import { NDH } from "@/config/services";
import { ENERGY_COMPARE_VIC, PROGRAMS } from "@/data/directories";
import { formatDayMonth, formatShortDay, formatWhole } from "@/lib/format";
import type { PanelData } from "@/lib/selectors/panels";
import type { PersonaId } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import { useAccount } from "@/lib/account/client";
import type { LoanBalance } from "@/lib/selectors/figures";
import { HardshipLetter } from "./HardshipLetter";
import { HardshipSwitch } from "./HardshipSwitch";
import { Sheet } from "@/components/ui/Sheet";
import { ButtonLink } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";

const PUSHED = "tippla-panel-pushed";

/** Open and close a URL panel. Opening pushes a history entry; closing goes back through it when we pushed it. */
export function useUrlPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const panel = search.get("panel");
  const hrefFor = useCallback((p: string | null) => {
    const q = new URLSearchParams(search.toString());
    if (p) q.set("panel", p); else q.delete("panel");
    const s = q.toString();
    return `${pathname}${s ? `?${s}` : ""}`;
  }, [pathname, search]);
  const open = useCallback((p: string) => {
    try { sessionStorage.setItem(PUSHED, p); } catch { /* fine */ }
    router.push(hrefFor(p), { scroll: false });
  }, [router, hrefFor]);
  const close = useCallback(() => {
    let pushed: string | null = null;
    try { pushed = sessionStorage.getItem(PUSHED); sessionStorage.removeItem(PUSHED); } catch { /* fine */ }
    if (pushed && pushed === panel) router.back(); else router.replace(hrefFor(null), { scroll: false });
  }, [router, hrefFor, panel]);
  return { panel, open, close, hrefFor };
}

/** A button that opens a panel (keeps its own look). */
export function PanelButton({ panel, className, children, ariaLabel }: { panel: string; className?: string; children: ReactNode; ariaLabel?: string }) {
  const { open } = useUrlPanel();
  return <button type="button" aria-label={ariaLabel} onClick={() => open(panel)} className={className}>{children}</button>;
}

const linkCls = "inline-flex min-h-tap items-center gap-t1 self-start text-body14 font-bold text-accent underline-offset-2 hover:underline";
const telCls = "inline-flex min-h-tap items-center gap-t2 self-start rounded-pill bg-accent-soft px-t3 text-body14 font-bold text-accent-strong";

export function balanceText(b: LoanBalance) {
  return b.kind === "estimate" ? t.lender.balanceEstimate(formatWhole(b.amount))
    : b.kind === "shared" ? t.lender.balanceShared(formatWhole(b.amount), b.with.join(" and "))
    : t.lender.balanceNone;
}

export function JourneyPanels({ data, persona, account }: { data: PanelData; persona: PersonaId; account: AccountState; asOf?: string }) {
  const asOf = data.asOf;
  const { panel, close, open } = useUrlPanel();
  const { update } = useAccount(persona, account);
  // The same record the Hardship page keeps (spec 06: "Did you hear back?" next pay cycle).
  const letterDone = (lender: string, output: "copy" | "email" | "pdf") =>
    update((l) => ({ ...l, hardshipLetters: [...(l.hardshipLetters ?? []).filter((x) => x.lender !== lender), { lender, at: asOf, output }] }));
  const [kind, arg] = panel ? (panel.includes(":") ? [panel.slice(0, panel.indexOf(":")), panel.slice(panel.indexOf(":") + 1)] : [panel, null]) : [null, null];
  const lender = kind === "lender" ? data.lenders.find((l) => l.provider === arg) ?? null : null;
  const g = data.gambling;
  return (
    <>
      <Sheet open={kind === "gambling" && !!g} onClose={close} title={t.gambling.title} subtitle={g ? t.gambling.sub(formatDayMonth(g.cycle.start), formatDayMonth(g.cycle.end)) : undefined}>
        {g && (
          <div className="flex flex-col gap-t5">
            <div className="flex flex-col gap-t1">
              <span className="text-meta font-semibold text-text-secondary">{t.gambling.total}</span>
              <span className="tnum text-[1.75rem] font-extrabold text-text">{formatWhole(g.total)}</span>
              <span className="text-meta text-text-muted">{Math.round(g.change) === 0 ? t.gambling.same : `${t.gambling.change(formatWhole(Math.abs(g.change)), g.change > 0)} (${t.gambling.lastCycle(formatWhole(g.lastCycle))})`}</span>
            </div>
            <section aria-labelledby="gp-support" className="flex flex-col gap-t2 rounded-[14px] bg-accent-soft p-t4">
              <h3 id="gp-support" className="text-body14 font-extrabold text-text">{t.gambling.supportTitle}</h3>
              <ul className="flex flex-col gap-t3">
                {t.gambling.support.map((s) => (
                  <li key={s.id} className="flex flex-col gap-[2px]">
                    <span className="text-body14 font-bold text-text">{s.title}</span>
                    <span className="text-meta text-text-secondary">{s.body}</span>
                    <span className="flex flex-wrap gap-x-t3">
                      {s.tel && <a href={s.tel.href} className={telCls}><Phone aria-hidden size={16} />{s.tel.label}</a>}
                      {s.href && <a href={s.href} target="_blank" rel="noopener noreferrer" className={linkCls}>{new URL(s.href).hostname.replace(/^www\./, "")}<ExternalLink aria-hidden size={14} /><span className="sr-only"> {t.gambling.opensIn}</span></a>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="gp-tx" className="flex flex-col gap-t2">
              <h3 id="gp-tx" className="text-body14 font-extrabold text-text">{t.gambling.txTitle}</h3>
              {g.transactions.length ? (
                <ul>
                  {g.transactions.map((x) => (
                    <li key={x.id} className="flex items-center justify-between gap-t3 border-t border-divider py-t2 first:border-t-0">
                      <span><span className="block text-body14 font-semibold text-text">{x.merchant}</span><span className="block text-meta text-text-muted">{formatShortDay(x.date)}</span></span>
                      <span className="tnum text-body14 font-bold text-text">{formatWhole(x.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-body14 text-text-muted">{t.gambling.none}</p>}
            </section>
            <Link href="/spending?category=gambling#activity" className={linkCls}>{t.gambling.seeAll}</Link>
          </div>
        )}
      </Sheet>

      <Sheet open={!!lender} onClose={close} title={lender?.provider ?? ""} subtitle={lender ? t.lender.kinds[lender.kind] : undefined}>
        {lender && (
          <div className="flex flex-col gap-t5">
            <dl className="grid grid-cols-1 gap-t3">
              <Row label={t.lender.repayment} value={t.lender.repaymentValue(formatWhole(lender.amount), t.lender.freq[lender.frequency])} note={t.lender.perCycle(formatWhole(lender.perCycle))} />
              <Row label={t.lender.nextDue} value={lender.nextDue ? t.lender.nextDueValue(formatWhole(lender.nextDue.amount), formatShortDay(lender.nextDue.date)) : t.lender.noneDue} />
              <Row label={t.lender.repaid90} value={formatWhole(lender.repaid90)} />
              <Row label={t.lender.balance} value={balanceText(lender.balance)} note={lender.balance.kind === "none" ? undefined : t.lender.balanceNote} />
            </dl>
            <div className="flex flex-wrap gap-[10px]">
              {data.letter && <button type="button" onClick={() => open(`letter:${lender.provider}`)} className="inline-flex min-h-tap items-center rounded-pill bg-accent px-t4 text-body-strong text-on-accent">{t.lender.hardship}</button>}
              <ButtonLink href={`/loans?fix=${encodeURIComponent(lender.provider)}`} variant="secondary">{t.lender.notRight}</ButtonLink>
            </div>
            <Link href={`/loans?tab=history&provider=${encodeURIComponent(lender.provider)}`} className={linkCls}>{t.lender.seeAll}</Link>
          </div>
        )}
      </Sheet>

      <Sheet open={kind === "letter" && !!data.letter} onClose={close} title={t.letter.title}>
        {data.letter && kind === "letter" && (
          <HardshipLetter key={arg ?? "any"} name={data.letter.name}
            prefill={arg ? [...data.letter.prefill].sort((a, b) => (a.lender === arg ? -1 : b.lender === arg ? 1 : 0)) : data.letter.prefill}
            onDone={letterDone} />
        )}
      </Sheet>

      <Sheet open={kind === "tight"} onClose={close} title={t.tight.title} subtitle={t.tight.sub(formatShortDay(data.tight.payday))}>
        <Tight data={data} openLetter={() => open("letter")} />
        {data.hardshipMode && <div className="mt-t5 border-t border-divider pt-t4"><HardshipSwitch persona={persona} account={account} asOf={asOf} mode /></div>}
      </Sheet>
    </>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-[2px] rounded-[12px] border border-line px-t4 py-t3">
      <dt className="text-meta font-semibold text-text-secondary">{label}</dt>
      <dd className="text-body14 font-extrabold text-text">{value}</dd>
      {note && <dd className="text-meta text-text-muted">{note}</dd>}
    </div>
  );
}

function Tight({ data, openLetter }: { data: PanelData; openLetter: () => void }) {
  const s = data.tight;
  const w = mp.wins.items;
  const vic = s.state === "VIC";
  const due = s.beforePayday ? `/calendar?from=${s.beforePayday.from}&to=${s.beforePayday.to}` : "/calendar";
  const winLink = (id: string): { label: string; href: string; external?: boolean } => id === "subscriptions" ? { label: w.subscriptions.link, href: "/subscriptions" }
    : id === "failed_debits" ? { label: w.failed_debits.link, href: due }
    : id === "phone" ? { label: w.phone.link, href: "/money-plan#mp-wins" }
    : { label: w.energy.link(vic), href: vic ? ENERGY_COMPARE_VIC : PROGRAMS.energy_compare.url, external: true };
  const h3 = "text-body14 font-extrabold text-text";
  return (
    <div className="flex flex-col gap-t5 text-body14 text-text">
      {(s.billsOnly < 0 || (s.withUsual && s.withUsual.balance < 0)) && (
        <p className="rounded-[12px] bg-negative-soft px-t4 py-t3 text-text">
          {s.billsOnly < 0 && <span className="block font-bold text-negative">{t.tight.summary(formatWhole(-s.billsOnly))}</span>}
          {s.withUsual && s.withUsual.balance < 0 && <span className="block">{t.tight.summaryUsual(formatWhole(-s.withUsual.balance), formatShortDay(s.withUsual.date))}</span>}
        </p>
      )}
      <section className="flex flex-col gap-t2">
        <h3 className={h3}>{t.tight.steps.due}</h3>
        {s.due.length ? (
          <ul>
            {s.due.map((b) => (
              <li key={`${b.merchant}-${b.date}`} className="flex items-start justify-between gap-t3 border-t border-divider py-t2 first:border-t-0">
                <span><span className="block font-semibold">{b.merchant} · {formatShortDay(b.date)}</span><span className="block text-meta text-text-muted">{b.lender ? t.tight.steps.dueLender : t.tight.steps.dueBill}</span></span>
                <span className="tnum font-bold">{formatWhole(b.amount)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-text-muted">{t.tight.steps.dueNone}</p>}
      </section>
      {s.wins.length > 0 && (
        <section className="flex flex-col gap-t2">
          <h3 className={h3}>{t.tight.steps.wins}</h3>
          <ul className="flex flex-col gap-t1">
            {s.wins.map((x) => {
              const l = winLink(x.id);
              return <li key={x.id}>{l.external
                ? <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkCls}>{l.label}<ExternalLink aria-hidden size={14} /><span className="sr-only"> {t.gambling.opensIn}</span></a>
                : <Link href={l.href} className={linkCls}>{l.label}</Link>}</li>;
            })}
          </ul>
        </section>
      )}
      {s.bufferVisible && (
        <section className="flex flex-col gap-t1">
          <h3 className={h3}>{t.tight.steps.buffer}</h3>
          <p className="text-text-secondary">{t.tight.steps.bufferBody}</p>
          <Link href="/progress#buffer" className={linkCls}>{t.tight.steps.bufferLink}</Link>
        </section>
      )}
      <section className="flex flex-col gap-t1">
        <h3 className={h3}>{s.bufferVisible ? t.tight.steps.tippla : t.tight.steps.tippla.replace(/^4\./, "3.")}</h3>
        <p className="text-text-secondary">{t.tight.steps.tipplaBody}</p>
        <Link href="/account/subscription" className={linkCls}>{t.tight.steps.tipplaLink}</Link>
      </section>
      <section className="flex flex-col gap-t1">
        <h3 className={h3}>{s.bufferVisible ? t.tight.steps.lender : t.tight.steps.lender.replace(/^5\./, "4.")}</h3>
        <p className="text-text-secondary">{t.tight.steps.lenderBody}</p>
        {data.letter && <button type="button" onClick={openLetter} className={linkCls}>{t.tight.steps.lenderLink}</button>}
        <p className="mt-t2 text-text-secondary">{t.tight.steps.ndh}</p>
        <a href={NDH.tel} className={telCls}><Phone aria-hidden size={16} />{t.tight.steps.ndhLink}</a>
      </section>
      <Link href="/hardship" className={cx(linkCls, "border-t border-divider pt-t3")}>{t.tight.all}</Link>
    </div>
  );
}
