import { fetchApi } from "./client";
import type {
  OrganizationInvite,
  OrganizationInvitesResponse,
  OrganizationMember,
  OrganizationMembersResponse,
  OrganizationPayload,
  OrganizationRequest,
  OrganizationRequestsResponse,
  OrgData,
  ScriptMutationResponse,
} from "../../types/api";

export const getOrganizations = async (ownerId?: string): Promise<OrgData[]> => {
  const qs = ownerId ? `?ownerIdQuery=${encodeURIComponent(ownerId)}` : "";
  return fetchApi(`/organizations${qs}`) as Promise<OrgData[]>;
};

export const getOrganization = async (orgId: string): Promise<OrgData> => fetchApi(`/organizations/${orgId}`) as Promise<OrgData>;

export const createOrganization = async (data: OrganizationPayload): Promise<OrgData> => {
  return fetchApi(`/organizations`, {
    method: "POST",
    body: JSON.stringify(data),
  }) as Promise<OrgData>;
};

export const updateOrganization = async (orgId: string, updates: OrganizationPayload): Promise<OrgData> => {
  return fetchApi(`/organizations/${orgId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  }) as Promise<OrgData>;
};

export const deleteOrganization = async (orgId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/organizations/${orgId}`, { method: "DELETE" }) as Promise<ScriptMutationResponse>;
};

export const getOrganizationMembers = async (orgId: string): Promise<OrganizationMembersResponse> =>
  fetchApi(`/organizations/${orgId}/members`) as Promise<OrganizationMembersResponse>;

export const removeOrganizationMember = async (orgId: string, userId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/organizations/${orgId}/members/${userId}`, { method: "DELETE" }) as Promise<ScriptMutationResponse>;
};

export const removeOrganizationPersona = async (orgId: string, personaId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/organizations/${orgId}/personas/${personaId}`, { method: "DELETE" }) as Promise<ScriptMutationResponse>;
};

export const updateOrganizationMemberRole = async (
  orgId: string,
  userId: string,
  role: string
): Promise<ScriptMutationResponse> => {
  return fetchApi(`/organizations/${orgId}/members/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  }) as Promise<ScriptMutationResponse>;
};

export const searchOrganizations = async (query: string): Promise<OrgData[]> => {
  return fetchApi(`/organizations/search?q=${encodeURIComponent(query)}`) as Promise<OrgData[]>;
};

export const inviteOrganizationMember = async (orgId: string, userId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/organizations/${orgId}/invite`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  }) as Promise<ScriptMutationResponse>;
};

export const requestToJoinOrganization = async (orgId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/organizations/${orgId}/request`, { method: "POST" }) as Promise<ScriptMutationResponse>;
};

export const getOrganizationInvites = async (orgId: string): Promise<OrganizationInvitesResponse> =>
  fetchApi(`/organizations/${orgId}/invites`) as Promise<OrganizationInvitesResponse>;
export const getOrganizationRequests = async (orgId: string): Promise<OrganizationRequestsResponse> =>
  fetchApi(`/organizations/${orgId}/requests`) as Promise<OrganizationRequestsResponse>;
export const getMyOrganizationInvites = async (): Promise<OrganizationInvitesResponse> =>
  fetchApi(`/organizations/me/invites`) as Promise<OrganizationInvitesResponse>;
export const getMyOrganizationRequests = async (): Promise<OrganizationRequestsResponse> =>
  fetchApi(`/organizations/me/requests`) as Promise<OrganizationRequestsResponse>;

export const acceptOrganizationInvite = async (inviteId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/organizations/invites/${inviteId}/accept`, { method: "POST" }) as Promise<ScriptMutationResponse>;
};

export const declineOrganizationInvite = async (inviteId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/organizations/invites/${inviteId}/decline`, { method: "POST" }) as Promise<ScriptMutationResponse>;
};

export const acceptOrganizationRequest = async (requestId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/organizations/requests/${requestId}/accept`, { method: "POST" }) as Promise<ScriptMutationResponse>;
};

export const declineOrganizationRequest = async (requestId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/organizations/requests/${requestId}/decline`, { method: "POST" }) as Promise<ScriptMutationResponse>;
};

export const transferOrganizationOwnership = async (orgId: string, targetUserId: string): Promise<ScriptMutationResponse> => {
  return fetchApi(`/organizations/${orgId}/transfer`, {
    method: "POST",
    body: JSON.stringify({ newOwnerId: targetUserId, transferScripts: false }),
  }) as Promise<ScriptMutationResponse>;
};
