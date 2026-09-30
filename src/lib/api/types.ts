// Shapes of the TaleFin responses and Tippla-derived fixtures in mock-data/.
// Real TaleFin calls replace src/lib/api/client.ts later; these types stay.

export type PersonaId = "jess" | "marcus" | "priya";

export type CategoryId =
  | "housing" | "groceries" | "food" | "transport" | "bills" | "subscriptions" | "entertainment"
  | "alcohol" | "gambling" | "health" | "shopping" | "loan_repayment" | "bnpl" | "wage_advance"
  | "cash" | "fees" | "income"
  /** Money moved between the customer's own accounts: never spending, never income. */
  | "transfer";

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  merchant: string;
  amount: number; // negative = debit
  category: CategoryId;
  subcategory: string | null; // "wages" | "centrelink" | null
  is_recurring: boolean;
  status: "posted" | "pending";
  account_id: number;
  balance_after: number | null;
}

export interface PeriodStats {
  sum_amount: number;
  count: number;
  min_amount: number | null;
  max_amount: number | null;
  mean_amount: number | null;
  monthly_mean_amount: number;
  days_since_last: number | null;
  days_since_first: number | null;
  earliest: string | null;
  latest: string | null;
}
export type PeriodKey = "14" | "30" | "60" | "90" | "180" | "365";
/** Normalised: month is "YYYY-MM" (TaleFin sends a month name + year). */
export interface MonthValue { month: string; sum_amount: number; count: number }
export type ArrayMetricValue = Partial<Record<PeriodKey, PeriodStats>> & {
  monthly_values?: Record<string, MonthValue>;
};
export type PercentMetricValue = Record<PeriodKey, number | null> & { monthly_values?: Record<string, { month: string; value: number | null }> };

export interface Metric<V = unknown> {
  code: string;
  name: string;
  group_name: string;
  format: string;
  value: V;
}

/** Normalised account: never holds the BSB or full number, only the last 4 digits. */
export interface BankAccount {
  id: number;
  nickname: string;
  last4: string;
  type: string;
  balance: number;
  available: number;
}

/** Lender names extracted from TaleFin's provider lists (names only; status only when active/settled). */
export interface Lenders {
  sacc: { provider: string; status: "active" | "settled" | null }[];
  nonSacc: string[];
  wageAdvance: string[];
}

/** Normalised TaleFin bank statement (see src/lib/api/talefin.ts). Holder details are dropped. */
export interface BankStatement {
  version: string;
  application_id: string;
  timestamp: string;
  reportPeriod: { start: string; end: string; days: number } | null;
  metrics: Metric[];
  lenders: Lenders;
  profiles: { bank: { name: string }; accounts: BankAccount[] }[];
}

export type FactorKey =
  | "INCOME" | "CASH_SPEND" | "ADVERSE_SPEND" | "MISSED_PAYMENT" | "PRODUCTIVE_SPEND"
  | "DISPOSABLE_INCOME" | "GOVERNMENT_RELIANCE" | "LOAN_AMOUNT_AND_TYPE" | "RELIABLE_PAYMENT_HISTORY";

export interface TaleFinScore {
  score: { SCORE: number | null; OVERRIDE: string | null; RISK_GRADE: string | null; OVERRIDE_SCORE: number | null };
  metadata: { BANKS_REFERENCE: number; SCORED_DATETIME: string; BUREAU_REFERENCE: number | null };
  score_breakdown: Record<FactorKey, number | null>;
  Consumer: { FULL_NAME: string };
  score_id: string;
}

/** What the customer-facing app receives: LENDER_ONLY and INTERNAL score fields removed. */
export interface CustomerScore {
  score: number | null;
  override: { reason: string; code: number } | null;
  scoredAt: string;
  breakdown: Record<FactorKey, number | null>;
}

export interface ScoreHistory { history: { scored_date: string; score: number }[] }

export interface Profile {
  id: PersonaId;
  first_name: string;
  full_name: string;
  age: number;
  state: string;
  postcode: string;
  email: string;
  mobile: string;
  tier: "standard" | "pro";
  story: string;
  data_from: string;
  data_days: number;
}

export interface UpcomingBill {
  date: string;
  merchant: string;
  expected_amount: number;
  category: CategoryId;
  confidence: "predicted" | "confirmed";
  cadence_days: number;
}

export interface Derived {
  as_of: string;
  pay_cycle: { start: string; end: string; next_payday: string };
  upcoming_bills: UpcomingBill[];
  subscriptions: { merchant: string; amount: number; last_charged: string; cadence: "monthly" }[];
}

export interface Offer {
  id: string;
  lender: string;
  amount: number;
  term_weeks: number;
  comparison_rate_pct: number;
  establishment_fee: number;
  repayment_per_fortnight: number;
  total_repayable: number;
  matched_on: string[];
  expires: string | null;
}
export interface Offers { lender_matching_consent: boolean; offers: Offer[] }

export interface Consent {
  id: "ff_data_sharing" | "talefin_bank_data" | "lender_matching";
  label: string;
  required: boolean;
  granted: boolean;
  granted_at: string | null;
  version: string;
}

/** Everything the selectors need for one persona. */
export interface PersonaData {
  id: PersonaId;
  asOf: string;
  profile: Profile;
  transactions: Transaction[];
  bankStatement: BankStatement; // NEVER_DISPLAY metrics already stripped
  /** null when the score request failed (show the retry / "still being worked out" state). */
  score: CustomerScore | null;
  scoreHistory: ScoreHistory["history"];
  derived: Derived;
  offers: Offers;
  consents: Consent[];
}
