"use client";
// O1 (second step): password or passkey (mocked).
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { onboarding } from "@/content/onboarding";
import { OnboardingShell } from "@/components/shell/Shells";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Form";
import { Sheet } from "@/components/ui/Sheet";
import { writeOnboarding } from "@/lib/onboarding/store";
import { isValidPassword } from "@/lib/onboarding/validate";

const t = onboarding.password;

export default function Password() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [passkey, setPasskey] = useState(false);
  const next = () => { writeOnboarding({ passwordSet: true }); router.push("/onboarding/consents"); };
  const submit = () => { setTouched(true); if (isValidPassword(pw)) next(); };
  return (
    <OnboardingShell backHref="/onboarding/create-account" title={t.title}
      footer={<><Button size="standard" full onClick={submit}>{t.continue}</Button><Button variant="tertiary" full onClick={() => setPasskey(true)}>{t.passkey}</Button></>}>
      <p className="mt-t2 text-body text-text-muted">{t.intro}</p>
      <form className="mt-t6" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <TextInput label={t.password} type={show ? "text" : "password"} autoComplete="new-password" value={pw} helper={t.passwordHelp}
          error={touched && !isValidPassword(pw) ? t.error : undefined} onChange={(e) => setPw(e.target.value)} onBlur={() => setTouched(true)} />
        <button type="button" onClick={() => setShow((v) => !v)} className="mt-t2 inline-flex min-h-tap items-center gap-t2 rounded-sm px-t1 text-small text-accent hover:bg-surface2">
          {show ? <EyeOff aria-hidden size={20} /> : <Eye aria-hidden size={20} />}
          {show ? t.hide : t.show}
        </button>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
      <Sheet open={passkey} onClose={() => setPasskey(false)} title={t.passkeyTitle} footer={<Button full onClick={next}>{t.passkeyContinue}</Button>}>
        <p className="text-body text-text-muted">{t.passkeyBody}</p>
      </Sheet>
    </OnboardingShell>
  );
}
