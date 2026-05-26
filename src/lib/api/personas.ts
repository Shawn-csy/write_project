import { fetchApi } from "./client";
import type { PersonaLike } from "../../types/persona";
import type { PersonaPayload, ScriptMutationResponse } from "../../types/api";

export const getPersonas = async (ownerId?: string): Promise<PersonaLike[]> => {
  const qs = ownerId ? `?ownerIdQuery=${encodeURIComponent(ownerId)}` : "";
  return fetchApi(`/personas${qs}`) as Promise<PersonaLike[]>;
};

export const createPersona = async (data: PersonaPayload): Promise<PersonaLike> => {
  return fetchApi("/personas", {
    method: "POST",
    body: JSON.stringify(data),
  }) as Promise<PersonaLike>;
};

export const updatePersona = async (id: string, data: PersonaPayload): Promise<PersonaLike> => {
  return fetchApi(`/personas/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }) as Promise<PersonaLike>;
};

export const deletePersona = async (id: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/personas/${id}`, { method: "DELETE" }) as Promise<ScriptMutationResponse>;
};

export const transferPersonaOwnership = async (personaId: string, targetUserId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/personas/${personaId}/transfer`, {
    method: "POST",
    body: JSON.stringify({ newOwnerId: targetUserId }),
  }) as Promise<ScriptMutationResponse>;
};
