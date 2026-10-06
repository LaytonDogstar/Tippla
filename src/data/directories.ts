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

/** Every lender and credit provider in the demo data. Contacts are left empty until verified. */
export const LENDER_DIRECTORY: LenderEntry[] = [
  "Beforepay", "Nimble", "Cash Train", "Right Road Finance", "Afterpay", "Zip Pay", "MoneyMe Lite", "Latitude",
].map((name) => ({ name, hardship: { email: null, phone: null, url: null }, verifiedOn: null }));

export const lenderEntry = (name: string): LenderEntry | null => LENDER_DIRECTORY.find((l) => l.name === name) ?? null;

export interface CancelGuide {
  merchant: string;
  /** Merchant-specific steps; null falls back to the generic steps. */
  steps: string[] | null;
  deepLink: string | null;
  notes: string | null;
  verifiedOn: string | null;
}

/** Subscriptions in the demo data. App-store billing is the common trap, so it's the note where it applies. */
export const MERCHANT_CANCEL_GUIDES: CancelGuide[] = [
  { merchant: "Apple iCloud", steps: ["On your iPhone, open Settings and tap your name.", "Tap iCloud, then your storage plan.", "Choose a smaller plan or the free one, and confirm."], deepLink: null, notes: "iCloud storage is billed by Apple, so it's changed on your Apple device, not a website.", verifiedOn: null },
  { merchant: "Netflix", steps: null, deepLink: null, notes: null, verifiedOn: null },
  { merchant: "Binge", steps: null, deepLink: null, notes: null, verifiedOn: null },
  { merchant: "Spotify", steps: null, deepLink: null, notes: null, verifiedOn: null },
  { merchant: "Stan", steps: null, deepLink: null, notes: null, verifiedOn: null },
  { merchant: "Kayo", steps: null, deepLink: null, notes: null, verifiedOn: null },
];

export const cancelGuide = (merchant: string): CancelGuide | null => MERCHANT_CANCEL_GUIDES.find((g) => g.merchant === merchant) ?? null;

/** Official sources only (spec 06: Tippla doesn't determine eligibility). */
export const OFFICIAL_DOMAINS = ["servicesaustralia.gov.au", "energymadeeasy.gov.au", "nsw.gov.au", "vic.gov.au", "qld.gov.au", "goodshep.org.au", "ndh.org.au"] as const;

export type ProgramId = "payment_finder" | "rent_assistance" | "concession_cards" | "state_concessions" | "nils" | "energy_compare";
export interface Program { id: ProgramId; url: string; verifiedOn: string | null }

export const PROGRAMS: Record<ProgramId, Program> = {
  payment_finder: { id: "payment_finder", url: "https://www.servicesaustralia.gov.au/payment-and-service-finder", verifiedOn: null },
  rent_assistance: { id: "rent_assistance", url: "https://www.servicesaustralia.gov.au/rent-assistance", verifiedOn: null },
  concession_cards: { id: "concession_cards", url: "https://www.servicesaustralia.gov.au/concession-and-health-care-cards", verifiedOn: null },
  state_concessions: { id: "state_concessions", url: "https://www.nsw.gov.au/", verifiedOn: null },
  nils: { id: "nils", url: "https://goodshep.org.au/services/nils/", verifiedOn: null },
  energy_compare: { id: "energy_compare", url: "https://www.energymadeeasy.gov.au/", verifiedOn: null },
};

/** State concession pages by the member's state (profile). */
export const STATE_CONCESSIONS: Record<string, string> = {
  NSW: "https://www.nsw.gov.au/",
  VIC: "https://www.vic.gov.au/",
  QLD: "https://www.qld.gov.au/",
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
