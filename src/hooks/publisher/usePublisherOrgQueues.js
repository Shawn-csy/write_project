import { useEffect, useState } from "react";
import { searchUsers } from "../../lib/api/admin";
import {
  getMyOrganizationInvites,
  getOrganizationInvites,
  getOrganizationMembers,
  getOrganizationRequests,
} from "../../lib/api/organizations";

export function usePublisherOrgQueues({ selectedOrgId, currentUser }) {
  const [orgMembers, setOrgMembers] = useState({ users: [], personas: [] });
  const [orgInvites, setOrgInvites] = useState([]);
  const [orgRequests, setOrgRequests] = useState([]);
  const [myInvites, setMyInvites] = useState([]);
  const [inviteSearchQuery, setInviteSearchQuery] = useState("");
  const [inviteSearchResults, setInviteSearchResults] = useState([]);
  const [isInviteSearching, setIsInviteSearching] = useState(false);
  const [isOrgMembersLoading, setIsOrgMembersLoading] = useState(false);

  useEffect(() => {
    const loadMembers = async () => {
      if (!selectedOrgId || !currentUser) return;
      setIsOrgMembersLoading(true);
      setOrgMembers({ users: [], personas: [] });
      try {
        const data = await getOrganizationMembers(selectedOrgId);
        setOrgMembers(data || { users: [], personas: [] });
      } catch (error) {
        console.error("Failed to load organization members", error);
        setOrgMembers({ users: [], personas: [] });
      } finally {
        setIsOrgMembersLoading(false);
      }
    };

    loadMembers();
  }, [selectedOrgId, currentUser]);

  useEffect(() => {
    const loadOrgQueues = async () => {
      if (!selectedOrgId || !currentUser) return;
      setOrgInvites([]);
      setOrgRequests([]);
      setInviteSearchQuery("");
      setInviteSearchResults([]);
      setIsInviteSearching(false);
      try {
        const [invitesData, requestsData] = await Promise.all([
          getOrganizationInvites(selectedOrgId),
          getOrganizationRequests(selectedOrgId),
        ]);
        setOrgInvites(invitesData?.invites || []);
        setOrgRequests(requestsData?.requests || []);
      } catch {
        // likely 403 if current role cannot manage org queue
        setOrgInvites([]);
        setOrgRequests([]);
      }
    };

    loadOrgQueues();
  }, [selectedOrgId, currentUser]);

  useEffect(() => {
    const loadMyInvites = async () => {
      if (!currentUser) return;
      try {
        const data = await getMyOrganizationInvites();
        setMyInvites(data?.invites || []);
      } catch {
        setMyInvites([]);
      }
    };

    loadMyInvites();
  }, [currentUser]);

  useEffect(() => {
    if (!inviteSearchQuery) {
      setInviteSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setIsInviteSearching(true);
      try {
        const results = await searchUsers(inviteSearchQuery);
        setInviteSearchResults(results || []);
      } catch {
        setInviteSearchResults([]);
      } finally {
        setIsInviteSearching(false);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [inviteSearchQuery]);

  return {
    orgMembers,
    setOrgMembers,
    isOrgMembersLoading,
    orgInvites,
    setOrgInvites,
    orgRequests,
    setOrgRequests,
    myInvites,
    setMyInvites,
    inviteSearchQuery,
    setInviteSearchQuery,
    inviteSearchResults,
    setInviteSearchResults,
    isInviteSearching,
  };
}
