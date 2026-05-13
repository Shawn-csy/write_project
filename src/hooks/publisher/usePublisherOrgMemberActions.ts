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
  const getErrorMessage = (error, fallback) => {
    const msg = String(error?.message || "").trim();
    return msg || fallback;
  };

  const handleInviteMember = useCallback(async (userId) => {
    if (!selectedOrgId) return;
    try {
      await inviteOrganizationMember(selectedOrgId, userId);
      setInviteSearchQuery("");
      setInviteSearchResults([]);
      const invites = await getOrganizationInvites(selectedOrgId);
      setOrgInvites(invites?.invites || []);
      toast({
        title: t("publisherOrgTab.inviteSuccessTitle", "邀請已送出"),
        description: t("publisherOrgTab.inviteSuccessDesc", "已成功送出組織邀請。"),
      });
    } catch (error) {
      toast({
        title: t("publisherOrgTab.inviteFailedTitle", "邀請失敗"),
        description: getErrorMessage(error, t("publisherOrgTab.inviteFailedDesc", "無法送出邀請，請稍後再試。")),
        variant: "destructive",
      });
    }
  }, [selectedOrgId, setInviteSearchQuery, setInviteSearchResults, setOrgInvites, t, toast]);

  const handleAcceptRequest = useCallback(async (requestId) => {
    try {
      await acceptOrganizationRequest(requestId);
      const requests = await getOrganizationRequests(selectedOrgId);
      setOrgRequests(requests?.requests || []);
      const members = await getOrganizationMembers(selectedOrgId);
      setOrgMembers(members || { users: [], personas: [] });
      toast({
        title: t("publisherOrgTab.acceptSuccessTitle", "已接受申請"),
        description: t("publisherOrgTab.acceptSuccessDesc", "申請者已加入組織。"),
      });
    } catch (error) {
      toast({
        title: t("publisherOrgTab.acceptFailedTitle", "接受申請失敗"),
        description: getErrorMessage(error, t("publisherOrgTab.acceptFailedDesc", "無法接受申請，請稍後再試。")),
        variant: "destructive",
      });
    }
  }, [selectedOrgId, setOrgMembers, setOrgRequests, t, toast]);

  const handleDeclineRequest = useCallback(async (requestId) => {
    try {
      await declineOrganizationRequest(requestId);
      const requests = await getOrganizationRequests(selectedOrgId);
      setOrgRequests(requests?.requests || []);
      toast({
        title: t("publisherOrgTab.declineSuccessTitle", "已拒絕申請"),
        description: t("publisherOrgTab.declineSuccessDesc", "該申請已被拒絕。"),
      });
    } catch (error) {
      toast({
        title: t("publisherOrgTab.declineFailedTitle", "拒絕申請失敗"),
        description: getErrorMessage(error, t("publisherOrgTab.declineFailedDesc", "無法拒絕申請，請稍後再試。")),
        variant: "destructive",
      });
    }
  }, [selectedOrgId, setOrgRequests, t, toast]);

  const handleRemoveMember = useCallback(async (userId) => {
    if (!selectedOrgId || !userId) return;
    try {
      await removeOrganizationMember(selectedOrgId, userId);
      const members = await getOrganizationMembers(selectedOrgId);
      setOrgMembers(members || { users: [], personas: [] });
      toast({
        title: t("publisherOrgTab.removeMemberSuccessTitle", "已移除成員"),
        description: t("publisherOrgTab.removeMemberSuccessDesc", "成員已從組織中移除。"),
      });
    } catch (error) {
      toast({
        title: t("publisherOrgTab.removeMemberFailedTitle", "移除成員失敗"),
        description: getErrorMessage(error, t("publisherOrgTab.removeMemberFailedDesc", "無法移除成員，請稍後再試。")),
        variant: "destructive",
      });
    }
  }, [selectedOrgId, setOrgMembers, t, toast]);

  const handleRemovePersonaMember = useCallback(async (personaId) => {
    if (!selectedOrgId || !personaId) return;
    try {
      await removeOrganizationPersona(selectedOrgId, personaId);
      const members = await getOrganizationMembers(selectedOrgId);
      setOrgMembers(members || { users: [], personas: [] });
      toast({
        title: t("publisherOrgTab.removePersonaSuccessTitle", "已移除作者身份"),
        description: t("publisherOrgTab.removePersonaSuccessDesc", "作者身份已從組織中移除。"),
      });
    } catch (error) {
      toast({
        title: t("publisherOrgTab.removePersonaFailedTitle", "移除作者身份失敗"),
        description: getErrorMessage(error, t("publisherOrgTab.removePersonaFailedDesc", "無法移除作者身份，請稍後再試。")),
        variant: "destructive",
      });
    }
  }, [selectedOrgId, setOrgMembers, t, toast]);

  const handleChangeMemberRole = useCallback(async (userId, role) => {
    if (!selectedOrgId || !userId || !role) return;
    try {
      await updateOrganizationMemberRole(selectedOrgId, userId, role);
      const members = await getOrganizationMembers(selectedOrgId);
      setOrgMembers(members || { users: [], personas: [] });
      toast({
        title: t("publisherOrgTab.roleUpdateSuccessTitle", "角色已更新"),
        description: t("publisherOrgTab.roleUpdateSuccessDesc", "成員權限已更新。"),
      });
    } catch (error) {
      toast({
        title: t("publisherOrgTab.roleUpdateFailedTitle", "更新角色失敗"),
        description: getErrorMessage(error, t("publisherOrgTab.roleUpdateFailedDesc", "無法更新成員角色，請稍後再試。")),
        variant: "destructive",
      });
    }
  }, [selectedOrgId, setOrgMembers, t, toast]);

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
    try {
      await acceptOrganizationInvite(inviteId);
      const mine = await getMyOrganizationInvites();
      setMyInvites(mine?.invites || []);
      await refreshOrgChoices();
      toast({
        title: t("publisher.acceptInviteSuccessTitle", "已接受邀請"),
        description: t("publisher.acceptInviteSuccessDesc", "你已加入該組織。"),
      });
    } catch (error) {
      toast({
        title: t("publisher.acceptInviteFailedTitle", "接受邀請失敗"),
        description: getErrorMessage(error, t("publisher.acceptInviteFailedDesc", "無法接受邀請，請稍後再試。")),
        variant: "destructive",
      });
    }
  }, [handleTabChange, personas.length, refreshOrgChoices, setMyInvites, t, toast]);

  const handleDeclineInvite = useCallback(async (inviteId) => {
    try {
      await declineOrganizationInvite(inviteId);
      const mine = await getMyOrganizationInvites();
      setMyInvites(mine?.invites || []);
      toast({
        title: t("publisher.declineInviteSuccessTitle", "已拒絕邀請"),
        description: t("publisher.declineInviteSuccessDesc", "你已拒絕該組織邀請。"),
      });
    } catch (error) {
      toast({
        title: t("publisher.declineInviteFailedTitle", "拒絕邀請失敗"),
        description: getErrorMessage(error, t("publisher.declineInviteFailedDesc", "無法拒絕邀請，請稍後再試。")),
        variant: "destructive",
      });
    }
  }, [setMyInvites, t, toast]);

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
