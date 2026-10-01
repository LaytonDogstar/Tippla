import { loadCustomer } from "@/lib/customer";
import { currentPersona, presentationMode } from "@/lib/persona";
import { lenderMatchingOn } from "@/lib/selectors";
import { accountPage as t } from "@/content/account";
import { PortalShell } from "@/components/shell/Portal";
import { ProfileView } from "../AccountViews";

export const dynamic = "force-dynamic";

export default async function Profile({ searchParams }: { searchParams: { persona?: string; present?: string } }) {
  const persona = currentPersona(searchParams.persona);
  const { data } = await loadCustomer(persona);
  return (
    <PortalShell path="/account/profile" title={t.profile.title} backHref="/account" persona={persona} present={presentationMode(searchParams.present)}>
      <ProfileView persona={persona} profile={{ name: data.profile.full_name, email: data.profile.email, mobile: data.profile.mobile }} matching={lenderMatchingOn(data)} />
    </PortalShell>
  );
}
