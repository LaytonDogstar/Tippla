"use client";
// O1: feels like an opening, not a form. Two fields; errors after blur or submit, never while first typing.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onboarding } from "@/content/onboarding";
import { OnboardingShell } from "@/components/shell/Shells";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Form";
import { readOnboarding, writeOnboarding } from "@/lib/onboarding/store";
import { formatMobile, isValidEmail, isValidMobile } from "@/lib/onboarding/validate";

const t = onboarding.createAccount;

export default function CreateAccount() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [touched, setTouched] = useState({ email: false, mobile: false });
  useEffect(() => { const s = readOnboarding(); if (s.email) setEmail(s.email); if (s.mobile) setMobile(s.mobile); }, []);
  const emailErr = touched.email && !isValidEmail(email) ? t.errors.email : undefined;
  const mobileErr = touched.mobile && !isValidMobile(mobile) ? t.errors.mobile : undefined;
  const submit = () => {
    setTouched({ email: true, mobile: true });
    if (!isValidEmail(email) || !isValidMobile(mobile)) return;
    writeOnboarding({ email: email.trim(), mobile });
    router.push("/onboarding/password");
  };
  return (
    <OnboardingShell step="create_account" title={t.title} footer={<Button size="standard" full onClick={submit}>{t.continue}</Button>}>
      <p className="mt-t2 text-body text-text-muted">{t.intro}</p>
      <form className="mt-t6 flex flex-col gap-t5" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <TextInput label={t.email} type="email" autoComplete="email" inputMode="email" value={email} helper={t.emailHelp}
          error={emailErr} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((s) => ({ ...s, email: true }))} />
        <TextInput label={t.mobile} type="tel" autoComplete="tel-national" inputMode="numeric" value={mobile} helper={t.mobileHelp}
          error={mobileErr} onChange={(e) => setMobile(formatMobile(e.target.value))} onBlur={() => setTouched((s) => ({ ...s, mobile: true }))} />
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </OnboardingShell>
  );
}
