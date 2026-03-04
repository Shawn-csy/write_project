import { useCallback } from "react";
import {
  inviteOrganizationMember,
  acceptOrganizationRequest,
  declineOrganizationRequest,
  getOrganizationMembers,
  getOrganizationInvites,
  getOrganizationRequests,
  removeOrganizationMember,
  removeOrganizationPersona,
  updateOrganizationMemberRole,
  acceptOrganizationInvite,
  declineOrganizationInvite,
  getMyOrganizationInvites,
} from "../../lib/api/organizations";

export function usePublisherOrgMemberActions({
  selectedOrgId,
  personas,
  t,
  toast,
  handleTabChange,
  refreshOrgChoices,
  setInviteSearchQuery,
  setInviteSearchResults,
  setOrgInvites,
  setOrgRequests,
  setOrgMembers,
  setMyInvites,
}) {
  const handleInviteMember = useCallback(async (userId) => {
    if (!selectedOrgId) return;
    await inviteOrganizationMember(selectedOrgId, userId);
    setInviteSearchQuery("");
    setInviteSearchResults([]);
    const invites = await getOrganizationInvites(selectedOrgId);
    setOrgInvites(invites?.invites || []);
  }, [selectedOrgId, setInviteSearchQuery, setInviteSearchResults, setOrgInvites]);

  const handleAcceptRequest = useCallback(async (requestId) => {
    await acceptOrganizationRequest(requestId);
    const requests = await getOrganizationRequests(selectedOrgId);
    setOrgRequests(requests?.requests || []);
    const members = await getOrganizationMembers(selectedOrgId);
    setOrgMembers(members || { users: [], personas: [] });
  }, [selectedOrgId, setOrgMembers, setOrgRequests]);

  const handleDeclineRequest = useCallback(async (requestId) => {
    await declineOrganizationRequest(requestId);
    const requests = await getOrganizationRequests(selectedOrgId);
    setOrgRequests(requests?.requests || []);
  }, [selectedOrgId, setOrgRequests]);

  const handleRemoveMember = useCallback(async (userId) => {
    if (!selectedOrgId || !userId) return;
    await removeOrganizationMember(selectedOrgId, userId);
    const members = await getOrganizationMembers(selectedOrgId);
    setOrgMembers(members || { users: [], personas: [] });
  }, [selectedOrgId, setOrgMembers]);

  const handleRemovePersonaMember = useCallback(async (personaId) => {
    if (!selectedOrgId || !personaId) return;
    await removeOrganizationPersona(selectedOrgId, personaId);
    const members = await getOrganizationMembers(selectedOrgId);
    setOrgMembers(members || { users: [], personas: [] });
  }, [selectedOrgId, setOrgMembers]);

  const handleChangeMemberRole = useCallback(async (userId, role) => {
    if (!selectedOrgId || !userId || !role) return;
    await updateOrganizationMemberRole(selectedOrgId, userId, role);
    const members = await getOrganizationMembers(selectedOrgId);
    setOrgMembers(members || { users: [], personas: [] });
  }, [selectedOrgId, setOrgMembers]);

  const handleAcceptInvite = useCallback(async (inviteId) => {
    if (!personas.length) {
      toast({
        title: t("publisher.noPersonaBeforeJoinOrg", "請先建立作者身份"),
        description: t("publisher.noPersonaBeforeJoinOrgDesc", "加入組織前請先建立至少一個作者身份。"),
        variant: "destructive",
      });
      handleTabChange("profile");
      return;
    }
    await acceptOrganizationInvite(inviteId);
    const mine = await getMyOrganizationInvites();
    setMyInvites(mine?.invites || []);
    await refreshOrgChoices();
  }, [handleTabChange, personas.length, refreshOrgChoices, setMyInvites, t, toast]);

  const handleDeclineInvite = useCallback(async (inviteId) => {
    await declineOrganizationInvite(inviteId);
    const mine = await getMyOrganizationInvites();
    setMyInvites(mine?.invites || []);
  }, [setMyInvites]);

  return {
    handleInviteMember,
    handleAcceptRequest,
    handleDeclineRequest,
    handleRemoveMember,
    handleRemovePersonaMember,
    handleChangeMemberRole,
    handleAcceptInvite,
    handleDeclineInvite,
  };
}
