import { loadPersona, PERSONAS } from "@/lib/api/client";
import type { PersonaData, PersonaId } from "@/lib/api/types";

export async function load(id: PersonaId): Promise<PersonaData> {
  return (await loadPersona(id, { latencyMs: 0 })).data;
}
export const all = async () => Promise.all(PERSONAS.map(load));
