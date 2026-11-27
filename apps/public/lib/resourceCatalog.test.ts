import { describe, expect, it } from "vitest";
import { gameResourceProfiles } from "./gameCatalog";
import { buildResourceIndex, gameResourceWorks, resourceWorks } from "./resourceCatalog";

describe("resource directory index", () => {
  it("counts catalog and local game credits once and loads local-only portfolios without an API identity", () => {
    const local = gameResourceProfiles.find(row => row.workParticipations?.length && row.roles?.some(role => role !== "scriptwriter"))!;
    const work = local.workParticipations![0];
    const directory = buildResourceIndex([{
      id: local.id, displayName: local.displayName, roles: local.roles, commissionCategories: [],
      workReferences: [{ id: work.id, url: work.url, creditRole: work.creditRole }],
    }]);
    const summary = directory.find(row => row.id === local.id)!;
    const details = resourceWorks({ ...local, workParticipations: [work] });
    expect(summary.workCounts[work.creditRole]).toBe(details.filter(item => item.creditRole === work.creditRole).length);
    expect(summary).not.toHaveProperty("works");
    expect(summary.localOnly).toBeUndefined();
    expect(buildResourceIndex([]).find(row => row.id === local.id)?.localOnly).toBe(true);
    expect(gameResourceWorks(local.id).length).toBeGreaterThan(0);
  });
});
