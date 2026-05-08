import { describe, it, expect, vi } from "vitest";
import { buildAffiliatedOrganizations } from "./orgAffiliation";

vi.mock("../hooks/dashboard/scriptMetadataUtils", () => ({
  resolveProfileOrgIds: vi.fn((profile) => {
    if (!profile) return [];
    const ids = Array.isArray(profile.organizationIds) ? profile.organizationIds : [];
    const single = profile.organizationId ? [profile.organizationId] : [];
    return [...new Set([...ids, ...single])].filter(Boolean);
  }),
}));

describe("buildAffiliatedOrganizations", () => {
  it("returns owned orgs when there are no extras", async () => {
    const result = await buildAffiliatedOrganizations({
      ownedOrgs: [{ id: "org1", name: "Org 1" }],
      profile: null,
      personas: [],
      fetchOrganizationById: vi.fn(),
    });
    expect(result).toEqual([{ id: "org1", name: "Org 1" }]);
  });

  it("fetches extra orgs referenced in profile", async () => {
    const fetchOrganizationById = vi.fn().mockResolvedValue({ id: "org2", name: "Org 2" });
    const result = await buildAffiliatedOrganizations({
      ownedOrgs: [],
      profile: { organizationIds: ["org2"] },
      personas: [],
      fetchOrganizationById,
    });
    expect(result).toEqual([{ id: "org2", name: "Org 2" }]);
    expect(fetchOrganizationById).toHaveBeenCalledWith("org2");
  });

  it("fetches extra orgs referenced in personas", async () => {
    const fetchOrganizationById = vi.fn().mockResolvedValue({ id: "org3", name: "Org 3" });
    const result = await buildAffiliatedOrganizations({
      ownedOrgs: [],
      profile: null,
      personas: [{ organizationIds: ["org3"] }],
      fetchOrganizationById,
    });
    expect(result).toEqual([{ id: "org3", name: "Org 3" }]);
  });

  it("does not fetch orgs already in ownedOrgs", async () => {
    const fetchOrganizationById = vi.fn();
    await buildAffiliatedOrganizations({
      ownedOrgs: [{ id: "org1", name: "Org 1" }],
      profile: { organizationIds: ["org1"] },
      personas: [],
      fetchOrganizationById,
    });
    expect(fetchOrganizationById).not.toHaveBeenCalled();
  });

  it("deduplicates the same extra org from profile and persona", async () => {
    const fetchOrganizationById = vi.fn().mockResolvedValue({ id: "org2", name: "Org 2" });
    const result = await buildAffiliatedOrganizations({
      ownedOrgs: [],
      profile: { organizationIds: ["org2"] },
      personas: [{ organizationIds: ["org2"] }],
      fetchOrganizationById,
    });
    expect(result.filter((o) => o.id === "org2")).toHaveLength(1);
    expect(fetchOrganizationById).toHaveBeenCalledTimes(1);
  });

  it("deduplicates orgs in the final merged list", async () => {
    const fetchOrganizationById = vi.fn().mockResolvedValue({ id: "org2", name: "Org 2" });
    const result = await buildAffiliatedOrganizations({
      ownedOrgs: [{ id: "org1" }, { id: "org1" }], // duplicate in ownedOrgs
      profile: { organizationIds: ["org2"] },
      personas: [],
      fetchOrganizationById,
    });
    expect(result.filter((o) => o.id === "org1")).toHaveLength(1);
  });

  it("ignores fetch errors for individual orgs silently", async () => {
    const fetchOrganizationById = vi.fn()
      .mockRejectedValueOnce(new Error("not found"))
      .mockResolvedValueOnce({ id: "org2", name: "Org 2" });
    const result = await buildAffiliatedOrganizations({
      ownedOrgs: [],
      profile: { organizationIds: ["bad-org", "org2"] },
      personas: [],
      fetchOrganizationById,
    });
    expect(result).toEqual([{ id: "org2", name: "Org 2" }]);
  });

  it("skips fetching when fetchOrganizationById is not provided", async () => {
    const result = await buildAffiliatedOrganizations({
      ownedOrgs: [{ id: "org1" }],
      profile: { organizationIds: ["org2"] },
      personas: [],
    });
    expect(result).toEqual([{ id: "org1" }]);
  });

  it("handles empty/null inputs gracefully", async () => {
    const result = await buildAffiliatedOrganizations({});
    expect(result).toEqual([]);
  });

  it("handles personas with no organizationIds", async () => {
    const fetchOrganizationById = vi.fn();
    const result = await buildAffiliatedOrganizations({
      ownedOrgs: [{ id: "org1" }],
      profile: null,
      personas: [{ name: "Persona without orgs" }],
      fetchOrganizationById,
    });
    expect(result).toEqual([{ id: "org1" }]);
    expect(fetchOrganizationById).not.toHaveBeenCalled();
  });
});
