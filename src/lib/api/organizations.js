import { fetchApi } from "./client";

export const getOrganizations = async (ownerId) => {
  const qs = ownerId ? `?ownerIdQuery=${encodeURIComponent(ownerId)}` : "";
  return fetchApi(`/organizations${qs}`);
};

export const getOrganization = async (orgId) => fetchApi(`/organizations/${orgId}`);

export const createOrganization = async (data) => {
  return fetchApi(`/organizations`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updateOrganization = async (orgId, updates) => {
  return fetchApi(`/organizations/${orgId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
};

export const deleteOrganization = async (orgId) => {
  return fetchApi(`/organizations/${orgId}`, { method: "DELETE" });
};

export const getOrganizationMembers = async (orgId) => fetchApi(`/organizations/${orgId}/members`);

export const removeOrganizationMember = async (orgId, userId) => {
  return fetchApi(`/organizations/${orgId}/members/${userId}`, { method: "DELETE" });
};

export const removeOrganizationPersona = async (orgId, personaId) => {
  return fetchApi(`/organizations/${orgId}/personas/${personaId}`, { method: "DELETE" });
};

export const updateOrganizationMemberRole = async (orgId, userId, role) => {
  return fetchApi(`/organizations/${orgId}/members/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
};

export const searchOrganizations = async (query) => {
  return fetchApi(`/organizations/search?q=${encodeURIComponent(query)}`);
};

export const inviteOrganizationMember = async (orgId, userId) => {
  return fetchApi(`/organizations/${orgId}/invite`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
};

export const requestToJoinOrganization = async (orgId) => {
  return fetchApi(`/organizations/${orgId}/request`, { method: "POST" });
};

export const getOrganizationInvites = async (orgId) => fetchApi(`/organizations/${orgId}/invites`);
export const getOrganizationRequests = async (orgId) => fetchApi(`/organizations/${orgId}/requests`);
export const getMyOrganizationInvites = async () => fetchApi(`/organizations/me/invites`);
export const getMyOrganizationRequests = async () => fetchApi(`/organizations/me/requests`);

export const acceptOrganizationInvite = async (inviteId) => {
  return fetchApi(`/organizations/invites/${inviteId}/accept`, { method: "POST" });
};

export const declineOrganizationInvite = async (inviteId) => {
  return fetchApi(`/organizations/invites/${inviteId}/decline`, { method: "POST" });
};

export const acceptOrganizationRequest = async (requestId) => {
  return fetchApi(`/organizations/requests/${requestId}/accept`, { method: "POST" });
};

export const declineOrganizationRequest = async (requestId) => {
  return fetchApi(`/organizations/requests/${requestId}/decline`, { method: "POST" });
};

export const transferOrganizationOwnership = async (orgId, targetUserId) => {
  return fetchApi(`/organizations/${orgId}/transfer`, {
    method: "POST",
    body: JSON.stringify({ newOwnerId: targetUserId, transferScripts: false }),
  });
};
