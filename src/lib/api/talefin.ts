// Raw TaleFin bank statement ("summary") response → the portal's normalised BankStatement.
// Production quirks handled here, once, so selectors never see them:
//  - timestamps carry +10:00 / +11:00 offsets → calendar dates in AEST (Q: per-state time later)
//  - monthly_values use month NAMES + year → "YYYY-MM"
//  - empty periods are all-null (sum/count null) → 0
//  - balances are strings ("314.3100") → numbers
//  - BSB and account number are UNMASKED → only the last 4 digits survive
//  - holder name, email, mobile, address, DOB → dropped
//  - lender names live in LENDER_ONLY lists (defaults / past due) → names extracted, the rest stripped later
import type { BankStatement, Lenders, Metric } from "./types";
import { toAESTDate } from "@/lib/format/dates";

export interface RawAccount {
  id: number;
  nickname: string;
  available: string | number | null;
  balance: string | number | null;
  bsb?: string;
  number?: string;
  type?: string;
  [k: string]: unknown;
}
export interface RawBankStatement {
  version: string;
  application_id: number | string;
  vendor_specific_id: string;
  timestamp: string;
  metrics: Metric[];
  profiles: { bank: { name: string }; accounts: RawAccount[]; [k: string]: unknown }[];
  report_period?: { start_date: string; end_date: string; days_requested: number };
  [k: string]: unknown;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PERIOD_KEYS = ["14", "30", "60", "90", "180", "365"];
const DATE_CODES = new Set(["AM2035", "AM2036", "AM2037", "AM2077"]);

const num = (v: unknown): number => (v === null || v === undefined || v === "" ? 0 : Number(v));
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function normStats(v: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...v };
  if ("sum_amount" in v) out.sum_amount = num(v.sum_amount);
  if ("count" in v) out.count = num(v.count);
  if ("monthly_mean_amount" in v) out.monthly_mean_amount = num(v.monthly_mean_amount);
  for (const k of ["earliest", "latest"]) if (typeof v[k] === "string") out[k] = toAESTDate(v[k] as string);
  // TaleFin reports debit min/max on signed values, so they can arrive swapped.
  if (typeof v.min_amount === "number" && typeof v.max_amount === "number" && v.min_amount > v.max_amount) {
    out.min_amount = v.max_amount;
    out.max_amount = v.min_amount;
  }
  return out;
}

function normMonth(v: Record<string, unknown>): Record<string, unknown> {
  const out = isObj(v) && "sum_amount" in v ? normStats(v) : { ...v };
  const name = v.month;
  if (typeof name === "string" && typeof v.year === "number" && MONTHS.includes(name)) {
    out.month = `${v.year}-${String(MONTHS.indexOf(name) + 1).padStart(2, "0")}`;
  }
  delete out.year;
  return out;
}

function normValue(code: string, value: unknown): unknown {
  if (DATE_CODES.has(code) && typeof value === "string") return toAESTDate(value);
  if (code === "AM2019" && Array.isArray(value))
    return (value as { date: string; balance: number }[]).map((p) => ({ date: toAESTDate(p.date), balance: num(p.balance) }));
  if (!isObj(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === "monthly_values" && isObj(v)) {
      out[k] = Object.fromEntries(Object.entries(v).map(([i, mv]) => [i, isObj(mv) ? normMonth(mv) : mv]));
    } else if (PERIOD_KEYS.includes(k) && isObj(v) && "sum_amount" in v) {
      out[k] = normStats(v);
    } else out[k] = v;
  }
  return out;
}

const names = (metrics: Metric[], code: string): string[] => {
  const v = metrics.find((m) => m.code === code)?.value;
  return Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : String((x as { provider: unknown }).provider))).filter(Boolean) : [];
};

/** Lender names only (SHOW). Defaults, arrears and past-due counts stay LENDER_ONLY and are stripped. */
function extractLenders(metrics: Metric[]): Lenders {
  const status = metrics.find((m) => m.code === "AM2049")?.value as { provider: string; status: string }[] | undefined;
  const sacc = [...new Set([...names(metrics, "AM2105"), ...names(metrics, "AM2125"), ...(status ?? []).map((s) => s.provider)])];
  return {
    sacc: sacc.map((provider) => {
      const st = status?.find((s) => s.provider === provider)?.status;
      // Only "active" / "settled" are customer facts; "arrears" / "failed" are LENDER_ONLY.
      return { provider, status: st === "active" || st === "settled" ? st : null };
    }),
    nonSacc: [...new Set([...names(metrics, "AM2106"), ...names(metrics, "AM2126")])],
    wageAdvance: [...new Set([...names(metrics, "AM2107"), ...names(metrics, "AM2127"), ...names(metrics, "AM2030")])],
  };
}

export function normaliseBankStatement(raw: RawBankStatement): BankStatement {
  const metrics = raw.metrics.map((m) => ({ code: m.code, name: m.name, group_name: m.group_name, format: m.format, value: normValue(m.code, m.value) }));
  return {
    version: raw.version,
    application_id: String(raw.application_id),
    timestamp: raw.timestamp,
    reportPeriod: raw.report_period ? { start: raw.report_period.start_date, end: raw.report_period.end_date, days: raw.report_period.days_requested } : null,
    metrics,
    lenders: extractLenders(raw.metrics),
    profiles: raw.profiles.map((p) => ({
      bank: { name: p.bank.name },
      accounts: p.accounts.map((a) => ({
        id: a.id,
        nickname: a.nickname,
        last4: (a.number ?? "").replace(/\D/g, "").slice(-4),
        type: a.type ?? "TRANSACTION",
        balance: num(a.balance),
        available: num(a.available),
      })),
    })),
  };
}
