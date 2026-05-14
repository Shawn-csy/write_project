import { useEffect, useState } from "react";
import { searchUsers } from "../../lib/api/admin";
import {
  getMyOrganizationInvites,
  getOrganizationInvites,
  getOrganizationMembers,
  getOrganizationRequests,
} from "../../lib/api/organizations";
import type { CurrentUserLike } from "../../types/user";

interface QueueUser {
  id: string;
  displayName?: string;
  handle?: string;
  email?: string;
  organizationRole?: string;
  [key: string]: unknown;
}

interface OrgMembersData {
  users: QueueUser[];
  personas: Array<Record<string, unknown>>;
}

interface OrgQueueItem {
  id?: string;
  orgId?: string;
  [key: string]: unknown;
}

interface UsePublisherOrgQueuesInput {
  selectedOrgId: string | null;
  currentUser: CurrentUserLike | null | undefined;
}

export function usePublisherOrgQueues({ selectedOrgId, currentUser }: UsePublisherOrgQueuesInput) {
  const [orgMembers, setOrgMembers] = useState<OrgMembersData>({ users: [], personas: [] });
  const [orgInvites, setOrgInvites] = useState<OrgQueueItem[]>([]);
  const [orgRequests, setOrgRequests] = useState<Array<Record<string, unknown>>>([]);
  const [myInvites, setMyInvites] = useState<OrgQueueItem[]>([]);
  const [inviteSearchQuery, setInviteSearchQuery] = useState("");
  const [inviteSearchResults, setInviteSearchResults] = useState<QueueUser[]>([]);
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
