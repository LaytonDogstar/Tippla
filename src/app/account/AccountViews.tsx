"use client";
// P13 Account views. Choices that change other screens (consents, subscription, bank) go through the account
// cookie; personal preferences (contact details, notification channels, theme) are per-device (localStorage).
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import type { Consent, PersonaId } from "@/lib/api/types";
import { accountPage as t } from "@/content/account";
import { PLANS, type PlanId } from "@/config/plans";
import { formatCents, formatDate, formatShortDay, formatUpdated, toAESTDate } from "@/lib/format";
import { formatMobile, isValidEmail, isValidMobile } from "@/lib/onboarding/validate";
import { useAccount } from "@/lib/account/client";
import { mockNow, type AccountState } from "@/lib/account/state";
import type { BillingView } from "@/lib/selectors/account";
import type { NotificationType } from "@/lib/selectors/notifications";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Feedback";
import { RadioGroup, TextInput, Toggle } from "@/components/ui/Form";
import { SampleTag } from "@/components/ui/SampleTag";
import { Sheet } from "@/components/ui/Sheet";

const load = <T,>(key: string, fallback: T): T => { try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; } };
const store = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* in memory only */ } };

// ---- Profile ---------------------------------------------------------------------------------------
type Channel = "email" | "sms" | "push";
type Prefs = Record<NotificationType, Record<Channel, boolean>>;
const TYPES: NotificationType[] = ["score", "bill", "offer", "subscription", "bank"];
const DEFAULT_PREFS: Prefs = {
  score: { email: true, sms: false, push: true }, bill: { email: false, sms: true, push: true }, offer: { email: true, sms: false, push: false },
  subscription: { email: true, sms: false, push: false }, bank: { email: true, sms: false, push: true },
};
type Theme = "system" | "light" | "dark";

export function ProfileView({ persona, profile, matching }: { persona: PersonaId; profile: { name: string; email: string; mobile: string }; matching: boolean }) {
  const toast = useToast();
  const key = `tippla-profile:${persona}`;
  const [details, setDetails] = useState(profile);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [theme, setTheme] = useState<Theme>("system");
  const [editing, setEditing] = useState<"email" | "mobile" | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | undefined>();
  useEffect(() => {
    setDetails({ ...profile, ...load<Partial<typeof profile>>(key, {}) });
    setPrefs({ ...DEFAULT_PREFS, ...load<Partial<Prefs>>(`tippla-notify:${persona}`, {}) });
    setTheme(load<Theme>("tippla-theme-choice", "system"));
  }, [key, persona, profile]);

  const applyTheme = (v: Theme) => {
    setTheme(v);
    store("tippla-theme-choice", v);
    try { if (v === "system") localStorage.removeItem("tippla-theme"); else localStorage.setItem("tippla-theme", v); } catch { /* ignore */ }
    if (v === "system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", v);
  };
  const saveField = () => {
    if (!editing) return;
    const ok = editing === "email" ? isValidEmail(draft) : isValidMobile(draft);
    if (!ok) { setError(editing === "email" ? t.profile.invalidEmail : t.profile.invalidMobile); return; }
    const next = { ...details, [editing]: editing === "mobile" ? formatMobile(draft) : draft.trim() };
    setDetails(next);
    store(key, { email: next.email, mobile: next.mobile });
    toast({ kind: "confirm", message: t.profile.saved(t.profile[editing]) });
    setEditing(null);
  };
  const setPref = (type: NotificationType, ch: Channel, v: boolean) => {
    const next = { ...prefs, [type]: { ...prefs[type], [ch]: v } };
    setPrefs(next);
    store(`tippla-notify:${persona}`, next);
  };

  return (
    <div className="flex flex-col gap-t4 pb-t6">
      <h1 className="sr-only">{t.profile.title}</h1>
      <section aria-labelledby="det-h" className="mt-t2 rounded-md bg-surface">
        <h2 id="det-h" className="p-t4 pb-t2 text-h3 text-text">{t.profile.details}</h2>
        <dl>
          <div className="border-t border-line px-t4 py-t3"><dt className="text-caption text-text-muted">{t.profile.name}</dt><dd className="text-body text-text">{details.name}</dd><dd className="text-caption text-text-muted">{t.profile.readOnly}</dd></div>
          {(["email", "mobile"] as const).map((f) => (
            <div key={f} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-t3 border-t border-line px-t4 py-t2">
              <dt className="col-start-1 row-start-1 text-caption text-text-muted">{t.profile[f]}</dt>
              <dd className="col-start-1 row-start-2 break-words text-body text-text">{details[f]}</dd>
              <dd className="col-start-2 row-span-2 row-start-1"><Button variant="tertiary" aria-label={t.profile.editTitle(t.profile[f])} onClick={() => { setEditing(f); setDraft(details[f]); setError(undefined); }}>{t.profile.edit}</Button></dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="notifications" aria-labelledby="ch-h" className="scroll-mt-t6 rounded-md bg-surface p-t4">
        <h2 id="ch-h" className="text-h3 text-text">{t.profile.channelsHeading}</h2>
        <p className="mt-t1 text-small text-text-muted">{t.profile.channelsIntro}</p>
        {TYPES.map((type) => (
          <fieldset key={type} className="mt-t4 border-t border-line pt-t3">
            <legend className="sr-only">{t.profile.types[type]}</legend>
            <p aria-hidden className="text-body-strong text-text">{t.profile.types[type]}</p>
            {type === "offer" && !matching && <p className="text-caption text-text-muted">{t.profile.offerNeedsMatching}</p>}
            {(["email", "sms", "push"] as Channel[]).map((ch) => (
              <Toggle key={ch} label={`${t.profile.channels[ch]}`} checked={prefs[type][ch]} onChange={(v) => setPref(type, ch, v)} />
            ))}
          </fieldset>
        ))}
      </section>

      <section aria-labelledby="th-h" className="rounded-md bg-surface p-t4">
        <h2 id="th-h" className="sr-only">{t.profile.themeHeading}</h2>
        <RadioGroup legend={t.profile.themeHeading} value={theme} onChange={applyTheme}
          options={(["system", "light", "dark"] as Theme[]).map((v) => ({ value: v, label: t.profile.theme[v] }))} />
      </section>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing ? t.profile.editTitle(t.profile[editing]) : ""}
        footer={<Button full onClick={saveField}>{t.profile.save}</Button>}>
        {editing && <TextInput label={t.profile[editing]} value={draft} error={error} inputMode={editing === "email" ? "email" : "tel"} autoComplete={editing === "email" ? "email" : "tel"}
          onChange={(e) => { setDraft(e.target.value); if (error) setError(undefined); }} />}
      </Sheet>
    </div>
  );
}

// ---- Subscription ------------------------------------------------------------------------------------
export function SubscriptionView({ persona, present, account: initial, billing: b, asOf }: { persona: PersonaId; present: boolean; account: AccountState; billing: BillingView; asOf: string }) {
  const toast = useToast();
  const { account, save } = useAccount(persona, initial);
  const [sheet, setSheet] = useState<"cancel" | "pause" | "change" | null>(null);
  const now = mockNow({ asOf });
  const other: PlanId = b.plan === "pro" ? "standard" : "pro";
  const set = (status: "active" | "paused" | "cancelled", plan: PlanId, msg: string, effective: string) => {
    const before = account;
    save({ ...account, subscription: { status, plan, effective, changedAt: now } });
    setSheet(null);
    toast({ kind: "confirm", message: msg, onUndo: () => save(before) });
  };
  const price = (p: PlanId) => formatCents(PLANS[p].pricePerMonth);

  return (
    <div className="flex flex-col gap-t4 pb-t6">
      <h1 className="sr-only">{t.subscription.title}</h1>
      <section aria-labelledby="plan-h" className="mt-t2 rounded-lg bg-surface p-t5">
        <div className="flex flex-wrap items-center gap-t2">
          <h2 id="plan-h" className="text-h2 font-display text-text">{t.subscription.plan(b.planName)}</h2>
          <span className="inline-flex h-[24px] items-center rounded-xs bg-neutral-soft px-t2 text-caption text-neutral">{t.subscription.status[b.status]}</span>
        </div>
        <p className="tnum mt-t1 text-body text-text">{t.subscription.price(formatCents(b.price))}</p>
        <SampleTag q="Q9" present={present} className="mt-t2" />
        <p role="status" className="mt-t3 text-small text-text">
          {b.status === "cancelled" && b.until ? t.subscription.cancelledUntil(formatShortDay(b.until))
            : b.status === "paused" && b.until ? t.subscription.pausedUntil(formatShortDay(b.until))
            : b.nextCharge ? t.subscription.nextCharge(formatShortDay(b.nextCharge)) : ""}
        </p>
        {b.pendingPlan && b.nextCharge && <p className="mt-t1 text-small text-text-muted">{t.subscription.pendingPlan(PLANS[b.pendingPlan].name, formatShortDay(b.nextCharge))}</p>}
        <p className="mt-t4 text-small text-text-muted">{t.subscription.includes}</p>
        <ul className="mt-t2 flex flex-col gap-t1">{PLANS.pro.extras.map((e) => <li key={e} className="flex items-start gap-t2 text-small text-text"><Check aria-hidden size={16} className="mt-[2px] shrink-0 text-neutral" />{e}</li>)}</ul>
        <div className="mt-t5 flex flex-col gap-t2">
          {b.status === "active" && !b.pendingPlan && <Button full variant="secondary" onClick={() => setSheet("change")}>{t.subscription.changePlan(PLANS[other].name)}</Button>}
          {b.status === "active" && <Button full variant="tertiary" onClick={() => setSheet("cancel")}>{t.subscription.cancel}</Button>}
          {b.status === "cancelled" && <Button full variant="secondary" onClick={() => set("active", b.plan, t.subscription.reactivated, asOf)}>{t.subscription.reactivate}</Button>}
          {b.status === "paused" && <Button full variant="secondary" onClick={() => set("active", b.plan, t.subscription.resumed, asOf)}>{t.subscription.resume}</Button>}
        </div>
      </section>

      <section aria-labelledby="hist-h" className="rounded-md bg-surface">
        <h2 id="hist-h" className="p-t4 pb-t2 text-h3 text-text">{t.subscription.history}</h2>
        {b.history.length ? (
          <ul>{b.history.map((h) => (
            <li key={h.date} className="tnum flex min-h-[52px] items-center justify-between border-t border-line px-t4 text-small text-text">
              <span>{formatDate(h.date)} · {PLANS[h.plan].name}</span><span>{formatCents(h.amount)} · {t.subscription.paid}</span>
            </li>
          ))}</ul>
        ) : <p className="px-t4 pb-t4 text-small text-text-muted">{t.subscription.noHistory}</p>}
      </section>

      <Sheet open={sheet === "cancel"} onClose={() => setSheet(null)} title={t.subscription.cancelTitle}
        footer={<>
          <Button full onClick={() => set("cancelled", b.plan, t.subscription.cancelled, b.effects.cancelAccessUntil)}>{t.subscription.cancelConfirm}</Button>
          <Button full variant="secondary" onClick={() => setSheet("pause")}>{t.subscription.pauseInstead}</Button>
          <Button full variant="tertiary" onClick={() => setSheet(null)}>{t.subscription.back}</Button>
        </>}>
        <p className="text-body text-text-muted">{t.subscription.cancelBody(formatShortDay(b.effects.cancelAccessUntil))}</p>
      </Sheet>
      <Sheet open={sheet === "pause"} onClose={() => setSheet(null)} title={t.subscription.pauseTitle} onBack={() => setSheet("cancel")}
        footer={<>
          <Button full onClick={() => set("paused", b.plan, t.subscription.paused, b.effects.pauseSkips)}>{t.subscription.pauseConfirm}</Button>
          <Button full variant="tertiary" onClick={() => setSheet(null)}>{t.subscription.back}</Button>
        </>}>
        <p className="text-body text-text-muted">{t.subscription.pauseBody(formatShortDay(b.effects.pauseSkips), formatShortDay(b.effects.pauseResumes))}</p>
        <SampleTag q="Q9" present={present} className="mt-t3" />
      </Sheet>
      <Sheet open={sheet === "change"} onClose={() => setSheet(null)} title={t.subscription.changeTitle(PLANS[other].name)}
        footer={<>
          <Button full onClick={() => set("active", other, t.subscription.changed(PLANS[other].name, formatShortDay(b.effects.changeFrom)), b.effects.changeFrom)}>{t.subscription.changeConfirm(PLANS[other].name)}</Button>
          <Button full variant="tertiary" onClick={() => setSheet(null)}>{t.subscription.keepPlan}</Button>
        </>}>
        <p className="text-body text-text-muted">{t.subscription.changeBody(PLANS[other].name, price(other), formatShortDay(b.effects.changeFrom))}</p>
      </Sheet>
    </div>
  );
}

// ---- Consents ----------------------------------------------------------------------------------------
export function ConsentsView({ persona, account: initial, consents, asOf }: { persona: PersonaId; account: AccountState; consents: Consent[]; asOf: string }) {
  const toast = useToast();
  const { account, save } = useAccount(persona, initial);
  const [required, setRequired] = useState<string | null>(null);
  const now = mockNow({ asOf });
  const state = (c: Consent) => account.consents?.[c.id] ? { granted: account.consents[c.id]!.granted, at: account.consents[c.id]!.granted ? account.consents[c.id]!.at : c.granted_at } : { granted: c.granted, at: c.granted_at };
  const matching = consents.find((c) => c.id === "lender_matching");
  const matchingOn = matching ? state(matching).granted : false;

  return (
    <div className="flex flex-col gap-t3 pb-t6">
      <h1 className="sr-only">{t.consents.title}</h1>
      <p className="mt-t2 text-small text-text-muted">{t.consents.intro}</p>
      {consents.map((c) => {
        const s = state(c);
        return (
          <section key={c.id} id={c.id} aria-labelledby={`c-${c.id}`} className="rounded-md bg-surface p-t4">
            <div className="flex flex-wrap items-center gap-t2">
              <h2 id={`c-${c.id}`} className="text-h3 text-text">{c.label}</h2>
              <span className="inline-flex h-[24px] items-center rounded-xs bg-neutral-soft px-t2 text-caption text-neutral">{c.required ? t.consents.required : t.consents.optional}</span>
            </div>
            <p className="mt-t1 text-caption text-text-muted">{s.granted && s.at ? t.consents.given(formatDate(toAESTDate(s.at))) : t.consents.notGiven} · {t.consents.version(c.version)}</p>
            <div className="mt-t2">
              <Toggle label={s.granted ? t.consents.on : t.consents.off} checked={s.granted} onChange={(v) => {
                if (c.required && !v) { setRequired(c.id); return; }
                const before = account;
                save({ ...account, consents: { ...account.consents, [c.id]: { granted: v, at: now } } });
                if (c.id === "lender_matching") toast({ kind: "confirm", message: v ? t.consents.matchingOn : t.consents.matchingPaused, onUndo: () => save(before) });
              }} />
            </div>
            {c.id === "lender_matching" && <p role="status" className="mt-t2 text-small text-text">{matchingOn ? t.consents.matchingOn : t.consents.matchingPaused}</p>}
          </section>
        );
      })}
      <Sheet open={!!required} onClose={() => setRequired(null)} title={t.consents.withdrawRequiredTitle}
        footer={<Button full variant="tertiary" onClick={() => setRequired(null)}>{t.consents.close}</Button>}>
        <p className="text-body text-text-muted">{t.consents.withdrawRequiredBody}</p>
      </Sheet>
    </div>
  );
}

// ---- Bank connections ------------------------------------------------------------------------------
export function BankView({ persona, account: initial, accounts, refreshedAt }: {
  persona: PersonaId; account: AccountState; accounts: { id: number; nickname: string; last4: string; type: string }[]; refreshedAt: string | null;
}) {
  const toast = useToast();
  const { account, save } = useAccount(persona, initial);
  const [sheet, setSheet] = useState<"disconnect" | "reconnect" | "add" | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const off = !!account.bank?.disconnected;
  const refresh = () => { setRefreshing(true); setTimeout(() => { setRefreshing(false); toast({ kind: "info", message: t.bank.refreshDone }); }, 900); };

  return (
    <div className="flex flex-col gap-t3 pb-t6">
      <h1 className="sr-only">{t.bank.title}</h1>
      <p className="mt-t2 text-small text-text-muted">{t.bank.intro}</p>
      {accounts.map((a) => (
        <section key={a.id} aria-label={t.bank.account(a.nickname, a.last4)} className="rounded-md bg-surface p-t4">
          <h2 className="text-h3 text-text">{t.bank.account(a.nickname, a.last4)}</h2>
          <p className="text-caption text-text-muted">{a.type}</p>
          <p role="status" className="mt-t2 text-small text-text">{off ? t.bank.disconnectedNote : refreshedAt ? t.bank.refreshed(formatUpdated(refreshedAt).replace(/^Updated /, "")) : ""}</p>
          <div className="mt-t3 flex flex-col gap-t2">
            {off ? <Button full onClick={() => setSheet("reconnect")}>{t.bank.reconnect}</Button> : (
              <>
                <Button full variant="secondary" loading={refreshing} loadingLabel={t.bank.refreshing} onClick={refresh}>{t.bank.refresh}</Button>
                <Button full variant="tertiary" onClick={() => setSheet("disconnect")}>{t.bank.disconnect}</Button>
              </>
            )}
          </div>
        </section>
      ))}
      <section className="rounded-md bg-surface p-t4">
        <Button full variant="secondary" onClick={() => setSheet("add")}>{t.bank.add}</Button>
        <p className="mt-t2 text-small text-text-muted">{t.bank.addNote}</p>
      </section>

      <Sheet open={sheet === "disconnect"} onClose={() => setSheet(null)} title={t.bank.disconnectTitle}
        footer={<>
          <Button full onClick={() => { save({ ...account, bank: { disconnected: true } }); setSheet(null); toast({ kind: "confirm", message: t.bank.disconnected }); }}>{t.bank.disconnectConfirm}</Button>
          <Button full variant="tertiary" onClick={() => setSheet(null)}>{t.bank.cancel}</Button>
        </>}>
        <p className="text-body text-text-muted">{t.bank.disconnectBody}</p>
      </Sheet>
      <Sheet open={sheet === "reconnect"} onClose={() => setSheet(null)} title={t.bank.reconnectTitle}
        footer={<>
          <Button full onClick={() => { save({ ...account, bank: { disconnected: false } }); setSheet(null); toast({ kind: "confirm", message: t.bank.reconnected }); }}>{t.bank.continue}</Button>
          <Button full variant="tertiary" onClick={() => setSheet(null)}>{t.bank.cancel}</Button>
        </>}>
        <p className="text-body text-text-muted">{t.bank.reconnectBody}</p>
      </Sheet>
      <Sheet open={sheet === "add"} onClose={() => setSheet(null)} title={t.bank.addTitle}>
        <p className="text-body text-text-muted">{t.bank.addBody}</p>
      </Sheet>
    </div>
  );
}
