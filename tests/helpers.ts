import { loadPersona, PERSONAS } from "@/lib/api/client";
import type { PersonaData, PersonaId } from "@/lib/api/types";

export async function load(id: PersonaId): Promise<PersonaData> {
  return (await loadPersona(id, { latencyMs: 0 })).data;
}
export const all = async () => Promise.all(PERSONAS.map(load));

/** The payday snapshot (dev state "payday"). */
export async function loadPayday(id: PersonaId): Promise<PersonaData> {
  return (await loadPersona(id, { latencyMs: 0, snapshot: "payday" })).data;
}

/** Jess's bill-eve snapshot (dev state "bill_due"). */
export async function loadBillDue(id: PersonaId): Promise<PersonaData> {
  return (await loadPersona(id, { latencyMs: 0, snapshot: "billdue" })).data;
}
