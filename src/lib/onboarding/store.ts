"use client";
// Mock onboarding state in sessionStorage (real build: Tippla API). Every access is guarded: storage can be unavailable.
export interface ConsentRecord { granted: boolean; at: string; version: string }
export interface OnboardingState {
  email?: string;
  mobile?: string;
  passwordSet?: boolean;
  consents?: Record<"ff_data_sharing" | "talefin_bank_data" | "lender_matching", ConsentRecord>;
  bankConnected?: boolean;
}

const KEY = "tippla-onboarding";
export const CONSENT_VERSION = "1.2";

export function readOnboarding(): OnboardingState {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as OnboardingState; } catch { return {}; }
}
export function writeOnboarding(patch: Partial<OnboardingState>): OnboardingState {
  const next = { ...readOnboarding(), ...patch };
  try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable: state lives for this page only */ }
  return next;
}
