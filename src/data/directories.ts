// Spec 06 directories: lender hardship contacts, merchant cancellation guides, entitlement programs and bill
// comparison pointers. Each entry has a "last verified" date; /dev/directories flags anything never verified
// or older than 6 months. Nothing here is invented: where a contact or step isn't verified, it's null and the
// app says where to look instead. Verify against the official pages before launch (Q35).
export const VERIFY_MONTHS = 6;

export interface LenderEntry {
  name: string;
  /** Hardship contact, only once verified against the lender's own hardship page. */
  hardship: { email: string | null; phone: string | null; url: string | null };
  verifiedOn: string | null;
}

/**
 * Every lender and credit provider in the demo data. Contacts were researched against each lender's own hardship or
 * contact page on 06/10/2026 (docs/Tippla_Fact_Check.docx); a person should still sign that sheet off before launch.
 * Cash Train (two different repayment numbers on its site) and Right Road Finance (no hardship page) stay empty, so
 * the letter tells the member where to look instead.
 */
const RESEARCHED = "2026-10-06";
export const LENDER_DIRECTORY: LenderEntry[] = [
  { name: "Beforepay", hardship: { email: "support@beforepay.com.au", phone: null, url: "https://www.beforepay.com.au/policies/hardship" }, verifiedOn: RESEARCHED },
  { name: "Nimble", hardship: { email: "financialhardship@nimble.com.au", phone: "133 156", url: "https://nimble.com.au/financial-hardship/" }, verifiedOn: RESEARCHED },
  { name: "Cash Train", hardship: { email: null, phone: null, url: null }, verifiedOn: null },
  { name: "Right Road Finance", hardship: { email: null, phone: null, url: null }, verifiedOn: null },
  // Afterpay's hardship route is its secure form (or Help in the app); its counsellor email is for counsellors only.
  { name: "Afterpay", hardship: { email: null, phone: "1800 602 155", url: "https://www.afterpay.com/en-AU/hardship" }, verifiedOn: RESEARCHED },
  { name: "Zip Pay", hardship: { email: null, phone: "02 8294 2345", url: "https://zip.co/au/page/vulnerability-and-hardship" }, verifiedOn: RESEARCHED },
  { name: "MoneyMe", hardship: { email: "hello@moneyme.com.au", phone: "1300 669 059", url: "https://www.moneyme.com.au/financial-hardship" }, verifiedOn: RESEARCHED },
  { name: "Latitude", hardship: { email: null, phone: "1800 220 718", url: "https://www.latitudefinancial.com.au/hardship-care/" }, verifiedOn: RESEARCHED },
];

export const lenderEntry = (name: string): LenderEntry | null => LENDER_DIRECTORY.find((l) => l.name === name) ?? null;

export interface CancelGuide {
  merchant: string;
  /** Merchant-specific steps; null falls back to the generic steps. */
  steps: string[] | null;
  deepLink: string | null;
  notes: string | null;
  verifiedOn: string | null;
}

/**
 * Subscriptions in the demo data, from each service's own help page (06/10/2026). App-store or partner billing is
 * the common trap, so every note says where to cancel instead.
 */
export const MERCHANT_CANCEL_GUIDES: CancelGuide[] = [
  { merchant: "Apple iCloud",
    steps: ["On your iPhone, open Settings and tap your name.", "Tap Subscriptions, then iCloud+. (On older iOS: tap iCloud, then Manage Plan.)", "Tap Cancel Subscription, or See All Plans to pick a smaller one, and confirm."],
    deepLink: null, notes: "iCloud storage is billed by Apple, so it's usually changed in Settings on your Apple device. No Apple device? Apple has a way to cancel online. Your current plan keeps running until the end of the billing period.", verifiedOn: RESEARCHED },
  { merchant: "Netflix",
    steps: ["Go to netflix.com/cancelplan and sign in if asked.", "Select Cancel, then Finish Cancellation.", "Watch for the confirmation email."],
    deepLink: "https://www.netflix.com/cancelplan", notes: "You can keep watching until the end of the period you've paid for. Deleting the app doesn't cancel. Billed through your phone company, Apple or Google? Cancel with them instead.", verifiedOn: RESEARCHED },
  { merchant: "Binge",
    steps: ["Log in to My Account on binge.com.au.", "Select Subscription and scroll to the bottom.", "Select Cancel Subscription, then Continue, then Complete.", "Look for the confirmation email (check junk)."],
    deepLink: "https://binge.com.au/en-AU/myaccount", notes: "No cancel button? You're probably billed by Apple, Optus SubHub or Telstra, so cancel there. Access continues until the end of the billing period.", verifiedOn: RESEARCHED },
  { merchant: "Spotify",
    steps: ["Go to Manage your plan on spotify.com and log in.", "Select Cancel subscription.", "Follow the prompts to confirm."],
    deepLink: "https://www.spotify.com/account/subscription/manage/", notes: "Premium stays until your next billing date, then you move to Spotify Free and keep your playlists. On a Family or Duo plan, only the plan manager can cancel. Billed through your phone or internet provider? Cancel with them.", verifiedOn: RESEARCHED },
  { merchant: "Stan",
    steps: ["In a web browser, go to my.stan.com.au and log in.", "Find Cancel your subscription under Subscription Information.", "Follow the prompts to confirm."],
    deepLink: "https://my.stan.com.au/", notes: "Stan keeps running until the end of the period you've paid for. Signed up through Apple or Optus SubHub? Cancel there instead.", verifiedOn: RESEARCHED },
  { merchant: "Kayo",
    steps: ["Log in to My Account on kayosports.com.au.", "Under My Subscriptions, select Manage Subscription, then Cancel Subscription.", "Choose a reason, enter your password and select Confirm."],
    deepLink: "https://kayosports.com.au/en-AU/myaccount", notes: "Access continues until the end of the billing period. Cancel missing or greyed out? You're probably billed by Apple, so cancel there.", verifiedOn: RESEARCHED },
];

export const cancelGuide = (merchant: string): CancelGuide | null => MERCHANT_CANCEL_GUIDES.find((g) => g.merchant === merchant) ?? null;

/** Official sources only (spec 06: Tippla doesn't determine eligibility). */
export const OFFICIAL_DOMAINS = ["servicesaustralia.gov.au", "energymadeeasy.gov.au", "nsw.gov.au", "vic.gov.au", "qld.gov.au", "goodshep.org.au", "ndh.org.au"] as const;

export type ProgramId = "payment_finder" | "rent_assistance" | "concession_cards" | "state_concessions" | "nils" | "energy_compare";
export interface Program { id: ProgramId; url: string; verifiedOn: string | null }

export const PROGRAMS: Record<ProgramId, Program> = {
  payment_finder: { id: "payment_finder", url: "https://www.servicesaustralia.gov.au/payment-and-service-finder", verifiedOn: null },
  rent_assistance: { id: "rent_assistance", url: "https://www.servicesaustralia.gov.au/who-can-get-rent-assistance", verifiedOn: null },
  concession_cards: { id: "concession_cards", url: "https://www.servicesaustralia.gov.au/concession-and-health-care-cards", verifiedOn: RESEARCHED },
  state_concessions: { id: "state_concessions", url: "https://www.energy.nsw.gov.au/households/grants-rebates", verifiedOn: RESEARCHED },
  nils: { id: "nils", url: "https://goodshep.org.au/services/nils/", verifiedOn: RESEARCHED },
  energy_compare: { id: "energy_compare", url: "https://www.energymadeeasy.gov.au/", verifiedOn: RESEARCHED },
};

/** Energy Made Easy doesn't cover Victoria; Victoria's own government comparison site does. */
export const ENERGY_COMPARE_VIC = "https://compare.energy.vic.gov.au/";

/** State concession pages by the member's state (profile). */
export const STATE_CONCESSIONS: Record<string, string> = {
  NSW: "https://www.energy.nsw.gov.au/households/grants-rebates",
  // Found by search only (the page wouldn't load for checking); open it in a browser before launch.
  VIC: "https://services.dffh.vic.gov.au/concessions-and-benefits",
  QLD: "https://www.qld.gov.au/community/cost-of-living-support/concessions",
};

export const isOfficial = (url: string) => {
  try {
    const host = new URL(url).hostname;
    return url.startsWith("https://") && OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch { return false; }
};

/** Whether an entry needs checking: never verified, or older than 6 months on `today`. */
export function needsVerifying(verifiedOn: string | null, today: string): boolean {
  if (!verifiedOn) return true;
  const [y, m] = today.split("-").map(Number) as [number, number];
  const cutoff = `${m - VERIFY_MONTHS <= 0 ? y - 1 : y}-${String(((m - VERIFY_MONTHS + 11) % 12) + 1).padStart(2, "0")}${today.slice(7)}`;
  return verifiedOn < cutoff;
}

/** Bills we can point to a neutral comparison for (spec 06 §3, gates G2 and G4: no providers recommended). */
export const BILL_MERCHANTS: Record<string, "telco" | "internet" | "energy"> = {
  Telstra: "telco", Optus: "telco", Vodafone: "telco", Boost: "telco", Amaysim: "telco",
  TPG: "internet", "Aussie Broadband": "internet", iiNet: "internet",
  "Origin Energy": "energy", AGL: "energy", EnergyAustralia: "energy", "Red Energy": "energy", Alinta: "energy",
};
