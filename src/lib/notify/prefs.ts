// The member's notification preferences, with the spec 10 defaults filled in. Client-safe.
import type { AccountState } from "@/lib/account/state";
import { DEFAULT_PREFS, type NotifyPrefs } from "./policy";

export function prefsFor(a: AccountState = {}): NotifyPrefs {
  const n = a.notify;
  return {
    ...DEFAULT_PREFS,
    paused: n?.paused ?? false,
    quiet: n?.quiet ?? DEFAULT_PREFS.quiet,
    detailed: n?.detailed ?? false,
    digest: n?.digest ?? false,
    channels: { ...DEFAULT_PREFS.channels, ...(n?.channels ?? {}) },
  };
}
