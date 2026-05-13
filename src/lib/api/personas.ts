import { fetchApi } from "./client";

export const getPersonas = async (ownerId) => {
  const qs = ownerId ? `?ownerIdQuery=${encodeURIComponent(ownerId)}` : "";
  return fetchApi(`/personas${qs}`);
};

export const createPersona = async (data) => {
  return fetchApi("/personas", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updatePersona = async (id, data) => {
  return fetchApi(`/personas/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const deletePersona = async (id) => {
  return fetchApi(`/personas/${id}`, { method: "DELETE" });
};

export const transferPersonaOwnership = async (personaId, targetUserId) => {
  return fetchApi(`/personas/${personaId}/transfer`, {
    method: "POST",
    body: JSON.stringify({ newOwnerId: targetUserId }),
  });
};
