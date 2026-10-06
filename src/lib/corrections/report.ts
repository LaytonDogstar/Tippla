// Spec 05: anonymised correction reports for the categorisation team. Server only. No member id, no
// amounts, no dates beyond the day; nothing about gambling or alcohol until gate G3 decides how sensitive
// inferences are handled. Only when corrections_sharing_v1 is on for the member and they allow usage data.
import { isOn } from "@/config/featureFlags";
import { RULE_KINDS } from "@/lib/account/corrections";
import { db } from "@/lib/db";

const SENSITIVE = /gambl|alcohol|\bbet|casino|pokies|liquor|bottle/i;
const ENTITIES = ["transaction", "bill", "subscription", "loan", "income"];
const CORRECTIONS: string[] = [...RULE_KINDS, "already_paid", "different_amount", "moved"];
const CATEGORY = /^[a-z_]{2,20}$/;

export interface CorrectionReport { entity: string; correction: string; merchant: string; from?: string; to?: string }

/** Validate and store one report. Returns why it wasn't stored, if it wasn't. */
export async function reportCorrection(member: string, r: CorrectionReport, opts: { consent: boolean }): Promise<"stored" | "off" | "invalid" | "sensitive"> {
  if (!isOn("corrections_sharing_v1", member) || !opts.consent) return "off";
  if (!r || !ENTITIES.includes(r.entity) || !CORRECTIONS.includes(r.correction) || typeof r.merchant !== "string" || !r.merchant || r.merchant.length > 80) return "invalid";
  if ((r.from && !CATEGORY.test(r.from)) || (r.to && !CATEGORY.test(r.to))) return "invalid";
  if ([r.merchant, r.from, r.to].some((v) => v && SENSITIVE.test(v))) return "sensitive";
  await (await db()).query("INSERT INTO correction_reports (entity, correction, merchant, from_category, to_category) VALUES ($1, $2, $3, $4, $5)",
    [r.entity, r.correction, r.merchant, r.from ?? null, r.to ?? null]);
  return "stored";
}
