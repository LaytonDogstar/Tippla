// Server-side portal shell: adds the docs/09 state handling every portal page shares, then renders the frame.
//   analysing (brand new)  → skeleton + analysing copy instead of the page
//   lapsed subscription    → Home keeps the score; drill-downs show the reactivate sheet
//   offline / API error    → "Couldn't refresh. Showing data from {time}."
// Hardship, Help, Account and Notifications are never gated: support and billing must always be reachable.
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { RAW } from "@/lib/api/fixtures";
import { toCustomerScore } from "@/lib/api/client";
import type { PersonaId } from "@/lib/api/types";
import { DEV_COOKIE, parseDevStates } from "@/lib/dev/states";
import { formatUpdated } from "@/lib/format";
import { statesCopy as t } from "@/content/states";
import { InlineAlert } from "@/components/ui/Feedback";
import { AnalysingState, LapsedSheet } from "./States";
import { PortalFrame } from "./Shells";
import { loadCustomer } from "@/lib/customer";
import { feed } from "@/lib/feed";
import { paydayCheckIn } from "@/lib/selectors";
import { PageAnalytics } from "@/components/analytics/PageAnalytics";

const UNGATED = ["/hardship", "/help", "/account", "/notifications"];

export async function PortalShell(props: {
  path: string; title?: string; backHref?: string; persona: PersonaId; present: boolean;
  header?: ReactNode; wide?: boolean; cta?: ReactNode; children: ReactNode;
}) {
  const states = parseDevStates(cookies().get(DEV_COOKIE)?.value);
  const ungated = UNGATED.some((p) => props.path === p || props.path.startsWith(`${p}/`));
  const offline = states.includes("offline");
  const scoredAt = toCustomerScore(RAW[props.persona].score).scoredAt;
  const notice = offline ? <InlineAlert tone="caution">{t.offline(formatUpdated(scoredAt).replace(/^Updated /, ""))}</InlineAlert> : undefined;
  let body = props.children;
  if (states.includes("analysing") && !ungated) body = <AnalysingState home={props.path === "/"} />;
  else if (states.includes("lapsed") && !ungated && props.path !== "/") body = <>{props.children}<LapsedSheet /></>;
  // Nav badges: open "Needs a look" items per section (same rules and choices as Home).
  const { data, edits, account } = await loadCustomer(props.persona);
  const { bySection } = feed({ d: data, edits }, account.feed);
  return (
    <PortalFrame {...props} notice={notice} badges={bySection}>
      {body}
      <PageAnalytics route={props.path} payday={paydayCheckIn(data) !== null} />
    </PortalFrame>
  );
}
