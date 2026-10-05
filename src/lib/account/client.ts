"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { PersonaId } from "@/lib/api/types";
import { ACCOUNT_COOKIE, parseAccount, serialiseAccount, type AccountState } from "./state";

const readCookie = (name: string) => document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);

/** Update account choices: writes the cookie and refreshes server-rendered screens (Home, Offers, nav). */
export function useAccount(persona: PersonaId, initial: AccountState) {
  const router = useRouter();
  const [account, setAccount] = useState<AccountState>(initial);
  const save = useCallback((next: AccountState) => {
    setAccount(next);
    document.cookie = `${ACCOUNT_COOKIE}=${serialiseAccount(readCookie(ACCOUNT_COOKIE), persona, next)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [persona, router]);
  /** Change one part against the latest saved state (other components on the page may have saved since). */
  const update = useCallback((fn: (latest: AccountState) => AccountState) => {
    const latest = parseAccount(readCookie(ACCOUNT_COOKIE), persona);
    save(fn(latest));
  }, [persona, save]);
  return { account, save, update };
}
