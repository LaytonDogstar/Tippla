"use client";
// Client side of customer edits: recategorisations go in a cookie (so the server-rendered Home and Calendar
// agree straight away), budgets in localStorage (docs/04 P3: mock persistence).
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CategoryId, PersonaId } from "@/lib/api/types";
import { BUDGETS_KEY, EDITS_COOKIE, parseBudgets, serialiseEdits, type Budgets } from "@/lib/selectors/edits";
import type { CategoryOverrides } from "@/lib/selectors/transactions";

const readCookie = (name: string) => document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);

export function useCategoryEdits(persona: PersonaId, initial: CategoryOverrides, original: Record<string, CategoryId>) {
  const router = useRouter();
  const [edits, setEdits] = useState<CategoryOverrides>(initial);
  const save = useCallback((next: CategoryOverrides) => {
    setEdits(next);
    document.cookie = `${EDITS_COOKIE}=${serialiseEdits(readCookie(EDITS_COOKIE), persona, next)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh(); // server-rendered screens (Home, Calendar) pick the edit up; drops stale router cache
  }, [persona, router]);
  /** Set a transaction's category; moving it back to the original removes the edit. */
  const setCategory = useCallback((id: string, category: CategoryId) => {
    const next = { ...edits };
    if (original[id] === category) delete next[id];
    else next[id] = category;
    save(next);
  }, [edits, original, save]);
  return { edits, setCategory, restore: save };
}

export function useBudgets(persona: PersonaId) {
  const key = `${BUDGETS_KEY}:${persona}`;
  const [budgets, setBudgets] = useState<Budgets>({});
  useEffect(() => {
    try { setBudgets(parseBudgets(localStorage.getItem(key))); } catch { setBudgets({}); }
  }, [key]);
  const save = useCallback((next: Budgets) => {
    setBudgets(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage unavailable: keep in memory */ }
  }, [key]);
  return { budgets, save };
}
