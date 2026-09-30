// Mock TaleFin + Tippla API. Mimics response shapes and latency (200–600 ms) so real calls can
// replace this file without touching UI. Simulate failures with ?fail=score (or bank, all).
import { sanitiseBankStatement } from "@/lib/dataUse";
import { RAW } from "./fixtures";
import { normaliseBankStatement } from "./talefin";
import type { CustomerScore, PersonaData, PersonaId, TaleFinScore } from "./types";

export const PERSONAS: PersonaId[] = ["jess", "marcus", "priya"];
export const DEFAULT_PERSONA: PersonaId = "jess";

export const isPersona = (v: unknown): v is PersonaId => typeof v === "string" && (PERSONAS as string[]).includes(v);

export type FailTarget = "score" | "bank" | "all";
export interface ClientOptions {
  /** Force a failure for one endpoint (dev: ?fail=score). */
  fail?: FailTarget | null;
  /** Override simulated latency; tests pass 0. Defaults to MOCK_LATENCY env or 200–600 ms. */
  latencyMs?: number;
}

export class MockApiError extends Error {
  constructor(public endpoint: "score" | "bank", message = `Mock ${endpoint} request failed`) {
    super(message);
    this.name = "MockApiError";
  }
}

function delay(opts: ClientOptions): Promise<void> {
  const env = typeof process !== "undefined" ? process.env.MOCK_LATENCY : undefined;
  const ms = opts.latencyMs ?? (env !== undefined ? Number(env) : 200 + Math.random() * 400);
  return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
}

/** TaleFin Score → what the customer app may see (RISK_GRADE is LENDER_ONLY; references and name are INTERNAL). */
export function toCustomerScore(s: TaleFinScore): CustomerScore {
  return {
    score: s.score.SCORE,
    override: s.score.OVERRIDE_SCORE !== null ? { reason: s.score.OVERRIDE ?? "", code: s.score.OVERRIDE_SCORE } : null,
    scoredAt: s.metadata.SCORED_DATETIME,
    breakdown: { ...s.score_breakdown },
  };
}

export async function getBankStatement(id: PersonaId, opts: ClientOptions = {}) {
  await delay(opts);
  if (opts.fail === "bank" || opts.fail === "all") throw new MockApiError("bank");
  return sanitiseBankStatement(normaliseBankStatement(RAW[id].bankStatement));
}

export async function getScore(id: PersonaId, opts: ClientOptions = {}) {
  await delay(opts);
  if (opts.fail === "score" || opts.fail === "all") throw new MockApiError("score");
  return toCustomerScore(RAW[id].score);
}

/** Loads one persona in the shape selectors consume. The score may fail independently (null). */
export async function loadPersona(id: PersonaId, opts: ClientOptions = {}): Promise<{ data: PersonaData; scoreError: MockApiError | null }> {
  const raw = RAW[id];
  const [bankStatement, scoreResult] = await Promise.all([
    getBankStatement(id, opts),
    getScore(id, opts).then((s) => ({ s, e: null }), (e: MockApiError) => ({ s: null, e })),
  ]);
  const data: PersonaData = {
    id,
    asOf: raw.transactions.as_of,
    profile: raw.profile,
    transactions: raw.transactions.transactions,
    bankStatement,
    score: scoreResult.s,
    scoreHistory: raw.scoreHistory.history,
    derived: raw.derived,
    offers: raw.offers,
    consents: raw.consents.consents,
  };
  return { data, scoreError: scoreResult.e };
}
