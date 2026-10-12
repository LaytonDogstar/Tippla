// Back control (journeys brief A1, 12/10/2026). Cross-page links carry where the customer came from as `origin` (a
// path with its query); the destination's back control returns there, labelled with that page's name. With no
// origin (a direct visit) it falls back to the page's logical parent. Pure, so it's unit-tested.
// The brief suggests `from`; Calendar already uses from/to for its date range, so the origin is `origin`.

export const ORIGIN_PARAM = "origin";

/** Page names for "← Back to …", longest match first. */
const NAMES: [string, string][] = [
  ["/spending/budgets", "Budgets"], ["/spending/compare", "Compare"], ["/spending", "Spending"],
  ["/money-plan", "Money plan"], ["/calendar", "Calendar"], ["/subscriptions", "Subscriptions"],
  ["/score", "SmartScore"], ["/progress/whats-next", "What's next"], ["/progress", "Pay cycles"],
  ["/loans/repayment", "Repayment calculator"], ["/loans", "Borrowing"], ["/offers", "Offers"],
  ["/hardship", "Help & hardship"], ["/help/entitlements", "Entitlements"], ["/help", "Help"],
  ["/account", "Account"], ["/notifications/summary", "Weekly summary"], ["/notifications", "Notifications"],
  ["/assistant", "Ask Tippla"],
];

/** The page's name, or null for pages we don't name (they fall back to the parent). */
export function pageName(href: string): string | null {
  const path = href.split(/[?#]/)[0]!;
  if (path === "/" || path === "") return "Today";
  return NAMES.find(([p]) => path === p || path.startsWith(`${p}/`))?.[1] ?? null;
}

/** Only an internal, named page is a valid origin (never another site, never a protocol-relative URL). */
export function safeFrom(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  return pageName(raw) ? raw : null;
}

/** Where the back control goes, and its label: the origin when there is one, else the fallback, else nothing. */
export function backTarget(from: string | null | undefined, fallback?: string | null): { href: string; label: string } | null {
  const origin = safeFrom(from);
  if (origin) return { href: origin, label: pageName(origin)! };
  if (fallback) return { href: fallback, label: pageName(fallback) ?? "Today" };
  return null;
}

/** Query params that describe a moment, not a place: never carried into an origin. */
const TRANSIENT = [ORIGIN_PARAM, "panel"];

/** The origin to record for the current page: its path and query, without its own origin or an open panel. */
export function originOf(pathname: string, search: string): string {
  const q = new URLSearchParams(search);
  for (const k of TRANSIENT) q.delete(k);
  const s = q.toString();
  return s ? `${pathname}?${s}` : pathname;
}

/** A link's href with the origin added (left alone when it's the same page, external, or already has one). */
export function withFrom(href: string, origin: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const [pathAndQuery, hash] = href.split("#") as [string, string | undefined];
  const [path, query = ""] = pathAndQuery.split("?") as [string, string | undefined];
  if (path === origin.split("?")[0]) return href;
  const q = new URLSearchParams(query);
  if (q.has(ORIGIN_PARAM)) return href;
  q.set(ORIGIN_PARAM, origin);
  return `${path}?${q.toString()}${hash !== undefined ? `#${hash}` : ""}`;
}
