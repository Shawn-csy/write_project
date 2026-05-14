import { resolveProfileOrgIds } from "../hooks/dashboard/scriptMetadataUtils";
import type { OrgData, PersonaLike } from "../types/persona";
import type { UserProfileApi } from "./api/user";

export async function buildAffiliatedOrganizations({
  ownedOrgs = [],
  profile = null,
  personas = [],
  fetchOrganizationById,
}: {
  ownedOrgs?: OrgData[];
  profile?: UserProfileApi | null;
  personas?: PersonaLike[];
  fetchOrganizationById?: (id: string) => Promise<OrgData>;
} = {}) {
  const baseOrgs = Array.isArray(ownedOrgs) ? ownedOrgs.filter(Boolean) : [];
  const baseOrgIds = new Set(baseOrgs.map((org) => org?.id).filter(Boolean));
  const extraOrgIds = new Set<string>();

  resolveProfileOrgIds(profile).forEach((orgId) => {
    if (!baseOrgIds.has(orgId)) extraOrgIds.add(orgId);
  });

  (personas || []).forEach((persona) => {
    (persona?.organizationIds || []).forEach((orgId) => {
      if (!baseOrgIds.has(orgId)) extraOrgIds.add(orgId);
    });
  });

  let mergedOrgs = baseOrgs;
  if (extraOrgIds.size > 0 && typeof fetchOrganizationById === "function") {
    const fetched: OrgData[] = [];
    for (const orgId of extraOrgIds) {
      try {
        const org = await fetchOrganizationById(orgId);
        if (org) fetched.push(org);
      } catch {
        // ignore forbidden/not-found orgs
      }
    }
    mergedOrgs = [...baseOrgs, ...fetched];
  }

  const deduped: OrgData[] = [];
  const seen = new Set<string>();
  for (const org of mergedOrgs) {
    if (!org || !org.id || seen.has(org.id)) continue;
    seen.add(org.id);
    deduped.push(org);
  }

  return deduped;
}
