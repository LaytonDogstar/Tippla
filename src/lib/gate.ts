// Optional site-wide password (for sharing a hosted preview). Off unless SITE_PASSWORD is set.
// The cookie holds a SHA-256 of the password, never the password, so it can't be forged without it.
export const GATE_COOKIE = "tippla-gate";
export const GATE_PATHS = ["/gate", "/api/gate"];
/** Signed in to the portal (prototype): set by logging in (the gate) or by picking a persona. Without it, "/" is the
 *  public marketing home. The portal itself is still behind the preview password when SITE_PASSWORD is set. */
export const MEMBER_COOKIE = "tippla-member";
/** The public marketing site (14/10/2026): no password, no persona, no portal chrome. */
export const SITE_PATHS = ["/home", "/smartscore", "/pricing", "/security", "/support", "/faq", "/login"];
export const isSitePath = (path: string) => SITE_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

export async function gateToken(password: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`tippla-preview:${password}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison (both are hex digests of the same length). */
export function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Only same-site paths after signing in: never "//evil.example" or a full URL. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
