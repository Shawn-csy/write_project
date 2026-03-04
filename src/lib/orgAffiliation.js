import { resolveProfileOrgIds } from "../hooks/dashboard/scriptMetadataUtils";

export async function buildAffiliatedOrganizations({
  ownedOrgs = [],
  profile = null,
  personas = [],
  fetchOrganizationById,
}) {
  const baseOrgs = Array.isArray(ownedOrgs) ? ownedOrgs.filter(Boolean) : [];
  const baseOrgIds = new Set(baseOrgs.map((org) => org?.id).filter(Boolean));
  const extraOrgIds = new Set();

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
    const fetched = [];
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

  const deduped = [];
  const seen = new Set();
  for (const org of mergedOrgs) {
    if (!org || !org.id || seen.has(org.id)) continue;
    seen.add(org.id);
    deduped.push(org);
  }

  return deduped;
}
